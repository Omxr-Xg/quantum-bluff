import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, TrendingUp, Loader2, Activity, Eye } from "lucide-react";
import { useDeviceType } from "./ui/use-mobile";
import { NeonButton } from "./NeonButton";

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
  onToggleHiddenBets?: () => void;
  onToggleChat?: () => void;
  isQuantumOpen?: boolean;
  isHiddenBetsOpen?: boolean;
  isChatOpen?: boolean;
  timeLeft?: number;
}

export function PlayerDashboard({
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
  onToggleHiddenBets,
  isQuantumOpen,
  isHiddenBetsOpen: _isHiddenBetsOpen,
  timeLeft,
}: PlayerDashboardProps) {
  const { t } = useTranslation();
  const effectiveMinRaise = Math.min(minRaise, maxRaise);
  const clampRaise = (v: number) => Math.max(effectiveMinRaise, Math.min(maxRaise, Math.round(v)));
  const [raiseAmount, setRaiseAmount] = useState(() => clampRaise(Math.min(minRaise, maxRaise)));
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [raisePopoverOpen, setRaisePopoverOpen] = useState(false);
  const isAllIn = maxRaise > 0 && raiseAmount >= maxRaise;
  const canRaise = isMyTurn && !actionsDisabled && !isLoading && !hasFolded && !hasActed && maxRaise > 0;

  useEffect(() => {
    setRaiseAmount((prev) => clampRaise(prev));
  }, [minRaise, maxRaise]);

  useEffect(() => {
    if (!canRaise) setRaisePopoverOpen(false);
  }, [canRaise]);

  const [isQuantumPinned, setIsQuantumPinned] = useState(false);

  useDeviceType();

  const handleQuantumClick = () => {
    setIsQuantumPinned(!isQuantumPinned);

    if (isQuantumPinned) {
      setTimeout(() => onToggleQuantum?.(), 0);
    } else {
      if (!isQuantumOpen) {
        setTimeout(() => onToggleQuantum?.(), 0);
      }
    }
  };

  const getSuitSymbol = (suit: string) => {
    const suits: { [key: string]: string } = {
      hearts: "♥",
      diamonds: "♦",
      clubs: "♣",
      spades: "♠",
    };

    return suits[suit] || "";
  };

  const getSuitColor = (suit: string) => {
    return suit === "hearts" || suit === "diamonds"
      ? "text-red-600"
      : "text-gray-900";
  };

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
      effectiveMinRaise + Math.round(range * 0.25),
      effectiveMinRaise + Math.round(range * 0.5),
      effectiveMinRaise + Math.round(range * 0.75),
      maxRaise,
    ].filter((v, i, a) => a.indexOf(v) === i);
  })();

  return (
    <div className="w-full shadow-2xl transition-all duration-300 relative">

      {showSuccessPopup && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-bounce">
          <div className="bg-green-600 text-white px-8 py-4 rounded-2xl shadow-2xl border-4 border-green-400">
            <div className="text-2xl font-bold text-center">
              ✓ {successMessage}
            </div>
          </div>
        </div>
      )}

      <div className="w-full px-4 py-2">

        {hasFolded && (
          <div className="text-center mb-2">
            <div className="inline-flex items-center gap-3 px-6 py-2 bg-red-500 text-white rounded-full font-bold shadow-xl">
              <X className="w-5 h-5" />
              <span>{t('game.foldedLabel')}</span>
            </div>
          </div>
        )}

        {/* Une seule ligne : notif "en attente" à gauche, timer à droite */}
        <div className="flex items-center justify-between gap-4 mb-2 min-h-[40px]">
          <div className="flex-1 flex justify-start min-w-0">
            {!isMyTurn && !hasFolded && waitingForPlayer && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/90 text-white rounded-full font-bold shadow-lg text-sm">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span className="truncate">{t('game.waitingFor', { name: waitingForPlayer })}</span>
              </div>
            )}
          </div>
          <div className="shrink-0">
            {isMyTurn && timeLeft !== undefined && (
              <div
                className="relative flex items-center justify-center rounded-full bg-slate-800/90 border-[3px] border-amber-500/70 shadow-lg ring-2 ring-amber-400/20"
                style={{ width: '3.25rem', height: '3.25rem' }}
                title={`Tour : ${timeLeft}s`}
              >
                <span className="tabular-nums text-amber-300 font-bold text-base leading-none">
                  {timeLeft}
                </span>
                <svg
                  className="absolute inset-0 w-full h-full -rotate-90"
                  viewBox="0 0 36 36"
                  style={{ width: '3.25rem', height: '3.25rem' }}
                >
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    className="stroke-amber-500/30"
                    strokeWidth="2"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    className="stroke-amber-400"
                    strokeWidth="2"
                    strokeDasharray={`${(timeLeft / 20) * 100} 100`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.5s linear' }}
                  />
                </svg>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-end justify-between gap-4">

          {/* Player cards - plus grandes en bas à gauche */}
          <div className="flex relative items-end">
            {cards.map((card, index) => (
              <div
                key={index}
                className="relative transition-all duration-300"
                style={{
                  marginLeft: index > 0 ? "-52px" : "0",
                  transform: `rotate(${index === 0 ? -6 : 8}deg)`
                }}
              >
                <div className="w-32 h-48 rounded-lg p-2.5 bg-white flex flex-col justify-between shadow-xl border-2 border-gray-200">
                  <div className={`text-2xl font-bold ${getSuitColor(card.suit)}`}>
                    {card.value}
                  </div>
                  <div className={`text-6xl text-center ${getSuitColor(card.suit)}`}>
                    {getSuitSymbol(card.suit)}
                  </div>
                  <div className={`text-2xl font-bold rotate-180 ${getSuitColor(card.suit)}`}>
                    {card.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ACTION BUTTONS - 25% plus grands */}
          <div className="flex gap-3">
            <NeonButton
              onClick={onFold}
              disabled={actionsDisabled || !isMyTurn || isLoading || hasFolded || hasActed}
              variant="red"
              className="px-8 py-4 text-lg min-w-[125px]"
            >
              {t('game.fold')}
            </NeonButton>

            {callAmount === 0 && onCheck ? (
              <NeonButton
                onClick={onCheck}
                disabled={actionsDisabled || !isMyTurn || isLoading || hasFolded || hasActed}
                variant="blue"
                className="px-8 py-4 text-lg min-w-[125px]"
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
                    className="px-8 py-4 text-lg min-w-[125px]"
                  >
                    {isCallAllIn ? t('game.allIn') : `${t('game.callLabel')} ${callAmount > 0 ? callAmount : ""}`}
                  </NeonButton>
                );
              })()
            )}

            <div
              className="relative"
              onMouseEnter={() => canRaise && setRaisePopoverOpen(true)}
              onMouseLeave={() => setRaisePopoverOpen(false)}
            >
              {canRaise && raisePopoverOpen && (
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 w-[220px] p-2.5 rounded-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-[rgb(7,221,0)] shadow-[0_0_12px_2px_rgba(7,221,0,0.5)]"
                  onMouseEnter={() => setRaisePopoverOpen(true)}
                  onMouseLeave={() => setRaisePopoverOpen(false)}
                >
                  {maxRaise > 0 && (
                    <button
                      type="button"
                      onClick={() => { setRaiseAmount(maxRaise); }}
                      className={`w-full mb-1.5 py-1.5 rounded border-2 text-xs font-bold uppercase tracking-wide transition-all ${
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
                        className={`px-2 py-1 rounded text-xs font-bold tabular-nums transition-all ${
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
                      className="w-14 py-0.5 px-1 rounded bg-slate-800 border border-slate-600 text-slate-200 text-xs text-right tabular-nums focus:border-[rgb(7,221,0)] focus:ring-1 focus:ring-[rgb(7,221,0)]"
                      disabled={maxRaise <= 0}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRaiseClick}
                    className="mt-1.5 w-full py-1.5 rounded border-2 border-[rgb(7,221,0)] bg-transparent text-[rgb(7,221,0)] text-xs font-bold uppercase tracking-wide hover:bg-[rgb(7,221,0)] hover:text-slate-900 transition-all shadow-[0_0_8px_rgba(7,221,0,0.4)]"
                  >
                    {isAllIn ? t('game.allIn') : `${t('game.raise')} ${raiseAmount}`}
                  </button>
                </div>
              )}
              <NeonButton
                onClick={() => (raisePopoverOpen ? handleRaiseClick() : setRaisePopoverOpen(true))}
                disabled={actionsDisabled || !isMyTurn || isLoading || hasFolded || hasActed || maxRaise <= 0}
                variant="green"
                icon={<TrendingUp className="w-6 h-6" />}
                className="px-8 py-4 text-lg min-w-[125px]"
              >
                {isAllIn ? t('game.allIn') : t('game.raise')}
              </NeonButton>
            </div>
          </div>

          {/* UTIL BUTTONS - taille normale */}
          <div className="flex gap-2">

            {onToggleHiddenBets && (
              <NeonButton
                onClick={onToggleHiddenBets}
                variant="gold"
                icon={<Eye className="w-4 h-4" />}
              >
                Paris
              </NeonButton>
            )}

            {onToggleQuantum && (
              <NeonButton
                onClick={handleQuantumClick}
                variant="amber"
                icon={<Activity className="w-4 h-4" />}
              >
                Probas
              </NeonButton>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}