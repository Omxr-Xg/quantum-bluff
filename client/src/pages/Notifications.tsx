import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Bell, CheckCheck, Home, Loader2, Sparkles } from "lucide-react";
import {
  formatGrowthNotificationMessage,
  cosmeticGiftOfferIdFromNotification,
} from "../utils/notificationPayload";
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  type AppNotification,
} from "../services/api";
import { CosmeticGiftOfferModal } from "../components/CosmeticGiftOfferModal";

const profileGlassCard =
  "rounded-2xl border border-white/10 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl";
const profileMutedButton =
  "rounded-full border border-white/10 bg-white/[0.055] font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]";
const profileButton =
  "rounded-full border border-blue-300/15 bg-blue-950/75 px-4 py-2 text-sm font-semibold text-white transition hover:border-blue-200/25 hover:bg-blue-900/80 disabled:opacity-50";

function isAdminMessage(n: AppNotification): boolean {
  return n.type === "ADMIN_MESSAGE";
}

function isCosmeticGift(n: AppNotification): boolean {
  return n.type === "COSMETIC_GIFT";
}

export function Notifications() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useGetNotificationsQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAll, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const handleItemClick = async (n: AppNotification) => {
    if (!n.readAt) {
      try {
        await markRead(n.id).unwrap();
      } catch {
        /* ignore */
      }
    }
    const offerId = cosmeticGiftOfferIdFromNotification(n);
    if (offerId) {
      setActiveOfferId(offerId);
      return;
    }
  };

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
          <button
            type="button"
            disabled={markingAll || unreadCount === 0}
            onClick={async () => {
              await markAll().unwrap();
              void refetch();
            }}
            className={`flex items-center gap-2 ${profileButton}`}
          >
            <CheckCheck className="h-4 w-4" />
            {t("growthNotifications.markAllRead")}
          </button>
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
                    onClick={() => void handleItemClick(n)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition hover:border-amber-400/30 ${
                      n.readAt
                        ? "border-transparent bg-transparent"
                        : "border-cyan-500/30 bg-cyan-950/20"
                    }`}
                  >
                    {isCosmeticGift(n) ? (
                      <>
                        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-300/90">
                          <Sparkles className="h-3.5 w-3.5" />
                          {t("cosmeticGift.inboxBadge")}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {formatGrowthNotificationMessage(n, t)}
                        </p>
                        <p className="mt-1 text-xs text-amber-200/70">{t("cosmeticGift.tapToOpen")}</p>
                      </>
                    ) : isAdminMessage(n) ? (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/90">
                          {t("growthNotifications.adminBadge")}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {String(n.payload?.title ?? t("growthNotifications.adminMessageDefaultTitle"))}
                        </p>
                        <p className="mt-1 text-sm text-slate-300 whitespace-pre-wrap">
                          {String(n.payload?.body ?? "")}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm font-medium text-white">
                        {formatGrowthNotificationMessage(n, t)}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">{new Date(n.createdAt).toLocaleString()}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {activeOfferId && (
        <CosmeticGiftOfferModal
          offerId={activeOfferId}
          onClose={() => setActiveOfferId(null)}
          onResolved={() => void refetch()}
        />
      )}
    </div>
  );
}
