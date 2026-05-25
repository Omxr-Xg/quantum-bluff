import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Layers } from "lucide-react";
import { PokerCard } from "./PokerCard";
import { NeonButton } from "./NeonButton";
import { useIsMobile } from "./ui/use-mobile";

const SHOW_DELAY_MS = 400;
const HIDE_DELAY_MS = 280;

export type CombinationHandKey =
  | "royalFlush"
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
  "royalFlush",
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
  royalFlush: [
    { suit: "hearts", value: "10" },
    { suit: "hearts", value: "J" },
    { suit: "hearts", value: "Q" },
    { suit: "hearts", value: "K" },
    { suit: "hearts", value: "A" },
  ],
  /** Quinte flush non royale (la royale est listée au-dessus). */
  straightFlush: [
    { suit: "clubs", value: "5" },
    { suit: "clubs", value: "6" },
    { suit: "clubs", value: "7" },
    { suit: "clubs", value: "8" },
    { suit: "clubs", value: "9" },
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
  openOverride?: boolean;
}

export function HandCombinationsHelpButton({
  colorblindMode = false,
  onOpenChange,
  openOverride,
}: HandCombinationsHelpButtonProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const effectiveOpen = openOverride ?? open;
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

  const setOpenTracked = useCallback((next: boolean) => {
    setOpen(next);
  }, []);

  /** Ne pas appeler onOpenChange dans un updater setOpen (effet de bord interdit ; Strict Mode double-invocation). */
  useEffect(() => {
    onOpenChange?.(effectiveOpen);
  }, [effectiveOpen, onOpenChange]);

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
    setOpen((o) => !o);
  }, [clearShowTimer, clearHideTimer]);

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {effectiveOpen && (
        <div
          id={panelId}
          role="region"
          aria-label={t("game.combinationsHelp.title")}
          className="fixed bottom-[130px] left-[0.5rem] right-[0.5rem] z-[130] w-auto max-h-[min(70vh,480px)] overflow-hidden rounded-xl border-2 border-cyan-500/85 bg-slate-950/90 shadow-[0_0_26px_rgba(6,182,212,0.45),0_22px_70px_rgba(0,0,0,0.72)] md:absolute md:bottom-full md:right-0 md:left-auto md:mb-2 md:w-[min(calc(100vw-1rem),22rem)]"
          style={{
            backdropFilter: "blur(22px) saturate(0.85)",
            WebkitBackdropFilter: "blur(22px) saturate(0.85)",
          }}
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
          <div className="pointer-events-none absolute inset-0 bg-slate-950/88 backdrop-blur-2xl" aria-hidden />
          <div className="relative z-10 max-h-[min(70vh,480px)] overflow-y-auto p-3">
            <h3 className="text-sm font-bold text-cyan-50 drop-shadow">{t("game.combinationsHelp.title")}</h3>
            <p className="mt-1 text-[11px] leading-snug text-slate-200">{t("game.combinationsHelp.subtitle")}</p>
            <ul className="mt-3 space-y-2.5">
              {RANK_DISPLAY_ORDER.map((key) => (
                <li key={key} className="rounded-lg border border-slate-600/90 bg-black/52 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_24px_rgba(0,0,0,0.25)]">
                  <div className="text-xs font-semibold text-white">
                    {t(`quantumHUD.hand.${key}`)}
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-slate-200">
                    {t(`game.combinationsHelp.desc.${key}`)}
                  </p>
                  <div
                    className={
                      EXAMPLES[key].length > 5
                        ? "mt-2 flex flex-wrap justify-center gap-1 rounded-lg bg-slate-950/75 px-1 py-1"
                        : "mt-2 flex justify-center rounded-lg bg-slate-950/75 px-1 py-1 pl-2 -space-x-2 sm:-space-x-1.5"
                    }
                  >
                    {EXAMPLES[key].map((c, i) => (
                      <PokerCard
                        key={`${key}-${i}`}
                        suit={c.suit}
                        value={c.value}
                        size="xs"
                        colorblindMode={colorblindMode}
                        className={`shrink-0 ${key === "quantumCombi" ? "origin-center scale-[0.35]" : ""}`}
                      />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <NeonButton
        variant="blue"
        icon={<Layers className="h-4 w-4 shrink-0" />}
        onClick={handleClick}
        ariaExpanded={open}
        ariaControls={effectiveOpen ? panelId : undefined}
        title={t("game.combinationsHelp.buttonTitle")}
        className="min-w-0 px-4 py-3 text-xs md:px-5 md:py-3.5"
      >
        <span className="hidden sm:inline">{t("game.combinationsHelp.buttonShort")}</span>
      </NeonButton>
    </div>
  );
}
