import { motion, AnimatePresence } from "motion/react";
import victorySound from "../assets/sounds/victory.mp3";
import { useEffect } from "react";

interface ShowdownDisplayProps {
  winner: {
    name: string;
    hand: string;
    pot: number;
  } | null;
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

export function ShowdownDisplay({ winner, onClose }: ShowdownDisplayProps) {

  useEffect(() => {
    if (winner) {
      const audio = new Audio(victorySound);
      audio.volume = 0.6;
      audio.play().catch(() => {});
    }
  }, [winner]);

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
              <div className="text-gray-400 text-sm mb-1">Gagnant</div>
              <div className="text-2xl font-bold text-white">{winner.name}</div>
            </div>

            <div className="flex justify-between items-center border-t border-b border-slate-600 py-4 my-4">
              <span className="text-gray-400">Combinaison</span>
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
