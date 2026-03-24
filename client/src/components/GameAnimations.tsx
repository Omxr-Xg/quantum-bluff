import { motion } from "motion/react";

interface PlayerTimerProps {
  playerName: string;
  isActive: boolean;
  timeLeft: number;
  maxTime: number;
}

export function PlayerTimer({ playerName: _playerName, isActive, timeLeft, maxTime }: PlayerTimerProps) {
  const percentage = (timeLeft / maxTime) * 100;
  
  const getColorByTime = () => {
    if (percentage > 60) return { border: "border-green-500", bg: "bg-green-500", shadow: "shadow-green-500/50" };
    if (percentage > 30) return { border: "border-yellow-500", bg: "bg-yellow-500", shadow: "shadow-yellow-500/50" };
    return { border: "border-red-500", bg: "bg-red-500", shadow: "shadow-red-500/50" };
  };

  const colors = getColorByTime();

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="relative"
    >
      <svg className="absolute -inset-2" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-slate-700"
        />
        <motion.circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          className={colors.bg.replace("bg-", "text-")}
          strokeDasharray={`${2 * Math.PI * 48}`}
          strokeDashoffset={`${2 * Math.PI * 48 * (1 - percentage / 100)}`}
          transform="rotate(-90 50 50)"
          initial={{ strokeDashoffset: 2 * Math.PI * 48 }}
          animate={{ 
            strokeDashoffset: 2 * Math.PI * 48 * (1 - percentage / 100),
            opacity: percentage < 20 ? [1, 0.3, 1] : 1
          }}
          transition={{ 
            duration: 0.3,
            opacity: { duration: 0.5, repeat: percentage < 20 ? Infinity : 0 }
          }}
        />
      </svg>

      {percentage < 30 && (
        <motion.div
          className={`absolute -inset-2 rounded-full ${colors.border} border-4`}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}

      <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 ${colors.bg} text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-lg ${colors.shadow}`}>
        {timeLeft}s
      </div>
    </motion.div>
  );
}

interface FlyingChipsProps {
  amount: number;
  fromPosition: { x: number; y: number };
  toPosition: { x: number; y: number };
  onComplete: () => void;
}

export function FlyingChips({ amount, fromPosition, toPosition, onComplete }: FlyingChipsProps) {
  return (
    <motion.div
      initial={{ x: fromPosition.x, y: fromPosition.y, scale: 0.5, opacity: 0 }}
      animate={{ 
        x: toPosition.x, 
        y: toPosition.y, 
        scale: [0.5, 1.2, 1],
        opacity: [0, 1, 1, 0]
      }}
      transition={{ 
        duration: 1.2,
        times: [0, 0.3, 0.7, 1],
        ease: "easeInOut"
      }}
      onAnimationComplete={onComplete}
      className="absolute z-50 pointer-events-none"
    >
      <div className="relative">
        <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border-4 border-yellow-200 shadow-2xl flex items-center justify-center">
          <span className="text-white font-bold text-lg">$</span>
        </div>
        <div className="absolute -top-2 -right-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">
          +{amount}
        </div>
      </div>
    </motion.div>
  );
}

interface CardSymbol {
  suit: "heart" | "diamond" | "spade" | "club";
  value: string;
}

export function AccessibleCard({ suit, value, showLargeSymbol = false }: CardSymbol & { showLargeSymbol?: boolean }) {

  const suitSymbols = {
    heart: "♥",
    diamond: "♦",
    spade: "♠",
    club: "♣"
  };

  const suitColors = {
    heart: "text-red-600",
    diamond: "text-red-600",
    spade: "text-gray-900",
    club: "text-gray-900"
  };

  const suitNames = {
    heart: "Coeur",
    diamond: "Carreau",
    spade: "Pique",
    club: "Trefle"
  };

  return (
    <div className="relative">
      {showLargeSymbol && (
        <div className="absolute top-0 right-0 bg-slate-900/80 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg border-l border-b border-slate-700">
          {suitNames[suit]}
        </div>
      )}

      <div className={`absolute top-2 left-2 flex flex-col items-center ${suitColors[suit]}`}>
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-3xl leading-none">{suitSymbols[suit]}</span>
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`${suitColors[suit]} ${showLargeSymbol ? "text-6xl" : "text-4xl"}`}>
          {suitSymbols[suit]}
        </span>
      </div>
    </div>
  );
}