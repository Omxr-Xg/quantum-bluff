import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { Bell, Loader2 } from "lucide-react";
import { cn } from "./ui/utils";
import { useUser } from "../hooks/useUser";
import { useSocket } from "../hooks/useSocket";
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  type AppNotification,
} from "../services/api";
import { trackEvent } from "../utils/analytics";

const NAV_BTN =
  "relative inline-flex aspect-square h-9 min-h-9 w-9 min-w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-950/65 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_22px_rgba(0,0,0,0.24)] backdrop-blur-md transition hover:border-white/20 hover:bg-slate-800/80 hover:text-white md:h-11 md:min-h-11 md:w-11 md:min-w-11";
const NAV_BELL = "h-[1.05rem] w-[1.05rem] md:h-[1.15rem] md:w-[1.15rem]";
const GAME_HUD_BTN =
  "relative flex aspect-square h-7 min-h-7 w-7 min-w-7 shrink-0 items-center justify-center rounded-full border-2 border-slate-500 bg-slate-700 text-white shadow-lg transition hover:bg-slate-600 sm:h-8 sm:min-h-8 sm:w-8 sm:min-w-8 md:h-9 md:min-h-9 md:w-9 md:min-w-9";

type NotificationBellProps = {
  variant?: "nav" | "gameHud";
};

function formatNotificationMessage(
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
      return t("growthNotifications.referral", {
        chips: typeof p.chips === "number" ? p.chips.toLocaleString() : "—",
      });
    case "DAILY_REWARD":
      return t("growthNotifications.dailyReward", {
        chips: typeof p.chips === "number" ? p.chips.toLocaleString() : "—",
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
    default:
      return t("growthNotifications.generic");
  }
}

export function NotificationBell({ variant = "nav" }: NotificationBellProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useUser();
  const { socket } = useSocket();

  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; right: number } | null>(null);

  const { data, isLoading, refetch } = useGetNotificationsQuery(undefined, {
    skip: !userId,
    pollingInterval: 60_000,
  });
  const [markRead] = useMarkNotificationReadMutation();

  const unreadCount = data?.unreadCount ?? 0;
  const items = data?.items ?? [];
  const previewItems = items.slice(0, 8);

  useEffect(() => {
    if (!socket) return;
    const onNew = (payload?: { type?: string; payload?: { achievementId?: string } }) => {
      if (payload?.type === "ACHIEVEMENT") {
        const achievement = payload.payload?.achievementId;
        if (achievement) {
          trackEvent("achievement_unlocked", { achievement });
        }
      }
      void refetch();
    };
    socket.on("NOTIFICATION_NEW", onNew);
    return () => {
      socket.off("NOTIFICATION_NEW", onNew);
    };
  }, [socket, refetch]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const panelW = Math.min(320, window.innerWidth - 16);
      const rawRight = window.innerWidth - rect.right;
      const right = Math.max(8, Math.min(window.innerWidth - 8 - panelW, rawRight));
      setPanelPos({ top: rect.bottom + 8, right });
    }
    setOpen((o) => !o);
  };

  const handleItemClick = async (n: AppNotification) => {
    if (!n.readAt) {
      try {
        await markRead(n.id).unwrap();
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
    navigate("/notifications");
  };

  if (!userId) return null;

  const dropdown =
    open &&
    panelPos &&
    createPortal(
      <div
        ref={dropdownRef}
        style={{
          position: "fixed",
          top: panelPos.top,
          right: panelPos.right,
          zIndex: 9998,
          width: "min(20rem, calc(100vw - 1rem))",
        }}
        className="max-h-[400px] overflow-y-auto rounded-xl border border-slate-600 bg-slate-800 shadow-2xl"
      >
        <div className="sticky top-0 border-b border-slate-600 bg-slate-800 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <Bell className="h-4 w-4" />
            {t("growthNotifications.title")}
          </h3>
        </div>

        <div className="p-2">
          {isLoading ? (
            <div className="flex justify-center py-8 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : previewItems.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{t("growthNotifications.empty")}</p>
          ) : (
            <ul className="space-y-2">
              {previewItems.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void handleItemClick(n)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left transition hover:bg-slate-700/60 ${
                      n.readAt
                        ? "border-slate-600/60 bg-slate-800/40"
                        : "border-cyan-500/35 bg-cyan-950/25"
                    }`}
                  >
                    <p className="text-sm text-white">{formatNotificationMessage(n, t)}</p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
            className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-cyan-200 transition hover:bg-white/10"
          >
            {t("growthNotifications.viewAll")}
          </button>
        </div>
      </div>,
      document.body,
    );

  const isGameHud = variant === "gameHud";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={isGameHud ? GAME_HUD_BTN : NAV_BTN}
        title={t("growthNotifications.title")}
        aria-label={t("growthNotifications.title")}
      >
        <Bell className={cn("shrink-0", NAV_BELL)} strokeWidth={2.25} />
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex h-[18px] min-w-[18px] translate-x-1/3 -translate-y-1/3 items-center justify-center rounded-full bg-cyan-500 px-1 text-xs font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {dropdown}
    </>
  );
}
