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
    // 📱 FIX MOBILE : Ajout de fixed bottom-0 left-0 w-full md:relative pour "coller" au bas de l'écran sur mobile
    <div className="fixed bottom-0 left-0 w-full md:relative shadow-2xl transition-all duration-300 z-40 bg-slate-900 md:bg-transparent pb-safe">

      {showSuccessPopup && (
        <div className="absolute top-0 md:top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full md:-translate-y-1/2 z-50 animate-bounce">
          <div className="bg-green-600 text-white px-4 py-2 md:px-8 md:py-4 rounded-xl shadow-2xl border-2 border-green-400">
            <div className="text-lg md:text-2xl font-bold text-center whitespace-nowrap">
              ✓ {successMessage}
            </div>
          </div>
        </div>
      )}

      <div className="w-full px-2 py-2 md:px-4 md:py-2">

        {hasFolded && (
          <div className="text-center mb-1 md:mb-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 md:px-6 md:py-2 bg-red-500 text-white rounded-full font-bold shadow-xl text-sm md:text-base">
              <X className="w-4 h-4 md:w-5 md:h-5" />
              <span>{t('game.foldedLabel')}</span>
            </div>
          </div>
        )}

        {/* 📱 FIX MOBILE : Le Timer et la notif d'attente remontent un peu au-dessus des boutons */}
        <div className="absolute -top-12 md:static right-2 md:right-auto flex items-center justify-between gap-4 mb-2 min-h-[40px] pointer-events-none">
          <div className="flex-1 flex justify-start min-w-0 pointer-events-auto">
            {!isMyTurn && !hasFolded && waitingForPlayer && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-blue-500/90 text-white rounded-full font-bold shadow-lg text-xs md:text-sm">
                <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin shrink-0" />
                <span className="truncate max-w-[120px] md:max-w-none">{t('game.waitingFor', { name: waitingForPlayer })}</span>
              </div>
            )}
          </div>
          <div className="shrink-0 pointer-events-auto">
            {isMyTurn && timeLeft !== undefined && (
              <div
                className="relative flex items-center justify-center rounded-full bg-slate-800/90 border-[2px] md:border-[3px] border-amber-500/70 shadow-lg ring-2 ring-amber-400/20 w-10 h-10 md:w-[3.25rem] md:h-[3.25rem]"
                title={`Tour : ${timeLeft}s`}
              >
                <span className="tabular-nums text-amber-300 font-bold text-sm md:text-base leading-none">
                  {timeLeft}
                </span>
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-amber-500/30" strokeWidth="2" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none" className="stroke-amber-400" strokeWidth="2"
                    strokeDasharray={`${(timeLeft / 20) * 100} 100`} strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.5s linear' }}
                  />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* 📱 FIX MOBILE : flex-col sur mobile, flex-row sur desktop */}
        <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-2 md:gap-4 relative">

          {/* Player cards - Plus petites sur mobile */}
          <div className="absolute bottom-full left-2 -mb-2 md:static md:mb-0 flex items-end drop-shadow-2xl">
            {cards.map((card, index) => (
              <div
                key={index}
                className="relative transition-all duration-300 origin-bottom-left"
                style={{
                  marginLeft: index > 0 ? "-20px" : "0", // Plus serrées sur mobile
                  transform: `rotate(${index === 0 ? -6 : 8}deg)`
                }}
              >
                {/* 📱 FIX MOBILE : w-16 h-24 sur mobile, w-32 h-48 sur desktop */}
                <div className="w-16 h-24 md:w-32 md:h-48 rounded-md md:rounded-lg p-1.5 md:p-2.5 bg-white flex flex-col justify-between shadow-xl border md:border-2 border-gray-200">
                  <div className={`text-base md:text-2xl font-bold leading-none ${getSuitColor(card.suit)}`}>
                    {card.value}
                  </div>
                  <div className={`text-3xl md:text-6xl text-center leading-none ${getSuitColor(card.suit)}`}>
                    {getSuitSymbol(card.suit)}
                  </div>
                  <div className={`text-base md:text-2xl font-bold rotate-180 leading-none ${getSuitColor(card.suit)}`}>
                    {card.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ACTION BUTTONS - Adaptés à l'écran */}
          <div className="flex w-full md:w-auto gap-2 md:gap-3 pl-[80px] md:pl-0">
            {/* 📱 FIX MOBILE : flex-1 px-2 py-2 text-xs sur mobile */}
            <NeonButton
              onClick={onFold}
              disabled={actionsDisabled || !isMyTurn || isLoading || hasFolded || hasActed}
              variant="red"
              className="flex-1 md:flex-none px-2 py-3 md:px-8 md:py-4 text-xs md:text-lg min-w-0 md:min-w-[125px]"
            >
              {t('game.fold')}
            </NeonButton>

            {callAmount === 0 && onCheck ? (
              <NeonButton
                onClick={onCheck}
                disabled={actionsDisabled || !isMyTurn || isLoading || hasFolded || hasActed}
                variant="blue"
                className="flex-1 md:flex-none px-2 py-3 md:px-8 md:py-4 text-xs md:text-lg min-w-0 md:min-w-[125px]"
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
                    className="flex-1 md:flex-none px-2 py-3 md:px-8 md:py-4 text-xs md:text-lg min-w-0 md:min-w-[125px] whitespace-nowrap"
                  >
                    {isCallAllIn ? t('game.allIn') : `${t('game.callLabel')} ${callAmount > 0 ? callAmount : ""}`}
                  </NeonButton>
                );
              })()
            )}

            <div
              className="relative flex-1 md:flex-none"
              onMouseEnter={() => canRaise && setRaisePopoverOpen(true)}
              onMouseLeave={() => setRaisePopoverOpen(false)}
            >
              {/* Le Popover de Relance reste géré au-dessus */}
              {canRaise && raisePopoverOpen && (
                <div
                  className="absolute bottom-full left-1/2 md:left-1/2 -translate-x-1/2 mb-1 z-50 w-[200px] md:w-[220px] p-2.5 rounded-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-[rgb(7,221,0)] shadow-[0_0_12px_2px_rgba(7,221,0,0.5)]"
                  onMouseEnter={() => setRaisePopoverOpen(true)}
                  onMouseLeave={() => setRaisePopoverOpen(false)}
                >
                  {/* ... Ton code du popover (presets, slider, etc.) ne change pas ... */}
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
                        className={`px-2 py-1 rounded text-[10px] md:text-xs font-bold tabular-nums transition-all ${
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
                      className="w-14 py-0.5 px-1 rounded bg-slate-800 border border-slate-600 text-slate-200 text-[10px] md:text-xs text-right tabular-nums focus:border-[rgb(7,221,0)] focus:ring-1 focus:ring-[rgb(7,221,0)]"
                      disabled={maxRaise <= 0}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRaiseClick}
                    className="mt-1.5 w-full py-1.5 rounded border-2 border-[rgb(7,221,0)] bg-transparent text-[rgb(7,221,0)] text-[10px] md:text-xs font-bold uppercase tracking-wide hover:bg-[rgb(7,221,0)] hover:text-slate-900 transition-all shadow-[0_0_8px_rgba(7,221,0,0.4)]"
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
                className="w-full flex justify-center px-2 py-3 md:px-8 md:py-4 text-xs md:text-lg min-w-0 md:min-w-[125px]"
              >
                {isAllIn ? t('game.allIn') : t('game.raise')}
              </NeonButton>
            </div>
          </div>

          {/* UTIL BUTTONS - Cachés sur mobile (ou placés différemment plus tard) */}
          <div className="hidden md:flex gap-2">
            {onToggleHiddenBets && (
              <NeonButton onClick={onToggleHiddenBets} variant="gold" icon={<Eye className="w-4 h-4" />}>
                Paris
              </NeonButton>
            )}
            {onToggleQuantum && (
              <NeonButton onClick={handleQuantumClick} variant="amber" icon={<Activity className="w-4 h-4" />}>
                Probas
              </NeonButton>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}