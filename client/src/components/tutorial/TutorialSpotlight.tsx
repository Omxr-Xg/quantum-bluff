import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

/**
 * Spotlight overlay reutilisable pour les tutoriels (lobby, jeu, table scriptee).
 * Centralise le calcul de rect, le decoupage visuel et le tooltip flottant.
 */

const DEFAULT_PAD = 10;

type SpotlightColor = "cyan" | "purple" | "amber";

const RING_CLASSES: Record<SpotlightColor, string> = {
  cyan: "border-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.45)]",
  purple: "border-purple-400 shadow-[0_0_24px_rgba(168,85,247,0.55)]",
  amber: "border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.55)]",
};

function SpotlightRects({
  rect,
  onBackdropClick,
  color,
  padding,
}: {
  rect: DOMRect;
  onBackdropClick: () => void;
  color: SpotlightColor;
  padding: number;
}) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;
  const l = Math.max(0, rect.left - padding);
  const t = Math.max(0, rect.top - padding);
  const r = Math.min(vw, rect.right + padding);
  const b = Math.min(vh, rect.bottom + padding);
  const w = Math.max(0, r - l);
  const h = Math.max(0, b - t);

  const common =
    "fixed z-[240] bg-black/65 backdrop-blur-[2px] pointer-events-auto transition-opacity";

  return (
    <>
      <button
        type="button"
        aria-label="overlay"
        className={common}
        style={{ left: 0, top: 0, width: "100%", height: t }}
        onClick={onBackdropClick}
      />
      <button
        type="button"
        aria-label="overlay"
        className={common}
        style={{ left: 0, top: t + h, width: "100%", height: Math.max(0, vh - t - h) }}
        onClick={onBackdropClick}
      />
      <button
        type="button"
        aria-label="overlay"
        className={common}
        style={{ left: 0, top: t, width: l, height: h }}
        onClick={onBackdropClick}
      />
      <button
        type="button"
        aria-label="overlay"
        className={common}
        style={{ left: l + w, top: t, width: Math.max(0, vw - l - w), height: h }}
        onClick={onBackdropClick}
      />
      <div
        className={`fixed z-[241] pointer-events-none rounded-xl border-2 animate-pulse ${RING_CLASSES[color]}`}
        style={{ left: l, top: t, width: w, height: h }}
      />
    </>
  );
}

function EmphasisBackdrop({
  rect,
  onBackdropClick,
  padding,
}: {
  rect: DOMRect;
  onBackdropClick: () => void;
  padding: number;
}) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;
  const l = Math.max(0, rect.left - padding);
  const t = Math.max(0, rect.top - padding);
  const r = Math.min(vw, rect.right + padding);
  const b = Math.min(vh, rect.bottom + padding);
  const w = Math.max(0, r - l);
  const h = Math.max(0, b - t);
  const common = "fixed z-[240] bg-black/58 backdrop-blur-[1px] pointer-events-auto";

  return (
    <>
      <button
        type="button"
        aria-label="overlay"
        className={common}
        style={{ left: 0, top: 0, width: "100%", height: t }}
        onClick={onBackdropClick}
      />
      <button
        type="button"
        aria-label="overlay"
        className={common}
        style={{ left: 0, top: t + h, width: "100%", height: Math.max(0, vh - t - h) }}
        onClick={onBackdropClick}
      />
      <button
        type="button"
        aria-label="overlay"
        className={common}
        style={{ left: 0, top: t, width: l, height: h }}
        onClick={onBackdropClick}
      />
      <button
        type="button"
        aria-label="overlay"
        className={common}
        style={{ left: l + w, top: t, width: Math.max(0, vw - l - w), height: h }}
        onClick={onBackdropClick}
      />
    </>
  );
}

