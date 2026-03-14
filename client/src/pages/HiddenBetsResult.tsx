import { useLocation, useNavigate } from "react-router-dom";
import { X, Trophy, TrendingUp, Award, Coins, ArrowLeft, Home } from "lucide-react";
import { getPlayerAvatar } from "../utils/avatars";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useHiddenBets, HiddenBet } from "../contexts/HiddenBetsContext";

export function HiddenBetsResult() {
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: {
      winnerName?: string;
      handName?: string;
    };
  };
  const { bets } = useHiddenBets();

  const actualWinner = location.state?.winnerName ?? "Gagnant inconnu";
  const actualCombination = location.state?.handName ?? "Combinaison inconnue";

  const computedBets: HiddenBet[] = bets.map((bet) => {
    const isWinnerBet =
      bet.betType === "winner" &&
      actualWinner !== "Gagnant inconnu" &&
      bet.betChoice === actualWinner;
    const isCombinationBet =
      bet.betType === "combination" &&
      actualCombination !== "Combinaison inconnue" &&
      bet.betChoice === actualCombination;

    const won = isWinnerBet || isCombinationBet;
    const winAmount = won ? bet.amount * bet.odds : 0;

    return {
      ...bet,
      won,
      winAmount,
    };
  });

  const totalWinnings = computedBets
    .filter((bet) => bet.won)
    .reduce((sum, bet) => sum + (bet.winAmount || 0), 0);

  const getCombinationEmoji = (combination: string) => {
    const emojis: { [key: string]: string } = {
      "Paire": "🎯",
      "Double Paire": "🎲",
      "Brelan": "🎪",
      "Quinte": "📊",
      "Couleur": "💎",
      "Full": "🏆",
      "Carré": "👑",
      "Quinte Flush": "⭐",
      "Quinte Flush Royale": "💫",
    };
    return emojis[combination] || "🎴";
  };

  const getOddsColor = (odds: number) => {
    if (odds >= 5) return "text-purple-400";
    if (odds >= 3) return "text-red-400";
    if (odds >= 2) return "text-orange-400";
    return "text-yellow-400";
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border-4 border-yellow-500">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 p-6 relative">
          <button
            onClick={() => navigate("/lobby")}
            className="absolute top-4 left-4 bg-white/20 hover:bg-white/30 p-2 rounded-full transition-all flex items-center justify-center"
            title="Retour à l'accueil"
          >
            <Home className="w-6 h-6 text-white" />
          </button>

          <button
            onClick={() => navigate("/game")}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-2 rounded-full transition-all"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div className="flex items-center gap-4 justify-center">
            <div className="bg-white/20 p-4 rounded-2xl">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">
                Résultats des Paris Cachés
              </h2>
              <p className="text-yellow-100 text-sm">
                Tous les paris secrets sont maintenant révélés !
              </p>
            </div>
          </div>
        </div>

        {/* Résultat du match */}
        <div className="p-6 bg-slate-800/50 border-b border-slate-700">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-green-600 to-green-700 p-4 rounded-xl border-2 border-green-400">
              <div className="text-green-200 text-sm font-semibold mb-1">
                🏆 GAGNANT DU COUP
              </div>
              <div className="text-white text-2xl font-bold">{actualWinner}</div>
            </div>

            <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-4 rounded-xl border-2 border-purple-400">
              <div className="text-purple-200 text-sm font-semibold mb-1">
                {getCombinationEmoji(actualCombination)} COMBINAISON GAGNANTE
              </div>
              <div className="text-white text-2xl font-bold">
                {actualCombination}
              </div>
            </div>
          </div>
        </div>

        {/* Liste des paris */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-400px)]">
          <div className="space-y-3">
            {computedBets.map((bet, index) => (
              <div
                key={index}
                className={`relative overflow-hidden rounded-2xl p-4 border-2 transition-all ${
                  bet.won
                    ? "bg-gradient-to-r from-green-900/50 to-green-800/50 border-green-500 shadow-lg shadow-green-500/20"
                    : "bg-gradient-to-r from-slate-800/50 to-slate-700/50 border-slate-600"
                }`}
              >
                {/* Badge "GAGNÉ" */}
                {bet.won && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                    <Award className="w-3 h-3" />
                    GAGNÉ
                  </div>
                )}

                <div className="flex items-center gap-4">
                  {/* Avatar du joueur */}
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white flex items-center justify-center shadow-lg flex-shrink-0">
                    {getPlayerAvatar(bet.playerName) ? (
                      <ImageWithFallback
                        src={getPlayerAvatar(bet.playerName)}
                        alt={`${bet.playerName}'s avatar`}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-lg font-bold">
                        {bet.playerName.charAt(0)}
                      </span>
                    )}
                  </div>

                  {/* Info du pari */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-bold text-lg">
                        {bet.playerName}
                      </span>
                      <span className="text-gray-400 text-sm">a parié sur</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Type de pari */}
                      <div
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          bet.betType === "winner"
                            ? "bg-blue-600 text-white"
                            : "bg-purple-600 text-white"
                        }`}
                      >
                        {bet.betType === "winner"
                          ? "👤 Qui va gagner"
                          : "🎴 Combinaison"}
                      </div>

                      {/* Choix du pari */}
                      <div className="text-yellow-300 font-bold text-base">
                        {bet.betType === "winner"
                          ? bet.betChoice
                          : `${getCombinationEmoji(bet.betChoice)} ${
                              bet.betChoice
                            }`}
                      </div>
                    </div>
                  </div>

                  {/* Montants */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-gray-400 text-xs mb-1">Mise</div>
                    <div className="text-white font-bold text-lg mb-2">
                      ${bet.amount.toLocaleString()}
                    </div>

                    {/* Cote */}
                    <div
                      className={`${getOddsColor(
                        bet.odds
                      )} text-sm font-bold flex items-center justify-end gap-1`}
                    >
                      <TrendingUp className="w-4 h-4" />
                      Cote x{bet.odds}
                    </div>
                  </div>

                  {/* Gain */}
                  <div className="text-right flex-shrink-0 min-w-[120px]">
                    {bet.won ? (
                      <div className="bg-green-600 rounded-xl p-3 border-2 border-green-400">
                        <div className="text-green-200 text-xs mb-1">
                          💰 GAIN
                        </div>
                        <div className="text-white font-bold text-xl">
                          +${bet.winAmount?.toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-700 rounded-xl p-3 border-2 border-slate-600">
                        <div className="text-gray-400 text-xs mb-1">PERDU</div>
                        <div className="text-red-400 font-bold text-xl">
                          -${bet.amount.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer avec total des gains */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 border-t-2 border-yellow-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Coins className="w-8 h-8 text-yellow-400" />
              <div>
                <div className="text-gray-400 text-sm">Total des gains</div>
                <div className="text-yellow-400 text-2xl font-bold">
                  ${totalWinnings.toLocaleString()}
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate("/lobby")}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold px-8 py-3 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg"
            >
              Retour au Lobby
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}