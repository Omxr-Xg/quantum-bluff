import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { PokerCard } from "./PokerCard";
import { ChipIcon } from "./ChipIcon";

export type GameTourRefs = {
  header: RefObject<HTMLElement | null>;
  table: RefObject<HTMLElement | null>;
  pot: RefObject<HTMLElement | null>;
  board: RefObject<HTMLElement | null>;
  actions: RefObject<HTMLElement | null>;
};

/** Illustrations cartes dans la bulle du tutoriel (remplace l’ancienne page démo) */
type TourCardVisual =
  | "welcome"
  | "headerSuits"
  | "tableBacks"
  | "potChips"
  | "board"
  | "heroActions";

type StepDef =
  | { highlight: null; titleKey: string; bodyKey: string; cards: TourCardVisual }
  | {
      highlight: keyof GameTourRefs;
      titleKey: string;
      bodyKey: string;
      cards: TourCardVisual;
      /** Si spectateur, utiliser ce corps à la place pour cette étape */
      spectatorBodyKey?: string;
    };

const STEP_DEFS: StepDef[] = [
  {
    highlight: null,
    titleKey: "tourWelcomeTitle",
    bodyKey: "tourWelcomeBody",
    cards: "welcome",
  },
  {
    highlight: "header",
    titleKey: "headerTitle",
    bodyKey: "headerBody",
    cards: "headerSuits",
  },
  { highlight: "table", titleKey: "tableTitle", bodyKey: "tableBody", cards: "tableBacks" },
  { highlight: "pot", titleKey: "potTitle", bodyKey: "potBody", cards: "potChips" },
  { highlight: "board", titleKey: "boardTitle", bodyKey: "boardBody", cards: "board" },
  {
    highlight: "actions",
    titleKey: "actionsTitle",
    bodyKey: "actionsBody",
    spectatorBodyKey: "actionsSpectatorBody",
    cards: "heroActions",
  },
  {
    highlight: null,
    titleKey: "tourDoneTitle",
    bodyKey: "tourDoneBody",
    cards: "welcome",
  },
];

function GameTourCardStrip({
  variant,
}: {
  variant: TourCardVisual;
}) {
  const { t } = useTranslation();

  const wrap = "mb-4 flex flex-col items-center justify-center";

  switch (variant) {
    case "welcome":
      return (
        <div className={wrap}>
          <div className="flex flex-wrap items-end justify-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-cyan-500/90">
                {t("game.help.tourVisualHole")}
              </span>
              <div className="flex gap-1.5">
                <PokerCard suit="hearts" value="10" size="sm" />
                <PokerCard suit="hearts" value="9" size="sm" />
              </div>
            </div>
            <div className="hidden h-14 w-px bg-slate-600/60 sm:block" aria-hidden />
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-cyan-500/90">
                {t("game.help.tourVisualBoard")}
              </span>
              <div className="flex gap-1">
                <PokerCard suit="spades" value="A" size="xs" />
                <PokerCard suit="hearts" value="K" size="xs" />
                <PokerCard suit="clubs" value="Q" size="xs" />
              </div>
            </div>
          </div>
        </div>
      );
    case "headerSuits":
      return (
        <div className={`${wrap} gap-2`}>
          <div className="flex justify-center gap-4 text-3xl leading-none">
            <span className="text-red-500 drop-shadow-sm">♥</span>
            <span className="text-red-500 drop-shadow-sm">♦</span>
            <span className="text-slate-200 drop-shadow-sm">♣</span>
            <span className="text-slate-200 drop-shadow-sm">♠</span>
          </div>
        </div>
      );
    case "tableBacks":
      return (
        <div className={wrap}>
          <div className="flex justify-center gap-1.5">
            <PokerCard suit="spades" value="—" size="sm" faceDown />
            <PokerCard suit="spades" value="—" size="sm" faceDown />
            <PokerCard suit="spades" value="—" size="sm" faceDown />
            <PokerCard suit="spades" value="—" size="sm" faceDown />
          </div>
        </div>
      );
    case "potChips":
      return (
        <div className={wrap}>
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-amber-500/35 bg-slate-800/90 px-4 py-2.5 shadow-inner">
            <ChipIcon size="md" className="brightness-110" />
            <span className="text-lg font-bold text-amber-100">500</span>
          </div>
          <div className="flex justify-center gap-1">
            <PokerCard suit="spades" value="—" size="xs" faceDown />
            <PokerCard suit="spades" value="—" size="xs" faceDown />
          </div>
        </div>
      );
    case "board":
      return (
        <div className={wrap}>
          <div className="flex flex-wrap justify-center gap-1">
            <PokerCard suit="spades" value="A" size="sm" />
            <PokerCard suit="hearts" value="K" size="sm" />
            <PokerCard suit="clubs" value="Q" size="sm" />
            <PokerCard suit="diamonds" value="J" size="sm" />
            <PokerCard suit="spades" value="—" size="sm" faceDown />
          </div>
        </div>
      );
    case "heroActions":
      return (
        <div className={wrap}>
          <div className="mb-2 flex gap-1.5">
            <PokerCard suit="hearts" value="10" size="sm" />
            <PokerCard suit="hearts" value="9" size="sm" />
          </div>
          <div className="flex flex-wrap justify-center gap-2 text-[11px] font-bold">
            <span className="rounded-lg border-2 border-red-500/70 px-2.5 py-1.5 text-red-200 shadow-sm">
              {t("game.fold")}
            </span>
            <span className="rounded-lg border-2 border-sky-500/70 px-2.5 py-1.5 text-sky-200 shadow-sm">
              {t("game.callLabel")}
            </span>
            <span className="rounded-lg border-2 border-emerald-500/70 px-2.5 py-1.5 text-emerald-200 shadow-sm">
              {t("game.raise")}
            </span>
          </div>
        </div>
      );
    default:
      return null;
  }
}