/** Calcule la position du tooltip a partir du rect mis en surbrillance. */
function computeTooltipPos(
  rect: DOMRect | null,
  tooltipWidth: number,
  tooltipHeight: number,
  padding: number,
): { left: number; top: number } {
  const margin = 16;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const tw = Math.min(tooltipWidth, vw - margin * 2);
  const th = Math.min(tooltipHeight, vh - margin * 2);

  if (!rect) {
    return { left: (vw - tw) / 2, top: (vh - th) / 2 };
  }

  const l = Math.max(0, rect.left - padding);
  const t = Math.max(0, rect.top - padding);
  const r = Math.min(vw, rect.right + padding);
  const b = Math.min(vh, rect.bottom + padding);
  const cx = (l + r) / 2;
  const cy = (t + b) / 2;

  const clampLeft = (left: number) => Math.max(margin, Math.min(left, vw - tw - margin));
  const clampTop = (top: number) => Math.max(margin, Math.min(top, vh - th - margin));
  const overlapArea = (left: number, top: number) => {
    const x = Math.max(0, Math.min(left + tw, r) - Math.max(left, l));
    const y = Math.max(0, Math.min(top + th, b) - Math.max(top, t));
    return x * y;
  };

  const candidates = [
    { left: cx - tw / 2, top: b + 18, free: vh - b, side: "bottom" },
    { left: cx - tw / 2, top: t - th - 18, free: t, side: "top" },
    { left: r + 18, top: cy - th / 2, free: vw - r, side: "right" },
    { left: l - tw - 18, top: cy - th / 2, free: l, side: "left" },
    { left: margin, top: margin, free: l + t, side: "top-left" },
    { left: vw - tw - margin, top: margin, free: vw - r + t, side: "top-right" },
    { left: margin, top: vh - th - margin, free: l + vh - b, side: "bottom-left" },
    { left: vw - tw - margin, top: vh - th - margin, free: vw - r + vh - b, side: "bottom-right" },
  ].map((c) => {
    const left = clampLeft(c.left);
    const top = clampTop(c.top);
    const overlap = overlapArea(left, top);
    return {
      left,
      top,
      score: overlap * 100 - c.free - (c.side.includes("bottom") ? 8 : 0),
    };
  });

  candidates.sort((a, b) => a.score - b.score);
  return { left: candidates[0]!.left, top: candidates[0]!.top };
}

export type TutorialSpotlightProps = {
  /** Element a mettre en surbrillance. `null` = backdrop plein ecran centre. */
  targetRef: RefObject<HTMLElement | null> | null;
  /** Cle de re-mesure (ex. step index) : provoque un recalcul du rect. */
  measureKey: string | number;
  open: boolean;
  onClose: () => void;
  color?: SpotlightColor;
  tooltipWidth?: number;
  tooltipHeight?: number;
  spotlightPadding?: number;
  scrollBlock?: ScrollLogicalPosition;
  presentation?: "cutout" | "emphasis";
  /** Contenu de la bulle (titre / corps / boutons fournis par l'appelant). */
  children: ReactNode;
  /** Aria label du tooltip dialog. */
  ariaLabelledBy?: string;
};

/**
 * Spotlight portail : fond noir autour de la cible + tooltip flottant.
 * Tout le contenu pedagogique est fourni via `children` pour rester compose.
 */
export function TutorialSpotlight({
  targetRef,
  measureKey,
  open,
  onClose,
  color = "cyan",
  tooltipWidth = 380,
  tooltipHeight = 420,
  spotlightPadding = DEFAULT_PAD,
  scrollBlock = "nearest",
  presentation = "cutout",
  children,
  ariaLabelledBy,
}: TutorialSpotlightProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  const measure = useCallback(() => {
    if (!open) {
      setRect(null);
      return;
    }
    const el = targetRef?.current;
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ block: scrollBlock, inline: "nearest", behavior: "auto" });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const node = targetRef?.current;
        if (node) setRect(node.getBoundingClientRect());
      });
    });
  }, [open, scrollBlock, targetRef]);

  useLayoutEffect(() => {
    measure();
  }, [measure, measureKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useLayoutEffect(() => {
    if (!open) return;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    const onScroll = () => measure();
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, measure]);

  if (!open || typeof document === "undefined") return null;

  const pos = computeTooltipPos(rect, tooltipWidth, tooltipHeight, spotlightPadding);

  return createPortal(
    <>
      {!rect && (
        <button
          type="button"
          className="fixed inset-0 z-[240] bg-black/65 backdrop-blur-[2px] pointer-events-auto"
          aria-label="overlay"
          onClick={onClose}
        />
      )}
      {rect && presentation === "emphasis" && (
        <EmphasisBackdrop
          rect={rect}
          onBackdropClick={onClose}
          padding={spotlightPadding}
        />
      )}
      {rect && presentation === "cutout" && (
        <SpotlightRects
          rect={rect}
          onBackdropClick={onClose}
          color={color}
          padding={spotlightPadding}
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        className="fixed z-[242] max-h-[min(520px,85vh)] w-[min(calc(100vw-32px),380px)] overflow-y-auto rounded-2xl border border-cyan-500/50 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-md"
        style={{ left: pos.left, top: pos.top }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}
