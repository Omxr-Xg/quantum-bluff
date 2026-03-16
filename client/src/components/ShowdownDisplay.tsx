import { motion, AnimatePresence } from "motion/react";
import victorySound from "../assets/sounds/victory.mp3";
import { useEffect, useRef } from "react";
import { PokerCard } from "./PokerCard";

interface CardData {
  suit: string;
  value: string;
}

interface ShowdownDisplayProps {
  winner: {
    name: string;
    hand: string;
    pot: number;
    isSplit?: boolean;
  } | null;
  winnerCards?: CardData[];
  onClose?: () => void;
}

function getHandColor(hand: string): string {
  if (hand.includes("Quinte flush")) return "text-purple-400";
  if (hand.includes("Carré")) return "text-blue-400";
  if (hand.includes("Full")) return "text-green-400";
  if (hand.includes("Couleur")) return "text-cyan-400";
  if (hand.includes("Quinte")) return "text-yellow-400";
  if (hand.includes("Brelan")) return "text-orange-400";
  if (hand.includes("Double paire")) return "text-pink-400";
  if (hand.includes("Paire")) return "text-indigo-400";
  if (hand.includes("Abandon")) return "text-slate-400";
  return "text-gray-400";
}

export function ShowdownDisplay({ winner, winnerCards, onClose }: ShowdownDisplayProps) {
  const hasPlayedSoundRef = useRef(false);

  useEffect(() => {
    if (winner && !hasPlayedSoundRef.current) {
      hasPlayedSoundRef.current = true;
      const audio = new Audio(victorySound);
      audio.volume = 0.6;
      audio.play().catch(() => {});
    }
    if (!winner) hasPlayedSoundRef.current = false; // Reset pour le prochain showdown
  }, [winner]);

  useEffect(() => {
    if (!winner || !onClose) return;
    const timer = setTimeout(onClose, 10000);
    return () => clearTimeout(timer);
  }, [winner, onClose]);

  if (!winner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-yellow-500 shadow-2xl max-w-md w-full p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold text-white mb-2">Showdown !</h2>
          </div>

          <div className="bg-slate-700/50 rounded-xl p-6 mb-6">
            <div className="text-center mb-4">
              <div className="text-gray-400 text-sm mb-1">{winner.isSplit ? "Résultat" : "Gagnant"}</div>
              <div className="text-2xl font-bold text-white">{winner.isSplit ? "Égalité — Split pot" : winner.name}</div>
            </div>

            {winnerCards && winnerCards.length > 0 && (
              <div className="flex justify-center gap-3 my-4">
                {winnerCards.map((card, i) => (
                  <PokerCard
                    key={i}
                    suit={card.suit}
                    value={card.value}
                    size="md"
                    highlight
                    animated
                    animationDelay={i * 0.15}
                  />
                ))}
              </div>
            )}

            <div className="flex justify-between items-center border-t border-b border-slate-600 py-4 my-4">
              <span className="text-gray-400">Combinaison gagnante</span>
              <span className={`text-xl font-bold ${getHandColor(winner.hand)}`}>
                {winner.hand}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-400">Gain</span>
              <span className="text-2xl font-bold text-yellow-400">
                {winner.pot.toLocaleString()} 🪙
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105"
          >
            Continuer
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
