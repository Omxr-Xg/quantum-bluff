import { useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Calendar, Home, Loader2, MessageCircle, Phone, Trophy } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useUser } from "../hooks/useUser";
import { useVoice } from "../contexts/VoiceContext";
import { useToast } from "../contexts/ToastContext";
import { useGetFriendProfileQuery } from "../services/api";
import { getPlayerAvatar } from "../utils/avatars";

const glassCard =
  "rounded-2xl border border-white/10 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl";
const innerCard =
  "rounded-xl border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md";
const primaryBtn =
  "rounded-full border border-blue-300/15 bg-blue-950/75 font-semibold text-white shadow-lg shadow-black/20 transition hover:border-blue-200/25 hover:bg-blue-900/80";
const mutedBtn =
  "rounded-full border border-white/10 bg-white/[0.055] font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]";

function friendshipDurationLabel(
  createdAt: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const start = new Date(createdAt).getTime();
  const days = Math.max(0, Math.floor((Date.now() - start) / 86_400_000));
  if (days < 1) return t("friends.profile.friendshipLessThanDay");
  if (days < 30) return days === 1 ? t("friends.profile.friendshipOneDay") : t("friends.profile.friendshipDays", { count: days });
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? t("friends.profile.friendshipOneMonth") : t("friends.profile.friendshipMonths", { count: months });
  const years = Math.floor(months / 12);
  return years === 1 ? t("friends.profile.friendshipOneYear") : t("friends.profile.friendshipYears", { count: years });
}

export function FriendProfile() {
  const { friendId = "" } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useUser();
  const { addToast } = useToast();
  const { startPrivateCall } = useVoice();

  const { data: profile, isLoading, isError } = useGetFriendProfileQuery(friendId, {
    skip: !friendId,
  });

  const avatarSrc = useMemo(() => {
    if (!profile || !userId) return null;
    return getPlayerAvatar(profile.username, profile.id, userId, profile.avatarUrl);
  }, [profile, userId]);

  const handleCall = () => {
    if (!profile) return;
    if (!profile.isOnline) {
      addToast(t("voice.callFriendOffline", { username: profile.username }), "warning");
      return;
    }
    startPrivateCall(profile.id, profile.username, profile.avatarUrl);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center app-shell-bg">
        <Loader2 className="h-10 w-10 animate-spin text-blue-300" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="mx-auto max-w-lg p-6 app-shell-bg">
        <div className={`p-6 text-center ${glassCard}`}>
          <p className="text-red-300">{t("friends.profile.notFound")}</p>
          <button type="button" onClick={() => navigate("/friends")} className={`mt-4 px-4 py-2 ${mutedBtn}`}>
            {t("friends.profile.backToFriends")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl min-w-0 p-4 sm:p-6 app-shell-bg">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => navigate("/friends")} className={`flex items-center gap-2 px-3 py-2 text-sm ${mutedBtn}`}>
          <ArrowLeft className="h-4 w-4" />
          {t("friends.profile.backToFriends")}
        </button>
        <button type="button" onClick={() => navigate("/lobby")} className={`flex items-center gap-2 px-3 py-2 text-sm ${mutedBtn}`}>
          <Home className="h-4 w-4" />
          {t("profile.home")}
        </button>
      </div>

      <div className={`p-6 sm:p-8 ${glassCard}`}>
        <div className="mb-6 flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-6">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-300/30 bg-blue-950/60">
            {avatarSrc ? (
              <ImageWithFallback src={avatarSrc} alt="" className="h-24 w-24 rounded-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-white">{profile.username.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold text-white sm:text-3xl">{profile.username}</h1>
            <p className="mt-1 text-sm text-slate-400">{t("friends.level", { level: profile.level })}</p>
            <p className={`mt-2 text-sm font-semibold ${profile.isOnline ? "text-emerald-300" : "text-slate-500"}`}>
              {profile.isOnline ? t("friends.online") : t("friends.offline")}
            </p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className={`flex items-start gap-3 p-4 ${innerCard}`}>
            <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t("friends.profile.winRate")}
              </p>
              <p className="text-2xl font-bold text-white">{profile.stats.winRatePercent}%</p>
              <p className="mt-1 text-xs text-slate-400">
                {t("friends.profile.winRateDetail", {
                  wins: profile.stats.totalWins,
                  games: profile.stats.totalGames,
                })}
              </p>
            </div>
          </div>
          <div className={`flex items-start gap-3 p-4 ${innerCard}`}>
            <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t("friends.profile.friendshipDuration")}
              </p>
              <p className="text-lg font-bold text-white">
                {friendshipDurationLabel(profile.friendshipCreatedAt, t)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {t("friends.profile.friendsSince", {
                  date: new Date(profile.friendshipCreatedAt).toLocaleDateString(),
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              navigate(`/friends?chat=${encodeURIComponent(profile.id)}`);
            }}
            className={`flex items-center justify-center gap-2 px-4 py-3 ${primaryBtn}`}
          >
            <MessageCircle className="h-5 w-5" />
            {t("friends.chat")}
          </button>
          <button
            type="button"
            onClick={handleCall}
            disabled={!profile.isOnline}
            className="flex items-center justify-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-950/55 px-4 py-3 font-semibold text-emerald-100 transition hover:border-emerald-200/35 hover:bg-emerald-900/55 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Phone className="h-5 w-5" />
            {t("voice.callFriend")}
          </button>
        </div>
      </div>
    </div>
  );
}
