import { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { X, TrendingUp, Loader2, Activity, Eye } from "lucide-react";
import { useDeviceType } from "./ui/use-mobile";
import { useAccessibility } from "../contexts/AccessibilityContext";
import { NeonButton } from "./NeonButton";
import { PokerCard } from "./PokerCard";
import { HandCombinationsHelpButton } from "./HandCombinationsHelpButton";
import { useAudio } from "../contexts/MusicContext";

interface Card {
  suit: string;
  value: string;
}

interface PlayerDashboardProps {
  name: string;
  chips: number;
  cards: Card[];
  onFold: () => void;
  onCall: (amount: number) => void;
  onRaise: (amount: number) => void;
  onCheck?: () => void;
  callAmount: number;
  minRaise: number;
  maxRaise: number;
  isMyTurn: boolean;
  isLoading?: boolean;
  hasFolded: boolean;
  hasActed?: boolean;
  /** En multijoueur, désactiver les boutons tant que la connexion socket n'est pas prête */
  actionsDisabled?: boolean;
  waitingForPlayer?: string;
  onToggleQuantum?: () => void;
  onQuantumHoverEnter?: () => void;
  onQuantumHoverLeave?: () => void;
  onToggleHiddenBets?: () => void;
  onToggleChat?: () => void;
  isHiddenBetsOpen?: boolean;
  isChatOpen?: boolean;
  timeLeft?: number;
  colorblindMode?: boolean;
}

export const PlayerDashboard = forwardRef<HTMLDivElement, PlayerDashboardProps>(function PlayerDashboard(
  {
  name: _name,
  chips,
  cards,
  onFold,
  onCall,
  onRaise,
  onCheck,
  callAmount,
  minRaise,
  maxRaise,
  isMyTurn,
  isLoading = false,
  hasFolded,
  hasActed,
  actionsDisabled = false,
  waitingForPlayer,
  onToggleQuantum,
  onQuantumHoverEnter,
  onQuantumHoverLeave,
  onToggleHiddenBets,
  isHiddenBetsOpen: _isHiddenBetsOpen,
  timeLeft,
  colorblindMode = false,
  },
  ref
) {
  const { t } = useTranslation();
  const { visualAlerts } = useAccessibility();
  const { playSfx } = useAudio();
  const effectiveMinRaise = Math.min(minRaise, maxRaise);
  const clampRaise = (v: number) => {
    const vi = Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
    return Math.max(effectiveMinRaise, Math.min(maxRaise, vi));
  };
  const [raiseAmount, setRaiseAmount] = useState(() => clampRaise(Math.min(minRaise, maxRaise)));
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [raisePopoverOpen, setRaisePopoverOpen] = useState(false);
  const [combinationsHelpOpen, setCombinationsHelpOpen] = useState(false);
  const isAllIn = maxRaise > 0 && raiseAmount >= maxRaise;
  const canRaise = isMyTurn && !actionsDisabled && !isLoading && !hasFolded && !hasActed && maxRaise > 0;

  useEffect(() => {
    setRaiseAmount((prev) => clampRaise(prev));
  }, [minRaise, maxRaise]);

  useEffect(() => {
    if (!canRaise) setRaisePopoverOpen(false);
  }, [canRaise]);

  const raiseLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTickSoundRef = useRef<number>(-1);

  const handleRaiseMouseEnter = useCallback(() => {
    if (!canRaise) return;
    if (raiseLeaveTimerRef.current) {
      clearTimeout(raiseLeaveTimerRef.current);
      raiseLeaveTimerRef.current = null;
    }
    setRaisePopoverOpen(true);
  }, [canRaise]);

  const handleRaiseMouseLeave = useCallback(() => {
    raiseLeaveTimerRef.current = setTimeout(() => {
      setRaisePopoverOpen(false);
      raiseLeaveTimerRef.current = null;
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (raiseLeaveTimerRef.current) clearTimeout(raiseLeaveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (timeLeft === undefined || !isMyTurn) {
      lastTickSoundRef.current = -1;
      return;
    }
    if (timeLeft > 5) {
      lastTickSoundRef.current = -1;
      return;
    }
    if (timeLeft >= 0 && timeLeft <= 5 && lastTickSoundRef.current !== timeLeft) {
      lastTickSoundRef.current = timeLeft;
      if (visualAlerts) {
        try {
          if (navigator.vibrate) navigator.vibrate(timeLeft === 0 ? [300, 100, 300] : [50]);
        } catch {
          /* vibrate non supporté */
        }
      } else {
        playSfx(timeLeft === 0 ? "timerEnd" : "timerTick");
      }
    }
  }, [timeLeft, isMyTurn, visualAlerts, playSfx]);

  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";

  const handleRaiseClick = () => {
    const amount = clampRaise(raiseAmount);
    setRaisePopoverOpen(false);
    onRaise(amount);
    setSuccessMessage(amount >= maxRaise && maxRaise > 0 ? t('game.allIn') : `$${amount.toLocaleString()} ${t('game.raise').toLowerCase()}`);
    setShowSuccessPopup(true);
    setTimeout(() => setShowSuccessPopup(false), 2000);
  };

  const raisePresets = (() => {
    if (maxRaise <= 0) return [];
    const range = maxRaise - effectiveMinRaise;
    if (range <= 0) return [maxRaise];
    return [
      effectiveMinRaise,
      effectiveMinRaise + Math.floor(range * 0.25),
      effectiveMinRaise + Math.floor(range * 0.5),
      effectiveMinRaise + Math.floor(range * 0.75),
      maxRaise,
    ].filter((v, i, a) => a.indexOf(v) === i);
  })();

  return (
    <div
      ref={ref}
      className={`fixed bottom-[calc(env(safe-area-inset-bottom,0px)+2.25rem)] left-0 right-0 w-full transition-all duration-300 md:bottom-12 ${
        raisePopoverOpen || combinationsHelpOpen ? "z-[120]" : "z-40"
      } pointer-events-none`}
    >

      {showSuccessPopup && (
        <div className="absolute top-0 md:top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full md:-translate-y-1/2 z-50 animate-bounce">
          <div className="bg-green-600 text-white px-4 py-2 md:px-8 md:py-4 rounded-xl shadow-2xl border-2 border-green-400">
            <div className="text-lg md:text-2xl font-bold text-center whitespace-nowrap">
              ✓ {successMessage}
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-auto mx-auto w-full max-w-[min(1200px,calc(100vw-2rem))]">

        {hasFolded && (
          <div className="text-center mb-1 md:mb-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 md:px-6 md:py-2 bg-red-500 text-white rounded-full font-bold shadow-xl text-sm md:text-base">
              <X className="w-4 h-4 md:w-5 md:h-5" />
              <span>{t('game.foldedLabel')}</span>
            </div>
          </div>
        )}

        {/* Waiting notification */}
        {!isMyTurn && !hasFolded && waitingForPlayer && (
          <div className="absolute -top-14 md:static left-1/2 md:left-auto -translate-x-1/2 md:translate-x-0 flex items-center mb-2 min-h-[40px] z-50">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-blue-500/90 text-white rounded-full font-bold shadow-lg text-xs md:text-sm">
              <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin shrink-0" />
              <span className="truncate max-w-[120px] md:max-w-none">{t('game.waitingFor', { name: waitingForPlayer })}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 items-end gap-3 xl:grid-cols-[minmax(11rem,1fr)_auto_auto] xl:gap-5">

          {/* Player cards + Timer next to avatar */}
          <div className="flex items-end justify-center gap-2 drop-shadow-2xl xl:justify-self-center">
            {/* Timer - next to cards */}
            {isMyTurn && timeLeft !== undefined && (
              <div
                className={`relative flex items-center justify-center rounded-full bg-slate-800/90 border-[2px] md:border-[3px] shadow-lg ring-2 w-9 h-9 md:w-[3.25rem] md:h-[3.25rem] shrink-0 mb-1 ${
                  timeLeft <= 5
                    ? "border-red-500/90 ring-red-400/30 animate-pulse"
                    : "border-amber-500/70 ring-amber-400/20"
                }`}
                title={t('game.turnSeconds', { seconds: timeLeft })}
              >
                <span className={`tabular-nums font-bold text-xs md:text-base leading-none ${
                  timeLeft <= 5 ? "text-red-400" : "text-amber-300"
                }`}>
                  {timeLeft}
                </span>
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" className={timeLeft <= 5 ? "stroke-red-500/30" : "stroke-amber-500/30"} strokeWidth="2" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none" className={timeLeft <= 5 ? "stroke-red-500" : "stroke-amber-400"} strokeWidth="2"
                    strokeDasharray={`${(timeLeft / 30) * 100} 100`} strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.5s linear' }}
                  />
                </svg>
              </div>
            )}
            {!hasFolded && cards.map((card, index) => (
              <div
                key={index}
                className="relative origin-bottom transition-all duration-300"
                style={{
                  marginLeft: index > 0 ? "-20px" : "0",
                  transform: `rotate(${index === 0 ? -6 : 8}deg)`
                }}
              >
                <PokerCard suit={card.suit} value={card.value} size={isMobile ? "md" : "lg"} colorblindMode={colorblindMode} />
              </div>
            ))}
          </div>

          {/* ACTION BUTTONS - Adaptés à l'écran */}
          <div className="flex w-full justify-center gap-2 md:w-auto xl:justify-self-center md:gap-3">
            <NeonButton
              onClick={onFold}
              disabled={actionsDisabled || !isMyTurn || isLoading || hasFolded || hasActed}
              variant="red"
              className="min-w-0 flex-1 px-4 py-3 text-xs md:flex-none md:min-w-[160px] md:px-8 md:py-4 md:text-base"
            >
              {t('game.fold')}
            </NeonButton>

            {callAmount === 0 && onCheck ? (
              <NeonButton
                onClick={onCheck}
                disabled={actionsDisabled || !isMyTurn || isLoading || hasFolded || hasActed}
                variant="blue"
                className="min-w-0 flex-1 px-4 py-3 text-xs md:flex-none md:min-w-[160px] md:px-8 md:py-4 md:text-base"
              >
                {t('game.check')}
              </NeonButton>
            ) : (
              (() => {
                const effectiveCall = Math.min(callAmount, chips);
                const isCallAllIn = callAmount > 0 && chips > 0 && callAmount > chips;
                return (
                  <NeonButton
                    onClick={() => onCall(effectiveCall)}
                    disabled={actionsDisabled || !isMyTurn || isLoading || hasFolded || hasActed || chips <= 0 || callAmount <= 0}
                    variant="blue"
                    className="min-w-0 flex-1 whitespace-nowrap px-4 py-3 text-xs md:flex-none md:min-w-[160px] md:px-8 md:py-4 md:text-base"
                  >
                    {isCallAllIn ? t('game.allIn') : `${t('game.callLabel')} ${callAmount > 0 ? callAmount : ""}`}
                  </NeonButton>
                );
              })()
            )}

            <div
              className="relative flex-1 md:flex-none"
              onMouseEnter={handleRaiseMouseEnter}
              onMouseLeave={handleRaiseMouseLeave}
            >
              {canRaise && raisePopoverOpen && (
                <div
                  className="absolute bottom-full right-0 z-50 mb-3 w-[220px] origin-bottom-right rounded-2xl border-2 border-[rgb(7,221,0)] app-shell-bg p-3 shadow-[0_0_12px_2px_rgba(7,221,0,0.5)] md:w-[240px]"
                  onMouseEnter={handleRaiseMouseEnter}
                  onMouseLeave={handleRaiseMouseLeave}
                >
                  {/* ... Ton code du popover (presets, slider, etc.) ne change pas ... */}
                  {maxRaise > 0 && (
                    <button
                      type="button"
                      onClick={() => { setRaiseAmount(maxRaise); }}
                      className={`mb-1.5 w-full rounded-full border-2 py-1.5 text-xs font-bold uppercase tracking-wide transition-all ${
                        raiseAmount >= maxRaise
                          ? "bg-amber-500 border-amber-400 text-slate-900 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                          : "bg-slate-700/80 border-amber-500/60 text-amber-300 hover:bg-amber-500/20"
                      }`}
                    >
                      {t('game.allIn')} ({maxRaise})
                    </button>
                  )}
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {raisePresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setRaiseAmount(clampRaise(preset))}
                        className={`rounded-full px-2 py-1 text-[10px] font-bold tabular-nums transition-all md:text-xs ${
                          raiseAmount === preset
                            ? "bg-[rgb(7,221,0)] text-slate-900 shadow-[0_0_8px_rgba(7,221,0,0.7)]"
                            : "bg-slate-700/80 text-slate-200 hover:bg-[rgba(7,221,0,0.25)] border border-slate-600"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={effectiveMinRaise}
                      max={maxRaise}
                      value={raiseAmount}
                      onChange={(e) => setRaiseAmount(clampRaise(Number(e.target.value)))}
                      className="flex-1 h-1.5 accent-[rgb(7,221,0)]"
                      disabled={maxRaise <= 0}
                    />
                    <input
                      type="number"
                      min={effectiveMinRaise}
                      max={maxRaise}
                      value={raiseAmount}
                      onChange={(e) => setRaiseAmount(clampRaise(Number(e.target.value) || effectiveMinRaise))}
                      className="w-14 rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 text-right text-[10px] tabular-nums text-slate-200 focus:border-[rgb(7,221,0)] focus:ring-1 focus:ring-[rgb(7,221,0)] md:text-xs"
                      disabled={maxRaise <= 0}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRaiseClick}
                    className="mt-1.5 w-full rounded-full border-2 border-[rgb(7,221,0)] bg-transparent py-1.5 text-[10px] font-bold uppercase tracking-wide text-[rgb(7,221,0)] shadow-[0_0_8px_rgba(7,221,0,0.4)] transition-all hover:bg-[rgb(7,221,0)] hover:text-slate-900 md:text-xs"
                  >
                    {isAllIn ? t('game.allIn') : `${t('game.raise')} ${raiseAmount}`}
                  </button>
                </div>
              )}
              <NeonButton
                onClick={() => (raisePopoverOpen ? handleRaiseClick() : setRaisePopoverOpen(true))}
                disabled={actionsDisabled || !isMyTurn || isLoading || hasFolded || hasActed || maxRaise <= 0}
                variant="green"
                icon={<TrendingUp className="w-4 h-4 md:w-6 md:h-6 hidden md:block" />}
                className="flex w-full min-w-0 justify-center px-4 py-3 text-xs md:min-w-[160px] md:px-8 md:py-4 md:text-base"
              >
                {isAllIn ? t('game.allIn') : t('game.raise')}
              </NeonButton>
            </div>
          </div>

          {/* UTIL BUTTONS - Visibles sur tous les écrans */}
          <div className="flex shrink-0 flex-wrap justify-center gap-2 xl:justify-self-end">
            {onToggleHiddenBets && (
              <NeonButton onClick={onToggleHiddenBets} variant="gold" icon={<Eye className="w-4 h-4" />} className="px-4 py-3 text-xs md:px-5 md:py-3.5">
                {t('game.bets')}
              </NeonButton>
            )}
            <HandCombinationsHelpButton
              colorblindMode={colorblindMode}
              onOpenChange={setCombinationsHelpOpen}
            />
            {onToggleQuantum && (
              <div
                className="shrink-0"
                onMouseEnter={onQuantumHoverEnter}
                onMouseLeave={onQuantumHoverLeave}
              >
                <NeonButton onClick={onToggleQuantum} variant="amber" icon={<Activity className="w-4 h-4" />} className="px-4 py-3 text-xs md:px-5 md:py-3.5">
                  {t("game.probabilitiesShort")}
                </NeonButton>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
});
