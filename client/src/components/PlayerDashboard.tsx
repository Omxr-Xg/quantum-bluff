import { useState } from "react";
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
  chips: _chips,
  cards,
  onFold,
  onCall,
  onRaise,
  onCheck,
  callAmount,
  minRaise: _minRaise,
  maxRaise: _maxRaise,
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
  const [raiseAmount] = useState(50);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

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
    onRaise(raiseAmount);

    setSuccessMessage(`$${raiseAmount.toLocaleString()} relancé`);
    setShowSuccessPopup(true);

    setTimeout(() => setShowSuccessPopup(false), 2000);
  };

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

        {!isMyTurn && !hasFolded && waitingForPlayer && (
          <div className="text-center flex items-center justify-center gap-3 mb-2">
            <div className="inline-flex items-center gap-3 px-6 py-2 bg-blue-500 text-white rounded-full font-bold shadow-xl">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{t('game.waitingFor', { name: waitingForPlayer })}</span>
            </div>
          </div>
        )}

        {isMyTurn && timeLeft !== undefined && (
          <div className="text-center mb-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/20 border border-amber-500/50 rounded-full text-amber-400 font-bold text-sm">
              <span>Tour :</span>
              <span>{timeLeft}s</span>
            </div>
          </div>
        )}

        <div className="flex items-end justify-between gap-4">

          {/* Player cards */}
          <div className="flex relative items-end">
            {cards.map((card, index) => (
              <div
                key={index}
                className="relative transition-all duration-300"
                style={{
                  marginLeft: index > 0 ? "-40px" : "0",
                  transform: `rotate(${index === 0 ? -6 : 8}deg)`
                }}
              >

                <div className="w-24 h-36 rounded p-2 bg-white flex flex-col justify-between">

                  <div className={`text-xl font-bold ${getSuitColor(card.suit)}`}>
                    {card.value}
                  </div>

                  <div className={`text-5xl text-center ${getSuitColor(card.suit)}`}>
                    {getSuitSymbol(card.suit)}
                  </div>

                  <div className={`text-xl font-bold rotate-180 ${getSuitColor(card.suit)}`}>
                    {card.value}
                  </div>

                </div>
              </div>
            ))}
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-2">
            <NeonButton
              onClick={onFold}
              disabled={actionsDisabled || !isMyTurn || isLoading || hasFolded || hasActed}
              variant="red"
            >
              {t('game.fold')}
            </NeonButton>

            {callAmount === 0 && onCheck ? (
              <NeonButton
                onClick={onCheck}
                disabled={actionsDisabled || !isMyTurn || isLoading || hasFolded || hasActed}
                variant="blue"
              >
                {t('game.check')}
              </NeonButton>
            ) : (
              <NeonButton
                onClick={() => onCall(callAmount)}
                disabled={actionsDisabled || !isMyTurn || isLoading || hasFolded || hasActed || callAmount <= 0}
                variant="blue"
              >
                {t('game.callLabel')} {callAmount > 0 ? callAmount : ""}
              </NeonButton>
            )}

            <NeonButton
              onClick={handleRaiseClick}
              disabled={actionsDisabled || !isMyTurn || isLoading || hasFolded || hasActed}
              variant="green"
              icon={<TrendingUp className="w-5 h-5" />}
            >
              {t('game.raise')}
            </NeonButton>
          </div>

          {/* UTIL BUTTONS */}
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