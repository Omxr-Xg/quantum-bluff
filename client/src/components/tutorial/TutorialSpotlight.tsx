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
 * Centralise le calcul de rect, le decoupage en 4 zones autour de l'element vise
 * et le tooltip flottant — code prealablement duplique dans LobbyInteractiveTour,
 * GameInteractiveTour et TutorialGame.
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

  if (!rect) {
    return { left: (vw - tw) / 2, top: (vh - tooltipHeight) / 2 };
  }

  const l = Math.max(0, rect.left - padding);
  const t = Math.max(0, rect.top - padding);
  const r = Math.min(vw, rect.right + padding);
  const b = Math.min(vh, rect.bottom + padding);
  const w = Math.max(0, r - l);
  const h = Math.max(0, b - t);

  let top = t + h + 16;
  if (top + tooltipHeight > vh - margin) top = t - tooltipHeight - 16;
  if (top < margin) top = margin;

  let left = l + w / 2 - tw / 2;
  left = Math.max(margin, Math.min(left, vw - tw - margin));

  return { left, top };
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
  /** Contenu de la bulle (titre / corps / boutons fournis par l'appelant). */
  children: ReactNode;
  /** Aria label du tooltip dialog. */
  ariaLabelledBy?: string;
};

/**
 * Spotlight portail : fond noir 4-zones autour de la cible + tooltip flottant.
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
      {rect && (
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
