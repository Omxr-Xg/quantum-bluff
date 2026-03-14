import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Check, TrendingUp } from "lucide-react";
import { useIsMobile } from "./ui/use-mobile";

interface ActionButtonsProps {
  onFold: () => void;
  onCall: (amount: number) => void;
  onRaise: (amount: number) => void;
  callAmount: number;
  minRaise: number;
  maxRaise: number;
}

export function ActionButtons({ 
  onFold, 
  onCall, 
  onRaise, 
  callAmount,
  minRaise,
  maxRaise
}: ActionButtonsProps) {
  const { t } = useTranslation();
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  const [showRaiseSlider, setShowRaiseSlider] = useState(false);
  const isMobile = useIsMobile();

  const handleRaiseClick = () => {
    if (showRaiseSlider) {
      onRaise(raiseAmount);
      setShowRaiseSlider(false);
    } else {
      setShowRaiseSlider(true);
    }
  };

  return (
    <div className={`absolute ${isMobile ? 'bottom-[140px]' : 'bottom-[180px]'} left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 sm:gap-3`}>
      {/* Slider pour la relance */}
      {showRaiseSlider && (
        <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl sm:rounded-2xl px-4 py-3 sm:px-6 sm:py-4 shadow-2xl border-2 border-gray-700">
          <div className="flex flex-col gap-2 sm:gap-3">
            <div className="text-white text-xs sm:text-sm font-semibold text-center">
              {t('game.raiseAmountLabel')}
            </div>
            <div className="text-yellow-400 text-xl sm:text-2xl font-bold text-center">
              ${raiseAmount.toLocaleString()}
            </div>
            <input
              type="range"
              min={minRaise}
              max={maxRaise}
              value={raiseAmount}
              onChange={(e) => setRaiseAmount(Number(e.target.value))}
              className={`${isMobile ? 'w-48' : 'w-64'} h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500`}
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>${minRaise.toLocaleString()}</span>
              <span>${maxRaise.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Boutons d'action */}
      <div className="flex gap-2 sm:gap-4">
        {/* Bouton Se coucher */}
        <button
          onClick={onFold}
          className={`group relative bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white ${isMobile ? 'px-4 py-3' : 'px-8 py-4'} rounded-lg sm:rounded-xl shadow-2xl border-2 sm:border-4 border-red-500 hover:border-red-400 transition-all transform active:scale-95 touch-manipulation`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <X className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'}`} />
            <div className={isMobile ? 'text-left' : ''}>
              <div className={`font-bold ${isMobile ? 'text-sm' : 'text-lg'}`}>{t('game.fold')}</div>
              {!isMobile && <div className="text-xs opacity-90">Fold</div>}
            </div>
          </div>
        </button>

        {/* Bouton Suivre */}
        <button
          onClick={() => onCall(callAmount)}
          className={`group relative bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white ${isMobile ? 'px-4 py-3' : 'px-8 py-4'} rounded-lg sm:rounded-xl shadow-2xl border-2 sm:border-4 border-blue-500 hover:border-blue-400 transition-all transform active:scale-95 touch-manipulation`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <Check className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'}`} />
            <div className={isMobile ? 'text-left' : ''}>
              <div className={`font-bold ${isMobile ? 'text-sm' : 'text-lg'}`}>{t('game.callLabel')}</div>
              {!isMobile && <div className="text-xs opacity-90">{t('game.call', { amount: callAmount })}</div>}
            </div>
          </div>
        </button>

        {/* Bouton Relancer */}
        <button
          onClick={handleRaiseClick}
          className={`group relative bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white ${isMobile ? 'px-4 py-3' : 'px-8 py-4'} rounded-lg sm:rounded-xl shadow-2xl border-2 sm:border-4 border-green-500 hover:border-green-400 transition-all transform active:scale-95 touch-manipulation`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <TrendingUp className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'}`} />
            <div className={isMobile ? 'text-left' : ''}>
              <div className={`font-bold ${isMobile ? 'text-sm' : 'text-lg'}`}>{t('game.raise')}</div>
              {!isMobile && <div className="text-xs opacity-90">Raise</div>}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}