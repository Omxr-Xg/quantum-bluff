import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Layers } from "lucide-react";
import { PokerCard } from "./PokerCard";
import { NeonButton } from "./NeonButton";
import { useIsMobile } from "./ui/use-mobile";

const SHOW_DELAY_MS = 400;
const HIDE_DELAY_MS = 280;

export type CombinationHandKey =
  | "straightFlush"
  | "fourKind"
  | "fullHouse"
  | "quantumCombi"
  | "flush"
  | "straight"
  | "threeKind"
  | "twoPair"
  | "pair"
  | "highCard";

/** Ordre affiché : du plus fort au plus faible */
const RANK_DISPLAY_ORDER: CombinationHandKey[] = [
  "straightFlush",
  "fourKind",
  "fullHouse",
  "quantumCombi",
  "flush",
  "straight",
  "threeKind",
  "twoPair",
  "pair",
  "highCard",
];

const EXAMPLES: Record<CombinationHandKey, { suit: string; value: string }[]> = {
  straightFlush: [
    { suit: "hearts", value: "10" },
    { suit: "hearts", value: "J" },
    { suit: "hearts", value: "Q" },
    { suit: "hearts", value: "K" },
    { suit: "hearts", value: "A" },
  ],
  fourKind: [
    { suit: "spades", value: "8" },
    { suit: "hearts", value: "8" },
    { suit: "diamonds", value: "8" },
    { suit: "clubs", value: "8" },
    { suit: "spades", value: "3" },
  ],
  fullHouse: [
    { suit: "spades", value: "K" },
    { suit: "hearts", value: "K" },
    { suit: "diamonds", value: "K" },
    { suit: "clubs", value: "9" },
    { suit: "hearts", value: "9" },
  ],
  /** 7 cartes : 3,5,6,7,10 + kickers A et K */
  quantumCombi: [
    { suit: "spades", value: "A" },
    { suit: "clubs", value: "K" },
    { suit: "hearts", value: "10" },
    { suit: "diamonds", value: "7" },
    { suit: "clubs", value: "6" },
    { suit: "hearts", value: "5" },
    { suit: "diamonds", value: "3" },
  ],
  flush: [
    { suit: "hearts", value: "2" },
    { suit: "hearts", value: "7" },
    { suit: "hearts", value: "9" },
    { suit: "hearts", value: "J" },
    { suit: "hearts", value: "A" },
  ],
  straight: [
    { suit: "clubs", value: "5" },
    { suit: "diamonds", value: "6" },
    { suit: "hearts", value: "7" },
    { suit: "spades", value: "8" },
    { suit: "clubs", value: "9" },
  ],
  threeKind: [
    { suit: "diamonds", value: "Q" },
    { suit: "clubs", value: "Q" },
    { suit: "hearts", value: "Q" },
    { suit: "spades", value: "4" },
    { suit: "diamonds", value: "9" },
  ],
  twoPair: [
    { suit: "clubs", value: "J" },
    { suit: "spades", value: "J" },
    { suit: "diamonds", value: "5" },
    { suit: "hearts", value: "5" },
    { suit: "clubs", value: "2" },
  ],
  pair: [
    { suit: "spades", value: "A" },
    { suit: "hearts", value: "A" },
    { suit: "diamonds", value: "7" },
    { suit: "clubs", value: "3" },
    { suit: "spades", value: "2" },
  ],
  highCard: [
    { suit: "spades", value: "A" },
    { suit: "diamonds", value: "K" },
    { suit: "hearts", value: "9" },
    { suit: "clubs", value: "6" },
    { suit: "diamonds", value: "3" },
  ],
};

interface HandCombinationsHelpButtonProps {
  colorblindMode?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function HandCombinationsHelpButton({
  colorblindMode = false,
  onOpenChange,
}: HandCombinationsHelpButtonProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelId = "hand-combinations-help-panel";

  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const setOpenTracked = useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange]
  );

  useEffect(() => {
    return () => {
      clearShowTimer();
      clearHideTimer();
    };
  }, [clearShowTimer, clearHideTimer]);

  const handleMouseEnter = useCallback(() => {
    if (isMobile) return;
    clearHideTimer();
    clearShowTimer();
    showTimerRef.current = setTimeout(() => {
      setOpenTracked(true);
      showTimerRef.current = null;
    }, SHOW_DELAY_MS);
  }, [isMobile, clearHideTimer, clearShowTimer, setOpenTracked]);

  const handleMouseLeave = useCallback(() => {
    if (isMobile) return;
    clearShowTimer();
    hideTimerRef.current = setTimeout(() => {
      setOpenTracked(false);
      hideTimerRef.current = null;
    }, HIDE_DELAY_MS);
  }, [isMobile, clearShowTimer, setOpenTracked]);

  const handleClick = useCallback(() => {
    clearShowTimer();
    clearHideTimer();
    setOpen((o) => {
      const next = !o;
      onOpenChange?.(next);
      return next;
    });
  }, [clearShowTimer, clearHideTimer, onOpenChange]);

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {open && (
        <div
          id={panelId}
          role="region"
          aria-label={t("game.combinationsHelp.title")}
          className="absolute bottom-full right-0 z-[130] mb-2 w-[min(calc(100vw-1rem),22rem)] max-h-[min(70vh,480px)] overflow-y-auto rounded-xl border-2 border-cyan-500/80 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-3 shadow-[0_0_20px_rgba(6,182,212,0.35)]"
          onMouseEnter={() => {
            if (isMobile) return;
            clearHideTimer();
            clearShowTimer();
          }}
          onMouseLeave={() => {
            if (isMobile) return;
            hideTimerRef.current = setTimeout(() => {
              setOpenTracked(false);
              hideTimerRef.current = null;
            }, HIDE_DELAY_MS);
          }}
        >
          <h3 className="text-sm font-bold text-cyan-100">{t("game.combinationsHelp.title")}</h3>
          <p className="mt-1 text-[11px] leading-snug text-slate-400">{t("game.combinationsHelp.subtitle")}</p>
          <ul className="mt-3 space-y-4">
            {RANK_DISPLAY_ORDER.map((key) => (
              <li key={key} className="border-b border-slate-700/80 pb-3 last:border-0 last:pb-0">
                <div className="text-xs font-semibold text-white">
                  {t(`quantumHUD.hand.${key}`)}
                </div>
                <p className="mt-1 text-[11px] leading-snug text-slate-400">
                  {t(`game.combinationsHelp.desc.${key}`)}
                </p>
                <div
                  className={
                    EXAMPLES[key].length > 5
                      ? "mt-2 flex flex-wrap justify-center gap-1 px-0.5"
                      : "mt-2 flex justify-center pl-1 -space-x-2 sm:-space-x-1.5"
                  }
                >
                  {EXAMPLES[key].map((c, i) => (
                    <PokerCard
                      key={`${key}-${i}`}
                      suit={c.suit}
                      value={c.value}
                      size="xs"
                      colorblindMode={colorblindMode}
                      className="shrink-0"
                    />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <NeonButton
        variant="blue"
        icon={<Layers className="h-4 w-4 shrink-0" />}
        onClick={handleClick}
        ariaExpanded={open}
        ariaControls={open ? panelId : undefined}
        title={t("game.combinationsHelp.buttonTitle")}
        className="min-w-0 px-2 py-2 text-[10px] sm:text-xs md:px-3"
      >
        <span className="hidden sm:inline">{t("game.combinationsHelp.buttonShort")}</span>
      </NeonButton>
    </div>
  );
}
