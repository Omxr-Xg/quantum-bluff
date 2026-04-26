import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { Bell, Gamepad2, UserPlus, Check, X, MessageCircle } from "lucide-react";
import { cn } from "./ui/utils";
import { useSocket } from "../hooks/useSocket";
import { useInvitationAccept } from "../contexts/InvitationAcceptContext";
import { useUser } from "../hooks/useUser";
import { useGetFriendRequestsQuery, useRespondToFriendRequestMutation } from "../services/api";
import { apiUrl } from "../utils/apiBase";

interface UnreadMessage {
  senderId: string;
  senderUsername: string;
  content: string;
  timestamp: number;
}

/** Même gabarit que Profil / Amis / Classement (Layout `menuContent`) */
const NAV_BTN =
  "relative inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-slate-600/80 px-2 text-sm font-medium text-white transition hover:bg-slate-500 sm:gap-2 sm:px-3 md:h-12";
/** À côté du bouton Réglages en partie (coin fixe) */
const GAME_HUD_BTN =
  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-slate-500 bg-slate-700 text-white shadow-lg transition hover:bg-slate-600";

type NotificationCenterProps = {
  variant?: "nav" | "gameHud";
};

export function NotificationCenter({ variant = "nav" }: NotificationCenterProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useUser();

  const { pendingInvitations, dismissInvitation, socket } = useSocket();
  const { requestAccept } = useInvitationAccept();

  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; right: number } | null>(null);
  const [unreadMessages, setUnreadMessages] = useState<UnreadMessage[]>([]);

  const { data: friendRequests, refetch: refetchRequests } = useGetFriendRequestsQuery(
    userId ?? "",
    { skip: !userId, refetchOnMountOrArgChange: true }
  );

  const [respondRequest] = useRespondToFriendRequestMutation();

  const pendingFriendRequests = friendRequests?.filter((r) => r.status === "PENDING") ?? [];
  const totalCount = pendingInvitations.length + pendingFriendRequests.length + unreadMessages.length;

  // Refetch triggered by other parts of the app
  useEffect(() => {
    const handler = () => refetchRequests();
    window.addEventListener("refetch-requests", handler);
    return () => window.removeEventListener("refetch-requests", handler);
  }, [refetchRequests]);

  // Refetch on incoming socket friend events; collect unread messages
  useEffect(() => {
    if (!socket) return;

    const handleFriendRequest = () => { refetchRequests(); };
    const handleFriendAccepted = () => { refetchRequests(); };

    const handleFriendMessage = (data: {
      senderId: string;
      sender?: { username?: string };
      content?: string;
    }) => {
      // Suppress when already viewing that conversation
      const params = new URLSearchParams(window.location.search);
      const alreadyViewing =
        window.location.pathname === "/friends" &&
        params.get("tab") === "messages" &&
        params.get("with") === data.senderId;
      if (alreadyViewing) return;

      setUnreadMessages((prev) => {
        const filtered = prev.filter((m) => m.senderId !== data.senderId);
        return [
          ...filtered,
          {
            senderId: data.senderId,
            senderUsername: data.sender?.username ?? "?",
            content: data.content ?? "",
            timestamp: Date.now(),
          },
        ];
      });
    };

    socket.on("FRIEND_REQUEST_RECEIVED", handleFriendRequest);
    socket.on("FRIEND_REQUEST_ACCEPTED", handleFriendAccepted);
    socket.on("FRIEND_MESSAGE", handleFriendMessage);
    return () => {
      socket.off("FRIEND_REQUEST_RECEIVED", handleFriendRequest);
      socket.off("FRIEND_REQUEST_ACCEPTED", handleFriendAccepted);
      socket.off("FRIEND_MESSAGE", handleFriendMessage);
    };
  }, [socket, refetchRequests]);

  // Clear unread messages for a sender when navigating to their conversation
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (location.pathname === "/friends" && params.get("tab") === "messages") {
      const withId = params.get("with");
      if (withId) {
        setUnreadMessages((prev) => prev.filter((m) => m.senderId !== withId));
      }
    }
  }, [location]);

  // Close the panel on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Open panel when a toast's onClick fires the custom event
  useEffect(() => {
    const handler = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const panelW = Math.min(320, window.innerWidth - 16);
        const rawRight = window.innerWidth - rect.right;
        const right = Math.max(8, Math.min(window.innerWidth - 8 - panelW, rawRight));
        setPanelPos({ top: rect.bottom + 8, right });
      }
      setOpen(true);
    };
    window.addEventListener("open-notification-panel", handler);
    return () => window.removeEventListener("open-notification-panel", handler);
  }, []);

  // Close when clicking outside both the button and the portaled dropdown
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  // Calculate fixed position from button rect; clamp so panel stays fully on-screen
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

  const handleAcceptInvitation = (inv: {
    invitationId: string;
    roomId: string;
    roomName: string;
    sender: { id?: string; username: string };
    game?: "blackjack" | "poker";
  }) => {
    requestAccept({
      invitationId: inv.invitationId,
      roomId: inv.roomId,
      roomName: inv.roomName,
      sender: { id: inv.sender.id ?? "", username: inv.sender.username },
      game: inv.game,
    });
    setOpen(false);
  };

  const handleRejectInvitation = async (inv: { invitationId: string; game?: string }) => {
    try {
      const token = localStorage.getItem("token");
      const isBj = inv.game === "blackjack";
      const url = apiUrl(
        isBj
          ? `/api/blackjack-tables/invitations/${inv.invitationId}/reject`
          : `/api/friends/${inv.invitationId}/reject`
      );
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
    } catch {
      /* best effort */
    }
    dismissInvitation(inv.invitationId);
  };

  const handleAcceptFriendRequest = async (requestId: string) => {
    await respondRequest({ requestId, status: "ACCEPTED" });
    refetchRequests();
  };

  const handleRejectFriendRequest = async (requestId: string) => {
    await respondRequest({ requestId, status: "REJECTED" });
    refetchRequests();
  };

  const handleOpenChat = (msg: UnreadMessage) => {
    navigate(`/friends?tab=messages&with=${msg.senderId}`);
    setUnreadMessages((prev) => prev.filter((m) => m.senderId !== msg.senderId));
    setOpen(false);
  };

  if (!userId) return null;

  const dropdown = open && panelPos && createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: panelPos.top,
        right: panelPos.right,
        zIndex: 9999,
        width: "min(20rem, calc(100vw - 1rem))",
      }}
      className="max-h-[400px] overflow-y-auto bg-slate-800 border border-slate-600 rounded-xl shadow-2xl"
    >
      <div className="sticky top-0 bg-slate-800 px-4 py-3 border-b border-slate-600">
        <h3 className="text-white font-bold text-sm flex items-center gap-2">
          <Bell className="w-4 h-4" />
          {t("notifications.title")}
        </h3>
      </div>

      <div className="p-2">
        {totalCount === 0 ? (
          <p className="text-slate-400 text-sm py-6 text-center">
            {t("notifications.empty")}
          </p>
        ) : (
          <>
            {/* GAME INVITATIONS */}
            {pendingInvitations.length > 0 && (
              <div className="mb-2">
                <p className="text-slate-400 text-xs font-semibold uppercase mb-1 px-2 flex items-center gap-1">
                  <Gamepad2 className="w-3 h-3" />
                  {t("notifications.gameInvitations")}
                </p>

                {pendingInvitations.map((inv) => (
                  <div
                    key={inv.invitationId}
                    className="flex items-start gap-2 p-3 mb-2 bg-indigo-900/30 border border-indigo-500/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {t("invitation.title", { username: inv.sender.username })}
                      </p>

                      <p className="text-indigo-300/80 text-xs truncate flex items-center gap-1">
                        {inv.game === 'blackjack' ? '🃏 Blackjack' : '♠️ Texas Hold\'em'} — {inv.roomName}
                      </p>

                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleAcceptInvitation(inv)}
                          className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded"
                        >
                          <Check className="w-3 h-3" />
                          {t("invitation.accept")}
                        </button>

                        <button
                          onClick={() => handleRejectInvitation(inv)}
                          className="flex items-center gap-1 px-2 py-1 bg-red-600/80 hover:bg-red-500 text-white text-xs rounded"
                        >
                          <X className="w-3 h-3" />
                          {t("invitation.reject")}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* FRIEND REQUESTS */}
            {pendingFriendRequests.length > 0 && (
              <div className="mb-2">
                <p className="text-slate-400 text-xs font-semibold uppercase mb-1 px-2 flex items-center gap-1">
                  <UserPlus className="w-3 h-3" />
                  {t("notifications.friendRequests")}
                </p>

                {pendingFriendRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between gap-2 p-3 mb-2 bg-slate-700/50 border border-slate-600 rounded-lg"
                  >
                    <p className="text-white text-sm truncate flex-1">
                      {t("toast.friendRequestFrom", {
                        username: req.sender?.username ?? "?",
                      })}
                    </p>

                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleAcceptFriendRequest(req.id)}
                        className="p-1.5 bg-green-600 hover:bg-green-500 rounded text-white"
                      >
                        <Check className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleRejectFriendRequest(req.id)}
                        className="p-1.5 bg-red-600/80 hover:bg-red-500 rounded text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* UNREAD MESSAGES */}
            {unreadMessages.length > 0 && (
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase mb-1 px-2 flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  {t("notifications.messages")}
                </p>

                {unreadMessages.map((msg) => (
                  <div
                    key={msg.senderId}
                    className="flex items-center justify-between gap-2 p-3 mb-2 bg-slate-700/50 border border-slate-600 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{msg.senderUsername}</p>
                      <p className="text-slate-400 text-xs truncate">
                        {msg.content.length > 50 ? msg.content.slice(0, 50) + "…" : msg.content}
                      </p>
                    </div>

                    <button
                      onClick={() => handleOpenChat(msg)}
                      className="shrink-0 flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded"
                    >
                      <MessageCircle className="w-3 h-3" />
                      {t("notifications.chat")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  );

  const isGameHud = variant === "gameHud";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={isGameHud ? GAME_HUD_BTN : NAV_BTN}
        title={t("notifications.title")}
      >
        <Bell
          className={cn("shrink-0", isGameHud ? "h-6 w-6" : "h-4 w-4")}
          strokeWidth={2.25}
        />
        {!isGameHud ? (
          <span className="hidden lg:inline">{t("notifications.title")}</span>
        ) : null}

        {totalCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
            {totalCount > 99 ? "99+" : totalCount}
          </span>
        )}
      </button>
      {dropdown}
    </>
  );
}
