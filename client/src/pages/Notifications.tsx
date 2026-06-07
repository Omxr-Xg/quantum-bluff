import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Bell, CheckCheck, Home, Loader2 } from "lucide-react";
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  type AppNotification,
} from "../services/api";

const profileGlassCard =
  "rounded-2xl border border-white/10 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl";
const profileMutedButton =
  "rounded-full border border-white/10 bg-white/[0.055] font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]";
const profileButton =
  "rounded-full border border-blue-300/15 bg-blue-950/75 px-4 py-2 text-sm font-semibold text-white transition hover:border-blue-200/25 hover:bg-blue-900/80 disabled:opacity-50";

function formatMessage(
  n: AppNotification,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const p = n.payload ?? {};
  switch (n.type) {
    case "ACHIEVEMENT":
      return t("growthNotifications.achievement", { name: String(p.achievementId ?? "—") });
    case "REFERRAL":
      return t("growthNotifications.referral", {
        chips: typeof p.chips === "number" ? p.chips.toLocaleString() : "—",
      });
    case "DAILY_REWARD":
      return t("growthNotifications.dailyReward", {
        chips: typeof p.chips === "number" ? p.chips.toLocaleString() : "—",
      });
    case "SEASON_ENDED":
      return t("growthNotifications.seasonEnded", { season: String(p.seasonName ?? "—") });
    case "FRIEND_ONLINE":
      return t("growthNotifications.friendOnline", { username: String(p.username ?? "—") });
    case "INVITATION":
      return t("growthNotifications.invitation", { username: String(p.username ?? "—") });
    default:
      return t("growthNotifications.generic");
  }
}

export function Notifications() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useGetNotificationsQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAll, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="relative min-h-full w-full overflow-x-hidden bg-[#020716]">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_110%_75%_at_50%_-10%,rgba(30,64,175,0.24),transparent_52%),linear-gradient(165deg,#020716_0%,#061326_46%,#02040c_100%)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-3xl min-w-0 p-3 sm:p-6">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className={`flex w-fit items-center gap-2 px-3 py-2 text-sm ${profileMutedButton}`}
            >
              <Home className="h-4 w-4" />
              {t("growthNotifications.back")}
            </button>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-white">
              <Bell className="h-7 w-7 text-cyan-300" />
              {t("growthNotifications.pageTitle")}
            </h1>
          </div>
          {unreadCount > 0 ? (
            <button
              type="button"
              disabled={markingAll}
              onClick={async () => {
                await markAll().unwrap();
                void refetch();
              }}
              className={`flex items-center gap-2 ${profileButton}`}
            >
              <CheckCheck className="h-4 w-4" />
              {t("growthNotifications.markAllRead")}
            </button>
          ) : null}
        </header>

        <section className={`p-4 sm:p-5 ${profileGlassCard}`}>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-slate-500">{t("growthNotifications.empty")}</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {items.map((n) => (
                <li key={n.id} className="py-3">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!n.readAt) {
                        await markRead(n.id).unwrap();
                      }
                    }}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      n.readAt
                        ? "border-transparent bg-transparent"
                        : "border-cyan-500/30 bg-cyan-950/20"
                    }`}
                  >
                    <p className="text-sm font-medium text-white">{formatMessage(n, t)}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(n.createdAt).toLocaleString()}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
