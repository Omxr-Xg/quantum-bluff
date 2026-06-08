import type { AppNotification } from "../services/api";

/** Montant jetons dans une notification (clés historiques + actuelles). */
export function notificationChipsLabel(payload: Record<string, unknown>): string {
  const raw = payload.chips ?? payload.rewardTokens ?? payload.amount;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw.toLocaleString();
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n)) return n.toLocaleString();
  }
  return "—";
}

export function formatGrowthNotificationMessage(
  n: AppNotification,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const p = n.payload ?? {};
  switch (n.type) {
    case "ACHIEVEMENT":
      return t("growthNotifications.achievement", {
        name: String(p.achievementId ?? p.name ?? "—"),
      });
    case "REFERRAL":
      if (p.role === "referrer") {
        return t("growthNotifications.referralReferrer", {
          username: String(p.username ?? "—"),
          chips: notificationChipsLabel(p),
        });
      }
      return t("growthNotifications.referralReferred", {
        chips: notificationChipsLabel(p),
      });
    case "DAILY_REWARD":
      return t("growthNotifications.dailyReward", {
        chips: notificationChipsLabel(p),
      });
    case "SEASON_ENDED":
      return t("growthNotifications.seasonEnded", {
        season: String(p.seasonName ?? p.season ?? "—"),
      });
    case "FRIEND_ONLINE":
      return t("growthNotifications.friendOnline", {
        username: String(p.username ?? "—"),
      });
    case "INVITATION":
      return t("growthNotifications.invitation", {
        username: String(p.username ?? "—"),
      });
    case "ADMIN_MESSAGE":
      return t("growthNotifications.adminMessage", {
        title: String(p.title ?? t("growthNotifications.adminMessageDefaultTitle")),
        body: String(p.body ?? ""),
      });
    default:
      return t("growthNotifications.generic");
  }
}
