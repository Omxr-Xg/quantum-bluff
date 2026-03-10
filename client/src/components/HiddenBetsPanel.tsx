import { Eye, EyeOff, Plus, Trash2, ChevronRight, User, Trophy } from "lucide-react";
import { useState } from "react";

interface HiddenBet {
  id: number;
  type: "player" | "hand";
  choice: string;
  amount: number;
}

interface Player {
  id: number;
  name: string;
}

interface HiddenBetsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  players: Player[];
}

export function HiddenBetsPanel({ isOpen, onToggle, players }: HiddenBetsPanelProps) {
  const [hiddenBets, setHiddenBets] = useState<HiddenBet[]>([]);
  const [betType, setBetType] = useState<"player" | "hand" | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string>("");
  const [betAmount, setBetAmount] = useState<number>(0);

  const pokerHands = [
    { id: "straight", name: "Suite (Straight)", icon: "📊" },
    { id: "flush", name: "Couleur (Flush)", icon: "♠️" },
    { id: "straight-flush", name: "Quinte Flush (Straight Flush)", icon: "🔥" },
    { id: "full", name: "Full House", icon: "🏠" },
    { id: "four-kind", name: "Carré (Four of a Kind)", icon: "💎" },
    { id: "royal-flush", name: "Quinte Flush Royale", icon: "👑" },
  ];

  const addHiddenBet = () => {
    if (betType && selectedChoice && betAmount > 0) {
      setHiddenBets([
        ...hiddenBets,
        {
          id: Date.now(),
          type: betType,
          choice: selectedChoice,
          amount: betAmount,
        },
      ]);
      // Reset
      setBetType(null);
      setSelectedChoice("");
      setBetAmount(0);
    }
  };

  const removeHiddenBet = (id: number) => {
    setHiddenBets(hiddenBets.filter((bet) => bet.id !== id));
  };

  const getChoiceLabel = (bet: HiddenBet) => {
    if (bet.type === "player") {
      return bet.choice;
    } else {
      const hand = pokerHands.find((h) => h.id === bet.choice);
      return hand ? hand.name : bet.choice;
    }
  };

  return (
    <>
      {/* Panneau coulissant */}
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-gradient-to-br from-gray-900 to-gray-950 shadow-2xl border-l-4 border-purple-500 transform transition-transform duration-300 z-50 overflow-y-auto ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col min-h-full p-6">
          {/* En-tête */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Eye className="w-8 h-8 text-purple-400" />
              <h2 className="text-2xl font-bold text-white">Paris Cachés</h2>
            </div>
            <button
              onClick={onToggle}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Description */}
          <div className="bg-purple-900/30 rounded-lg p-4 mb-6 border border-purple-500/30">
            <p className="text-purple-200 text-sm">
              Pariez sur qui va gagner ou quelle main va l'emporter !
            </p>
          </div>

          {/* Liste des paris actifs */}
          {hiddenBets.length > 0 && (
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-3">Vos paris actifs</h3>
              <div className="space-y-3">
                {hiddenBets.map((bet) => (
                  <div
                    key={bet.id}
                    className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-purple-500 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-xs text-gray-400 mb-1">
                          {bet.type === "player" ? "Qui va gagner" : "Qu'est-ce qui va gagner"}
                        </div>
                        <div className="text-white font-semibold mb-1">
                          {getChoiceLabel(bet)}
                        </div>
                        <div className="text-yellow-400 font-bold text-lg">
                          ${bet.amount.toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() => removeHiddenBet(bet.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nouveau pari - Choix du type */}
          {!betType && (
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-4">Placer un nouveau pari</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setBetType("player")}
                  className="w-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white p-6 rounded-xl font-semibold transition-all shadow-xl border-2 border-blue-500 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-lg font-bold">Qui va gagner ?</div>
                      <div className="text-blue-200 text-sm">Parier sur un joueur</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setBetType("hand")}
                  className="w-full bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white p-6 rounded-xl font-semibold transition-all shadow-xl border-2 border-green-500 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-lg font-bold">Qu'est-ce qui va gagner ?</div>
                      <div className="text-green-200 text-sm">Parier sur une combinaison</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Sélection du joueur */}
          {betType === "player" && !selectedChoice && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Choisissez un joueur</h3>
                <button
                  onClick={() => setBetType(null)}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  ← Retour
                </button>
              </div>
              <div className="space-y-2">
                {players.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => setSelectedChoice(player.name)}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-white p-4 rounded-lg font-semibold transition-all border border-gray-700 hover:border-blue-500 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {player.name.charAt(0)}
                        </span>
                      </div>
                      <span>{player.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sélection de la combinaison */}
          {betType === "hand" && !selectedChoice && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Choisissez une combinaison</h3>
                <button
                  onClick={() => setBetType(null)}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  ← Retour
                </button>
              </div>
              <div className="space-y-2">
                {pokerHands.map((hand) => (
                  <button
                    key={hand.id}
                    onClick={() => setSelectedChoice(hand.id)}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-white p-4 rounded-lg font-semibold transition-all border border-gray-700 hover:border-green-500 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{hand.icon}</div>
                      <span>{hand.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Montant du pari */}
          {betType && selectedChoice && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Montant du pari</h3>
                <button
                  onClick={() => setSelectedChoice("")}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  ← Retour
                </button>
              </div>

              {/* Récapitulatif */}
              <div className="bg-gray-800 rounded-lg p-4 border border-purple-500 mb-4">
                <div className="text-xs text-gray-400 mb-1">
                  {betType === "player" ? "Qui va gagner" : "Qu'est-ce qui va gagner"}
                </div>
                <div className="text-white font-bold text-lg">{getChoiceLabel({ type: betType, choice: selectedChoice } as HiddenBet)}</div>
              </div>

              {/* Montant */}
              <div className="space-y-3">
                <input
                  type="number"
                  placeholder="Montant ($)"
                  value={betAmount || ""}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="w-full bg-gray-900 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-purple-500 focus:outline-none text-lg"
                />

                {/* Boutons rapides */}
                <div className="grid grid-cols-4 gap-2">
                  {[50, 100, 250, 500].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setBetAmount(amount)}
                      className="bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-semibold transition-all border border-gray-700"
                    >
                      ${amount}
                    </button>
                  ))}
                </div>

                <button
                  onClick={addHiddenBet}
                  disabled={betAmount <= 0}
                  className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                    betAmount > 0
                      ? "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white"
                      : "bg-gray-700 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <Plus className="w-5 h-5" />
                  Confirmer le pari
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overlay pour fermer le panneau */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        />
      )}
    </>
  );
}