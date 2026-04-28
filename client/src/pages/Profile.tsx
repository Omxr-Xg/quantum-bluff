import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { User, TrendingUp, Trophy, Target, DollarSign, Gamepad2, Home, Award } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { QuantumBluffLogo } from "../assets/logo";
import { getUserProfile, PROFILE_CHANGED_EVENT } from "../utils/userProfile";
import { HelpButton } from "../components/HelpButton";
import { useUser } from "../hooks/useUser";
import { useGetPlayerStatsQuery } from "../services/api";
import {
  BADGE_CATALOG,
  GAMIFICATION_CHANGED_EVENT,
  readGamification,
  refreshGamificationFromServer,
} from "../utils/gamificationStorage";

function withAvatarVersion(url: string, version: number): string {
  if (!url || url.startsWith("data:")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${version}`;
}

export function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useUser();

  // Vérifier si on vient d'une partie en cours
  const isInGame = sessionStorage.getItem("currentGame");

  // Charger les données du profil depuis localStorage, puis écouter les mises à jour venant d'EditProfile.
  const [userProfile, setUserProfile] = useState(() => getUserProfile());
  const [avatarVersion, setAvatarVersion] = useState(() => Date.now());

  useEffect(() => {
    const syncProfile = () => {
      setUserProfile(getUserProfile());
      setAvatarVersion(Date.now());
    };
    syncProfile();
    window.addEventListener(PROFILE_CHANGED_EVENT, syncProfile);
    window.addEventListener("auth-changed", syncProfile);
    return () => {
      window.removeEventListener(PROFILE_CHANGED_EVENT, syncProfile);
      window.removeEventListener("auth-changed", syncProfile);
    };
  }, [location.key]);

  const { data: stats } = useGetPlayerStatsQuery(userId ?? "", {
    skip: !userId,
    refetchOnMountOrArgChange: true,
  });

  const [gam, setGam] = useState(() => readGamification());
  useEffect(() => {
    void refreshGamificationFromServer().then(() => setGam({ ...readGamification() }));
    const onG = () => setGam({ ...readGamification() });
    window.addEventListener(GAMIFICATION_CHANGED_EVENT, onG);
    return () => window.removeEventListener(GAMIFICATION_CHANGED_EVENT, onG);
  }, []);

  const totalGames = stats?.totalGames ?? 0;
  const totalWins = stats?.totalWins ?? 0;
  const totalLosses = stats?.totalLosses ?? Math.max(0, totalGames - totalWins);
  const winRate = stats?.winRate ?? 0;
  const biggestWin = stats?.biggestWin ?? 0;
  const totalChipsWon = stats?.totalChipsWon ?? 0;
  const _totalChipsLost = stats?.totalChipsLost ?? 0;
  // Total winnings = somme des gains bruts (sans soustraire les pertes)
  const totalGains = totalChipsWon;
  const currentStreak = stats?.totalWins ?? 0; // approximation faute de champ dédié

  const profileData = {
    name: userProfile.username,
    email: userProfile.email,
    avatar: withAvatarVersion(userProfile.avatar, avatarVersion),
    balance: userProfile.balance,
    totalGains,
    matchesPlayed: totalGames,
    matchesWon: totalWins,
    matchesLost: totalLosses,
    winRate: Number.isFinite(winRate) ? Number(winRate) : 0,
    biggestWin,
    currentStreak,
  };

  return (
    <div className="size-full app-shell-bg overflow-auto">
      <div className="w-full min-w-0 p-3 sm:p-6">
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
                {typeof gam.level === "number" && (
                  <div className="flex items-center gap-2 bg-amber-500/20 text-amber-200 px-4 py-2 rounded-full border border-amber-500/40">
                    <Trophy className="w-4 h-4" />
                    <span className="text-sm font-semibold">
                      {t("gamification.levelShort", { level: gam.level })}
                    </span>
                  </div>
                )}
              </div>
              {(typeof gam.experience === "number" || typeof gam.xpToNext === "number") && (
                <p className="text-slate-400 text-sm mt-3">
                  {t("gamification.xpLine", {
                    xp: gam.experience ?? 0,
                    toNext: gam.xpToNext ?? 0,
                  })}
                </p>
              )}
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

        <div className="bg-slate-800/80 border border-slate-600 rounded-2xl p-5 sm:p-6 mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-amber-400" />
            {t("gamification.badgesTitle")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {BADGE_CATALOG.map((b) => {
              const unlocked = gam.badges?.includes(b.id) ?? false;
              return (
                <div
                  key={b.id}
                  className={`rounded-xl border px-3 py-3 text-center ${
                    unlocked
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-100"
                      : "border-slate-600 bg-slate-900/50 text-slate-500"
                  }`}
                >
                  <p className="text-xs font-bold truncate">{t(`gamification.badge.${b.id}.name`)}</p>
                  <p className="text-[10px] mt-1 opacity-80">
                    {unlocked
                      ? t("gamification.badgeUnlocked")
                      : t("gamification.badgeLocked", { level: b.minLevel })}
                  </p>
                </div>
              );
            })}
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
                  <span className="text-white font-semibold">{Number(profileData.winRate).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-600 to-green-500 h-full rounded-full transition-all"
                    style={{ width: `${Number(profileData.winRate).toFixed(1)}%` }}
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
              </div>
            </div>
          </div>

          {/* Historique récent (résumé global basé sur les stats) */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-xl border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">{t('profile.recentMatches')}</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div className="flex flex-col">
                  <span className="text-white font-semibold">{t('profile.matchesPlayed')}</span>
                  <span className="text-gray-400 text-xs">{t('profile.matchesWon')}/{t('profile.matchesLost')}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-green-400 font-bold">
                    {profileData.matchesWon} {t('profile.wins')}
                  </div>
                  <div className="text-sm text-red-400 font-bold">
                    {profileData.matchesLost} {t('profile.matchesLost')}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div className="flex flex-col">
                  <span className="text-white font-semibold">{t('profile.totalGains')}</span>
                  <span className="text-gray-400 text-xs">({t('profile.matchesPlayed')})</span>
                </div>
                <span className={`font-bold ${profileData.totalGains >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {profileData.totalGains >= 0 ? "+" : ""}${profileData.totalGains.toLocaleString()}
                </span>
              </div>
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
