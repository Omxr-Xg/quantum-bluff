import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { User, TrendingUp, Trophy, Target, DollarSign, Home, Award, ShoppingBag, BarChart3 } from "lucide-react";
import { useLocation, useNavigate, Link } from "react-router";
import { getUserProfile, PROFILE_CHANGED_EVENT } from "../utils/userProfile";
import { HelpButton } from "../components/HelpButton";
import { ReferralSection } from "../components/ReferralSection";
import { DiscreteAdSlot } from "../components/ads/DiscreteAdSlot";
import { useUser } from "../hooks/useUser";
import { useGetPlayerStatsQuery, useGetShopCosmeticsQuery, useGetShopLoadoutQuery } from "../services/api";
import {
  BADGE_CATALOG,
  MANUAL_ONLY_BADGE_IDS,
  GAMIFICATION_CHANGED_EVENT,
  readGamification,
  refreshGamificationFromServer,
} from "../utils/gamificationStorage";
import { CosmeticAvatar } from "../components/PlayerCosmetics";
import { parseBannerStyleJson } from "../utils/bannerStyle";
import { resolvePublicCosmeticsFromShop } from "../utils/publicCosmetics";

function withAvatarVersion(url: string, version: number): string {
  if (!url || url.startsWith("data:")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${version}`;
}

const profileGlassCard =
  "rounded-2xl border border-white/10 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl";
const profileInnerCard =
  "rounded-xl border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md";
const profileButton =
  "rounded-full border border-blue-300/15 bg-blue-950/75 font-semibold text-white shadow-lg shadow-black/20 transition hover:border-blue-200/25 hover:bg-blue-900/80";
const profileMutedButton =
  "rounded-full border border-white/10 bg-white/[0.055] font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]";

export function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useUser();

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

  const { data: loadout } = useGetShopLoadoutQuery(undefined, { skip: !userId });
  const { data: shopData } = useGetShopCosmeticsQuery(undefined, { skip: !userId });

  const equippedTitle = shopData?.items.find((i) => i.id === loadout?.titleId);
  const equippedBanner = shopData?.items.find((i) => i.id === loadout?.bannerId);
  const profileCosmetics = resolvePublicCosmeticsFromShop(shopData?.items, loadout);

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

  const winRatePct = Math.max(0, Math.min(100, Number(profileData.winRate) || 0));
  const metricCards = [
    {
      label: t("profile.totalGains"),
      value: `$${profileData.totalGains.toLocaleString()}`,
      Icon: DollarSign,
      iconClass: "border-emerald-300/20 bg-emerald-400/12 text-emerald-200",
      accentClass: "text-emerald-200",
      HelperIcon: TrendingUp,
    },
    {
      label: t("profile.matchesPlayed"),
      value: profileData.matchesPlayed.toLocaleString(),
      Icon: Target,
      iconClass: "border-blue-300/20 bg-blue-400/12 text-blue-200",
      accentClass: "text-blue-200",
    },
    {
      label: t("profile.matchesWon"),
      value: profileData.matchesWon.toLocaleString(),
      Icon: Trophy,
      iconClass: "border-amber-300/20 bg-amber-400/12 text-amber-200",
      accentClass: "text-amber-200",
    },
    {
      label: t("profile.matchesLost"),
      value: profileData.matchesLost.toLocaleString(),
      Icon: User,
      iconClass: "border-rose-300/20 bg-rose-400/12 text-rose-200",
      accentClass: "text-rose-200",
    },
  ];

  return (
    <div className="relative min-h-full w-full overflow-x-hidden bg-[#020716]">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_110%_75%_at_50%_-10%,rgba(30,64,175,0.24),transparent_52%),radial-gradient(ellipse_80%_60%_at_100%_40%,rgba(14,116,144,0.10),transparent_48%),linear-gradient(165deg,#020716_0%,#061326_46%,#02040c_100%)]" />
        <div className="absolute -top-28 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-blue-950/40 blur-[120px]" />
        <div className="absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-cyan-700/10 blur-[90px]" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-indigo-950/28 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.26) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.08),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(15,23,42,0.55),transparent_58%)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl min-w-0 p-3 sm:p-6">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col items-start gap-3">
            <button
              type="button"
              onClick={() => navigate("/lobby")}
              className={`flex w-fit touch-manipulation items-center justify-center gap-2 px-3 py-2 text-sm sm:px-4 ${profileMutedButton}`}
            >
              <Home className="h-4 w-4" />
              <span>{t("profile.home")}</span>
            </button>
            <h1 className="bg-gradient-to-r from-slate-100 via-blue-200 to-cyan-200 bg-clip-text text-3xl font-bold text-transparent sm:text-5xl">
              {t("nav.profile")}
            </h1>
          </div>
        </header>

        <section className={`mb-5 overflow-hidden p-5 sm:p-7 ${profileGlassCard}`}>
          {equippedBanner ? (
            <div className="relative mb-4 aspect-[2/1] w-full overflow-hidden rounded-xl border border-white/10">
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                  backgroundImage: parseBannerStyleJson(equippedBanner.styleJson).background,
                  backgroundColor: "#334155",
                }}
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(2,6,23,0.12) 0%, rgba(2,6,23,0.32) 100%)",
                }}
                aria-hidden
              />
            </div>
          ) : null}
          <div className="flex flex-col items-center gap-5 text-center md:flex-row md:items-start md:text-left">
            <div className="relative shrink-0">
              <CosmeticAvatar
                cosmetics={profileCosmetics}
                sizeClass="h-28 w-28 sm:h-32 sm:w-32"
                className="bg-blue-950/55 shadow-[0_0_44px_rgba(59,130,246,0.20)]"
              >
                <img
                  src={profileData.avatar}
                  alt={`${profileData.name}'s avatar`}
                  className="h-full w-full object-cover"
                />
              </CosmeticAvatar>
              {typeof gam.level === "number" ? (
                <div className="absolute -bottom-2 left-1/2 flex min-w-[5.25rem] -translate-x-1/2 items-center justify-center gap-1 whitespace-nowrap rounded-full border border-amber-300/25 bg-slate-950/90 px-3 py-1 text-[0.65rem] font-bold text-amber-100 shadow-lg">
                  <Trophy className="h-3 w-3" />
                  {t("gamification.levelShort", { level: gam.level })}
                </div>
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-3xl font-bold text-white sm:text-4xl">{profileData.name}</h2>
              {equippedTitle ? (
                <p
                  className="mt-1 text-sm font-semibold"
                  style={{
                    color: (() => {
                      try {
                        return JSON.parse(equippedTitle.styleJson).color as string;
                      } catch {
                        return "#67e8f9";
                      }
                    })(),
                  }}
                >
                  {t(equippedTitle.nameKey)}
                </p>
              ) : null}
              <p className="mt-1 truncate text-base text-slate-400 sm:text-lg">{profileData.email}</p>

              <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
                <div className="flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200">
                  <Target className="h-4 w-4" />
                  {t("profile.streakWins", { count: profileData.currentStreak })}
                </div>
                {(typeof gam.experience === "number" || typeof gam.xpToNext === "number") ? (
                  <div className="rounded-full border border-blue-300/15 bg-blue-950/45 px-4 py-2 text-sm font-semibold text-blue-100">
                    {t("gamification.xpLine", {
                      xp: gam.experience ?? 0,
                      toNext: gam.xpToNext ?? 0,
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 md:w-auto md:items-end">
              <div className="flex flex-wrap justify-center gap-2 md:justify-end">
                <Link
                  to="/achievements"
                  className={`flex items-center gap-2 px-4 py-2 text-sm ${profileMutedButton}`}
                >
                  <Award className="h-4 w-4" />
                  {t("profile.linkAchievements")}
                </Link>
                <Link
                  to="/shop"
                  className={`flex items-center gap-2 px-4 py-2 text-sm ${profileMutedButton}`}
                >
                  <ShoppingBag className="h-4 w-4" />
                  {t("profile.linkShop")}
                </Link>
                <Link
                  to="/history"
                  className={`flex items-center gap-2 px-4 py-2 text-sm ${profileMutedButton}`}
                >
                  <BarChart3 className="h-4 w-4" />
                  {t("profile.linkHistory")}
                </Link>
              </div>
              <button
                type="button"
                onClick={() => navigate("/edit-profile")}
                className={`flex justify-center px-6 py-3 ${profileButton}`}
              >
                {t("profile.editProfile")}
              </button>
              <div className="flex items-center justify-between gap-3 rounded-full border border-amber-300/20 bg-slate-950/55 px-4 py-3 text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <DollarSign className="h-5 w-5 text-amber-200" />
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums">{profileData.balance.toLocaleString()} $</p>
                  <p className="text-xs text-slate-400">{t("profile.availableBalance")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <ReferralSection />

        <DiscreteAdSlot placement="profile-inline" className="mb-5" />

        <section className={`mb-5 p-5 sm:p-6 ${profileGlassCard}`}>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
            <Award className="h-5 w-5 text-amber-200" />
            {t("gamification.badgesTitle")}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {BADGE_CATALOG.map((badge) => {
              const unlocked = gam.badges?.includes(badge.id) ?? false;
              return (
                <div
                  key={badge.id}
                  className={`rounded-xl border px-3 py-3 text-center transition ${
                    unlocked
                      ? "border-amber-300/30 bg-amber-400/10 text-amber-100"
                      : "border-white/10 bg-slate-950/35 text-slate-500"
                  }`}
                >
                  <p className="truncate text-xs font-bold">{t(`gamification.badge.${badge.id}.name`)}</p>
                  <p className="mt-1 text-[10px] opacity-80">
                    {unlocked
                      ? t("gamification.badgeUnlocked")
                      : MANUAL_ONLY_BADGE_IDS.has(badge.id)
                        ? t("gamification.badgeEventLocked")
                        : t("gamification.badgeLocked", { level: badge.minLevel })}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metricCards.map(({ label, value, Icon, HelperIcon, iconClass, accentClass }) => (
            <div key={label} className={`p-5 ${profileGlassCard}`}>
              <div className="mb-4 flex items-center justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-full border ${iconClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                {HelperIcon ? <HelperIcon className={`h-5 w-5 ${accentClass}`} /> : null}
              </div>
              <p className="text-3xl font-bold text-white">{value}</p>
              <p className={`mt-1 text-sm ${accentClass}`}>{label}</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className={`p-5 sm:p-6 ${profileGlassCard}`}>
            <h2 className="mb-4 text-xl font-bold text-white">{t("profile.winRate")}</h2>
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-slate-400">{t("profile.victories")}</span>
                  <span className="font-semibold text-white">{winRatePct.toFixed(1)}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-950/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-300 to-emerald-300 transition-all"
                    style={{ width: `${winRatePct}%` }}
                  />
                </div>
              </div>

              <div className={`space-y-3 p-4 ${profileInnerCard}`}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{t("profile.biggestWin")}</span>
                  <span className="text-lg font-bold text-emerald-200">
                    ${profileData.biggestWin.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{t("profile.currentStreak")}</span>
                  <span className="font-semibold text-emerald-200">
                    {profileData.currentStreak} {t("profile.wins")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={`p-5 sm:p-6 ${profileGlassCard}`}>
            <h2 className="mb-4 text-xl font-bold text-white">{t("profile.recentMatches")}</h2>
            <div className="space-y-3">
              <div className={`flex items-center justify-between p-4 ${profileInnerCard}`}>
                <div className="min-w-0">
                  <p className="font-semibold text-white">{t("profile.matchesPlayed")}</p>
                  <p className="text-xs text-slate-400">
                    {t("profile.matchesWon")} / {t("profile.matchesLost")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-200">
                    {profileData.matchesWon} {t("profile.wins")}
                  </p>
                  <p className="text-sm font-bold text-rose-200">
                    {profileData.matchesLost} {t("profile.matchesLost")}
                  </p>
                </div>
              </div>
              <div className={`flex items-center justify-between p-4 ${profileInnerCard}`}>
                <div className="min-w-0">
                  <p className="font-semibold text-white">{t("profile.totalGains")}</p>
                  <p className="text-xs text-slate-400">{t("profile.matchesPlayed")}</p>
                </div>
                <span className={`font-bold ${profileData.totalGains >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                  {profileData.totalGains >= 0 ? "+" : ""}${profileData.totalGains.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </section>

        <HelpButton
          title={t("profile.profileGuideTitle")}
          sections={[
            { title: t("profile.statsSection"), content: t("profile.statsContent") },
            { title: t("profile.balanceSection"), content: t("profile.balanceContent") },
            { title: t("profile.editSection"), content: t("profile.editContent") },
            { title: t("profile.streakSection"), content: t("profile.streakContent") },
          ]}
        />
      </div>
    </div>
  );
}