const PAD = 10;

function SpotlightRects({
  rect,
  onBackdropClick,
}: {
  rect: DOMRect;
  onBackdropClick: () => void;
}) {
  const l = Math.max(0, rect.left - PAD);
  const t = Math.max(0, rect.top - PAD);
  const w = rect.width + PAD * 2;
  const h = rect.height + PAD * 2;
  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;

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
        className="fixed z-[241] pointer-events-none rounded-xl border-2 border-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.45)] animate-pulse"
        style={{ left: l, top: t, width: w, height: h }}
      />
    </>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  step: number;
  onStepChange: (n: number) => void;
  refs: GameTourRefs;
  isSpectating: boolean;
};

export function GameInteractiveTour({
  open,
  onClose,
  step,
  onStepChange,
  refs,
  isSpectating,
}: Props) {
  const { t } = useTranslation();
  const [rect, setRect] = useState<DOMRect | null>(null);

  const total = STEP_DEFS.length;
  const stepDef = STEP_DEFS[Math.min(Math.max(0, step), total - 1)]!;

  const resolveBodyKey = (): string => {
    if (
      "spectatorBodyKey" in stepDef &&
      stepDef.spectatorBodyKey &&
      isSpectating &&
      stepDef.highlight === "actions"
    ) {
      return stepDef.spectatorBodyKey;
    }
    return stepDef.bodyKey;
  };

  const measure = useCallback(() => {
    if (!open) {
      setRect(null);
      return;
    }
    const current = STEP_DEFS[Math.min(Math.max(0, step), total - 1)]!;
    if (!current.highlight) {
      setRect(null);
      return;
    }
    const el = refs[current.highlight]?.current;
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ block: "nearest", behavior: "auto" });
    const key = current.highlight;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const node = key ? refs[key]?.current : null;
        if (node) setRect(node.getBoundingClientRect());
      });
    });
  }, [open, step, total, refs]);

  useLayoutEffect(() => {
    measure();
  }, [measure, step, open]);

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

  const next = () => {
    if (step < total - 1) onStepChange(step + 1);
    else onClose();
  };

  const prev = () => {
    if (step > 0) onStepChange(step - 1);
  };

  const tooltipPos = (): { left: number; top: number } => {
    const margin = 16;
    const tw = Math.min(360, typeof window !== "undefined" ? window.innerWidth - margin * 2 : 360);
    /** Hauteur estimée du panneau (texte + cartes + boutons) pour éviter le chevauchement */
    const th = 420;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const vw = typeof window !== "undefined" ? window.innerWidth : 400;

    if (!rect) {
      return {
        left: (vw - tw) / 2,
        top: (vh - th) / 2,
      };
    }

    const l = rect.left - PAD;
    const t = rect.top - PAD;
    const w = rect.width + PAD * 2;
    const h = rect.height + PAD * 2;

    let top = t + h + 16;
    if (top + th > vh - margin) top = t - th - 16;
    if (top < margin) top = margin;

    let left = l + w / 2 - tw / 2;
    left = Math.max(margin, Math.min(left, vw - tw - margin));

    return { left, top };
  };

  const pos = tooltipPos();
  const bodyKey = resolveBodyKey();

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <>
      {!rect && (
        <button
          type="button"
          className="fixed inset-0 z-[240] bg-black/65 backdrop-blur-[2px] pointer-events-auto"
          aria-label={t("game.help.close")}
          onClick={onClose}
        />
      )}
      {rect && <SpotlightRects rect={rect} onBackdropClick={onClose} />}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-tour-title"
        className="fixed z-[242] max-h-[min(520px,85vh)] w-[min(calc(100vw-32px),380px)] overflow-y-auto rounded-2xl border border-cyan-500/50 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-md"
        style={{ left: pos.left, top: pos.top }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <span className="rounded-full bg-cyan-600/35 px-2.5 py-0.5 text-xs font-semibold text-cyan-200">
            {t("game.help.stepOf", { current: step + 1, total })}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label={t("game.help.close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <h2 id="game-tour-title" className="mb-2 text-lg font-bold text-white">
          {t(`game.help.${stepDef.titleKey}`)}
        </h2>
        <GameTourCardStrip variant={stepDef.cards} />
        <p className="mb-5 text-sm leading-relaxed text-slate-300 whitespace-pre-line">
          {t(`game.help.${bodyKey}`)}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800"
          >
            {t("game.help.skip")}
          </button>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              disabled={step <= 0}
              onClick={prev}
              className="flex items-center gap-1 rounded-xl border border-slate-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              {t("game.help.previous")}
            </button>
            <button
              type="button"
              onClick={next}
              className="flex items-center gap-1 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-500"
            >
              {step >= total - 1 ? t("game.help.finish") : t("game.help.next")}
              {step < total - 1 && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
