import { UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { User } from "../services/api";
import { getPlayerAvatar } from "../utils/avatars";
import { formatFriendLastSeen } from "../utils/formatLastSeen";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { CosmeticAvatar, CosmeticTitle } from "./PlayerCosmetics";

type FriendSearchResultRowProps = {
  user: User;
  viewerUserId?: string | null;
  onAdd: (username: string) => void;
  disabled?: boolean;
  compact?: boolean;
};

function winsFor(user: User): number {
  return user.stats?.totalWins ?? user.stats?.wins ?? user.playerStats?.totalWins ?? 0;
}

function gamesFor(user: User): number {
  return user.stats?.totalGames ?? user.playerStats?.totalGames ?? 0;
}

export function FriendSearchResultRow({
  user,
  viewerUserId,
  onAdd,
  disabled = false,
  compact = false,
}: FriendSearchResultRowProps) {
  const { t } = useTranslation();
  const avatarSize = compact ? "h-11 w-11" : "h-14 w-14";
  const lastSeenLabel =
    !user.isOnline && user.lastSeenAt
      ? formatFriendLastSeen(user.lastSeenAt, t)
      : null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative shrink-0">
          <CosmeticAvatar cosmetics={user.cosmetics} sizeClass={avatarSize}>
            <div className="flex h-full w-full items-center justify-center bg-blue-950/60">
              {getPlayerAvatar(user.username, user.id, viewerUserId, user.avatarUrl) ? (
                <ImageWithFallback
                  src={getPlayerAvatar(user.username, user.id, viewerUserId, user.avatarUrl)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className={`font-bold text-white ${compact ? "text-sm" : "text-lg"}`}>
                  {user.username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </CosmeticAvatar>
          <span
            className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-slate-950 ${
              user.isOnline ? "bg-emerald-400" : "bg-slate-500"
            }`}
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-semibold text-white">{user.username}</p>
            <span className="shrink-0 rounded-full border border-blue-300/15 bg-blue-950/45 px-2 py-0.5 text-[10px] font-semibold text-blue-200">
              {t("friends.level", { level: user.level })}
            </span>
          </div>
          <CosmeticTitle cosmetics={user.cosmetics} className="mb-0.5 text-[11px] font-semibold" />
          <p className="text-xs text-slate-400">
            {t("friends.gamesCount", { count: gamesFor(user) })}
            {" · "}
            {winsFor(user)} {t("profile.wins")}
            {user.stats?.winRatePercent != null ? ` · ${user.stats.winRatePercent}%` : ""}
          </p>
          <p
            className={`mt-0.5 text-[11px] font-medium ${
              user.isOnline ? "text-emerald-300" : "text-slate-500"
            }`}
          >
            {user.isOnline
              ? t("friends.online")
              : lastSeenLabel ?? t("friends.offline")}
            {(user.mutualFriendsCount ?? 0) > 0 ? (
              <>
                {" · "}
                {t("friends.mutualFriends", { count: user.mutualFriendsCount })}
              </>
            ) : null}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onAdd(user.username)}
        disabled={disabled}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-300/20 bg-blue-950/75 px-3 py-2 text-sm font-semibold text-white transition hover:border-blue-200/30 hover:bg-blue-900/85 disabled:cursor-not-allowed disabled:opacity-50"
        title={t("friends.addAsFriend")}
      >
        <UserPlus className="h-4 w-4 shrink-0" />
        {!compact ? <span className="hidden sm:inline">{t("friends.addFriend")}</span> : null}
      </button>
    </div>
  );
}
