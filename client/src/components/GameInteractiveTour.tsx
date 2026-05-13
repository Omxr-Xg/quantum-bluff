import { useMemo, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, X, Heart, Diamond, Club, Spade } from "lucide-react";
import { PokerCard } from "./PokerCard";
import { ChipIcon } from "./ChipIcon";
import { TutorialSpotlight } from "./tutorial/TutorialSpotlight";

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
          <div className="flex justify-center gap-4">
            <Heart className="h-9 w-9 text-red-500 drop-shadow-sm" aria-hidden strokeWidth={1.75} />
            <Diamond className="h-9 w-9 text-red-500 drop-shadow-sm" aria-hidden strokeWidth={1.75} />
            <Club className="h-9 w-9 text-slate-200 drop-shadow-sm" aria-hidden strokeWidth={1.75} />
            <Spade className="h-9 w-9 text-slate-200 drop-shadow-sm" aria-hidden strokeWidth={1.75} />
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

  const total = STEP_DEFS.length;
  const stepIdx = Math.min(Math.max(0, step), total - 1);
  const stepDef = STEP_DEFS[stepIdx]!;

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

  const targetRef = useMemo<RefObject<HTMLElement | null> | null>(() => {
    if (!stepDef.highlight) return null;
    return refs[stepDef.highlight] ?? null;
  }, [stepDef.highlight, refs]);

  const next = () => {
    if (step < total - 1) onStepChange(step + 1);
    else onClose();
  };

  const prev = () => {
    if (step > 0) onStepChange(step - 1);
  };

  const bodyKey = resolveBodyKey();

  return (
    <TutorialSpotlight
      open={open}
      onClose={onClose}
      targetRef={targetRef}
      measureKey={stepIdx}
      color="cyan"
      tooltipHeight={420}
      ariaLabelledBy="game-tour-title"
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
    </TutorialSpotlight>
  );
}
