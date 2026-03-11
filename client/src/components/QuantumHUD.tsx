import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useState } from "react";

interface QuantumProbability {
  combination: string;
  probability: number;
  trend: "up" | "down" | "stable";
  description: string;
}

interface QuantumHUDProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function QuantumHUD({ isOpen, onToggle }: QuantumHUDProps) {
  const [probabilities] = useState<QuantumProbability[]>([
    { combination: "Paire", probability: 42, trend: "up", description: "Forte probabilite" },
    { combination: "Double Paire", probability: 28, trend: "stable", description: "Probabilite moyenne" },
    { combination: "Brelan", probability: 15, trend: "down", description: "Faible probabilite" },
    { combination: "Suite", probability: 8, trend: "down", description: "Tres faible" },
    { combination: "Couleur", probability: 5, trend: "down", description: "Rare" },
  ]);

  const getColorByProbability = (prob: number) => {
    if (prob >= 40) return { bg: "bg-green-600", text: "text-green-400", border: "border-green-500" };
    if (prob >= 25) return { bg: "bg-yellow-600", text: "text-yellow-400", border: "border-yellow-500" };
    if (prob >= 15) return { bg: "bg-orange-600", text: "text-orange-400", border: "border-orange-500" };
    return { bg: "bg-red-600", text: "text-red-400", border: "border-red-500" };
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  return (
    <>
      {/* Panneau HUD Quantum complet */}
      {isOpen && (
        <div className="fixed left-4 bottom-32 z-40 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-md rounded-2xl border-2 border-purple-500 p-4 shadow-2xl max-w-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-800 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">Q</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">HUD Quantum</h3>
                <p className="text-purple-300 text-xs">Probabilites en temps reel</p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="text-gray-400 hover:text-white transition-colors"
              title="Fermer"
            >
              <span className="text-xl">×</span>
            </button>
          </div>

          <div className="space-y-3">
            {probabilities.map((item) => {
              const colors = getColorByProbability(item.probability);
              return (
                <div
                  key={item.combination}
                  className="bg-slate-800/50 rounded-xl p-3 border border-slate-700 hover:border-purple-500 transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold text-sm">{item.combination}</span>
                      {getTrendIcon(item.trend)}
                    </div>
                    <span className={`${colors.text} font-bold text-lg`}>{item.probability}%</span>
                  </div>

                  <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`absolute top-0 left-0 h-full ${colors.bg} rounded-full transition-all duration-500 shadow-lg`}
                      style={{ width: `${item.probability}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                    </div>
                  </div>

                  <p className="text-gray-400 text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Mise a jour en temps reel</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-400 font-semibold">Actif</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}