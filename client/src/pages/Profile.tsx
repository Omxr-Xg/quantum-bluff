import { useTranslation } from "react-i18next";
import { User, TrendingUp, Trophy, Target, DollarSign, Gamepad2, Home } from "lucide-react";
import { useNavigate } from "react-router";
import { QuantumBluffLogo } from "../assets/logo";
import { getUserProfile } from "../utils/userProfile";
import { HelpButton } from "../components/HelpButton";

export function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Vérifier si on vient d'une partie en cours
  const isInGame = sessionStorage.getItem("currentGame");

  // Charger les données du profil depuis localStorage
  const userProfile = getUserProfile();

  // Données exemple pour le profil
  const profileData = {
    name: userProfile.username,
    email: userProfile.email,
    avatar: userProfile.avatar,
    balance: userProfile.balance,
    totalGains: 12500,
    matchesPlayed: 87,
    matchesWon: 52,
    matchesLost: 35,
    winRate: 59.8,
    biggestWin: 2500,
    currentStreak: 3,
  };

  return (
    <div className="size-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-auto">
      <div className="max-w-6xl mx-auto p-3 sm:p-6">
        {/* Header avec bouton retour */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate("/lobby")}
              className="flex items-center gap-1 sm:gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold transition-all touch-manipulation"
            >
              <Home className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{t('profile.home')}</span>
            </button>
            {isInGame ? (
              <button
                onClick={() => {
                  const gameData = sessionStorage.getItem("currentGame");
                  if (gameData) {
                    navigate(gameData);
                  }
                }}
                className="flex items-center gap-1 sm:gap-2 bg-green-600 hover:bg-green-500 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold transition-all shadow-lg touch-manipulation"
              >
                <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{t('profile.backToGame')}</span>
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <QuantumBluffLogo className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-2xl" />
            <span className="text-xl sm:text-2xl font-bold text-white">{t('lobby.title')}</span>
          </div>
        </div>

        {/* Carte de profil principale */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl sm:rounded-2xl shadow-2xl border border-slate-700 p-5 sm:p-8 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-green-600 to-green-800 border-4 border-yellow-400 overflow-hidden flex items-center justify-center shadow-2xl mx-auto sm:mx-0">
              <img
                src={profileData.avatar}
                alt={`${profileData.name}'s avatar`}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info du profil */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">
                {profileData.name}
              </h1>
              <p className="text-gray-400 text-lg mb-4">{profileData.email}</p>
              
              {/* Badges */}
              <div className="flex gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-full border border-green-500/30">
                  <Target className="w-4 h-4" />
                  <span className="text-sm font-semibold">{t('profile.streakWins', { count: profileData.currentStreak })}</span>
                </div>
              </div>
            </div>

            {/* Colonne de droite avec bouton et solde */}
            <div className="flex flex-col gap-4 items-end">
              {/* Bouton Éditer */}
              <button 
                onClick={() => navigate("/edit-profile")}
                className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-semibold transition-all"
              >
                {t('profile.editProfile')}
              </button>

              {/* Solde actuel */}
              <div className="flex items-center gap-2 bg-green-600/20 text-green-400 px-4 py-3 rounded-xl border border-green-500/30">
                <DollarSign className="w-5 h-5" />
                <div className="flex flex-col items-end">
                  <span className="text-lg font-bold">{profileData.balance.toLocaleString()} $</span>
                  <span className="text-xs text-green-300">{t('profile.availableBalance')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistiques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Total des gains */}
          <div className="bg-gradient-to-br from-green-800 to-green-900 rounded-2xl shadow-xl border border-green-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              ${profileData.totalGains.toLocaleString()}
            </div>
            <div className="text-green-300 text-sm">{t('profile.totalGains')}</div>
          </div>

          {/* Matchs joués */}
          <div className="bg-gradient-to-br from-blue-800 to-blue-900 rounded-2xl shadow-xl border border-blue-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {profileData.matchesPlayed}
            </div>
            <div className="text-blue-300 text-sm">{t('profile.matchesPlayed')}</div>
          </div>

          {/* Matchs gagnés */}
          <div className="bg-gradient-to-br from-yellow-800 to-yellow-900 rounded-2xl shadow-xl border border-yellow-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {profileData.matchesWon}
            </div>
            <div className="text-yellow-300 text-sm">{t('profile.matchesWon')}</div>
          </div>

          {/* Matchs perdus */}
          <div className="bg-gradient-to-br from-red-800 to-red-900 rounded-2xl shadow-xl border border-red-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {profileData.matchesLost}
            </div>
            <div className="text-red-300 text-sm">{t('profile.matchesLost')}</div>
          </div>
        </div>

        {/* Statistiques détaillées */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Taux de victoire */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-xl border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">{t('profile.winRate')}</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">{t('profile.victories')}</span>
                  <span className="text-white font-semibold">{profileData.winRate}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-600 to-green-500 h-full rounded-full transition-all"
                    style={{ width: `${profileData.winRate}%` }}
                  ></div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-400">{t('profile.biggestWin')}</span>
                  <span className="text-green-400 font-bold text-lg">
                    ${profileData.biggestWin.toLocaleString()}
                  </span>
                </div>
                <div className="text-right text-xs text-gray-500">
                  vs Frank • il y a 2 semaines
                </div>
              </div>

              {/* Statistiques supplémentaires */}
              <div className="pt-4 border-t border-slate-700 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{t('profile.currentStreak')}</span>
                  <span className="text-green-400 font-semibold">{profileData.currentStreak} {t('profile.wins')}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{t('profile.bestStreak')}</span>
                  <span className="text-yellow-400 font-semibold">7 {t('profile.wins')}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{t('profile.avgGains')}</span>
                  <span className="text-blue-400 font-semibold">$144</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{t('profile.totalPlayTime')}</span>
                  <span className="text-purple-400 font-semibold">42h 15m</span>
                </div>
              </div>
            </div>
          </div>

          {/* Historique récent */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-xl border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">{t('profile.recentMatches')}</h2>
            <div className="space-y-3">
              {[
                { result: "win", opponent: "Alice", amount: 450 },
                { result: "win", opponent: "Bob", amount: 320 },
                { result: "win", opponent: "Charlie", amount: 180 },
                { result: "loss", opponent: "Diana", amount: -250 },
                { result: "loss", opponent: "Eve", amount: -400 },
              ].map((match, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        match.result === "win" ? "bg-green-500" : "bg-red-500"
                      }`}
                    ></div>
                    <span className="text-white">vs {match.opponent}</span>
                  </div>
                  <span
                    className={`font-bold ${
                      match.result === "win" ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {match.amount > 0 ? "+" : ""}${match.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bouton d'aide global */}
        <HelpButton 
          title={t('profile.profileGuideTitle')}
          sections={[
            { title: `📊 ${t('profile.statsSection')}`, content: t('profile.statsContent') },
            { title: `💰 ${t('profile.balanceSection')}`, content: t('profile.balanceContent') },
            { title: `✏️ ${t('profile.editSection')}`, content: t('profile.editContent') },
            { title: `🏆 ${t('profile.streakSection')}`, content: t('profile.streakContent') }
          ]}
        />
      </div>
    </div>
  );
}