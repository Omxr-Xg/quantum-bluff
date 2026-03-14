import { X, TrendingUp, BarChart2, Target, Award } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useQuantumHUD } from "../contexts/QuantumHUDContext";

interface QuantumHUDProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function QuantumHUD({ isOpen, onToggle }: QuantumHUDProps) {
  const { probabilities, currentHand, winProbability } = useQuantumHUD();

  const getProbabilityColor = (prob: number) => {
    if (prob >= 0.7) return "text-green-400";
    if (prob >= 0.4) return "text-yellow-400";
    if (prob >= 0.2) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ type: "spring", damping: 25 }}
          className="fixed top-24 right-5 z-40 w-80 bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-md rounded-2xl border-2 border-purple-500 shadow-2xl"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-white font-bold">Quantum HUD</h3>
            </div>
            <button
              onClick={onToggle}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Probabilité de victoire */}
          <div className="p-4 border-b border-slate-700">
            <div className="text-gray-400 text-sm mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" />
              Chance de gagner
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-4 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${winProbability * 100}%` }}
                  className="h-full"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(74,222,128,1) 0%, rgba(250,204,21,1) 50%, rgba(248,113,113,1) 100%)",
                  }}
                />
              </div>
              <span className={`font-bold ${getProbabilityColor(winProbability)}`}>
                {Math.round(winProbability * 100)}%
              </span>
            </div>
          </div>

          {/* Main actuelle */}
          {currentHand && (
            <div className="px-4 py-2 bg-purple-900/20 border-b border-purple-500/30">
              <div className="text-xs text-purple-400 mb-1">Main actuelle</div>
              <div className="text-white font-bold flex items-center gap-2">
                <span className="text-2xl">🎴</span>
                <span>{currentHand}</span>
              </div>
            </div>
          )}

          {/* Liste des probabilités */}
          <div className="p-4 max-h-96 overflow-y-auto">
            <div className="text-gray-400 text-sm mb-3 flex items-center gap-2">
              <BarChart2 className="w-4 h-4" />
              Évolution des probabilités
            </div>

            <div className="space-y-2">
              {probabilities.map((item, index) => (
                <div
                  key={`${item.hand}-${index}`}
                  className="bg-slate-700/50 rounded-lg p-3 border border-slate-600"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white font-medium text-sm">{item.hand}</span>
                    <span
                      className={`text-xs font-bold ${getProbabilityColor(
                        item.probability
                      )}`}
                    >
                      {Math.round(item.probability * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.probability * 100}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full"
                      style={{
                        background:
                          "linear-gradient(90deg, rgba(74,222,128,0.8) 0%, rgba(250,204,21,0.8) 50%, rgba(248,113,113,0.8) 100%)",
                      }}
                    />
                  </div>
                  <div className="mt-1 text-gray-500 text-xs">
                    {item.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-800/50 rounded-b-2xl border-t border-slate-700">
            <div className="flex items-center gap-2 text-yellow-400 text-xs">
              <Award className="w-3 h-3" />
              <span>Mise à jour en temps réel</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
