import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Bell, Gamepad2, UserPlus, Check, X } from "lucide-react";
import { useSocket } from "../hooks/useSocket";
import { useUser } from "../hooks/useUser";
import { useGetFriendRequestsQuery, useRespondToFriendRequestMutation } from "../services/api";
import { apiUrl } from "../utils/apiBase";

export function NotificationCenter() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useUser();

  
  const { pendingInvitations, dismissInvitation, socket } = useSocket();

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: friendRequests, refetch: refetchRequests } = useGetFriendRequestsQuery(userId ?? "", {
    skip: !userId,
  });

  const [respondRequest] = useRespondToFriendRequestMutation();

  const pendingFriendRequests = friendRequests?.filter((r) => r.status === "PENDING") ?? [];

  const totalCount = pendingInvitations.length + pendingFriendRequests.length;

  
  useEffect(() => {
    const handler = () => refetchRequests();
    window.addEventListener("refetch-requests", handler);
    return () => window.removeEventListener("refetch-requests", handler);
  }, [refetchRequests]);

  
  useEffect(() => {
    if (!socket) return;

    const handleFriendRequest = () => {
      refetchRequests();
    };

    const handleFriendAccepted = () => {
      refetchRequests();
    };

    const handlePlayerStatus = () => {
      // future use (optionnel)
    };

    socket.on("friend_request", handleFriendRequest);
    socket.on("friend_request_received", handleFriendRequest);
    socket.on("friend_request_accepted", handleFriendAccepted);

    socket.on("player_connected", handlePlayerStatus);
    socket.on("player_disconnected", handlePlayerStatus);

    return () => {
      socket.off("friend_request", handleFriendRequest);
      socket.off("friend_request_received", handleFriendRequest);
      socket.off("friend_request_accepted", handleFriendAccepted);

      socket.off("player_connected", handlePlayerStatus);
      socket.off("player_disconnected", handlePlayerStatus);
    };
  }, [socket, refetchRequests]);

  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open]);

  const handleAcceptInvitation = async (inv: { invitationId: string; roomId: string }) => {
    try {
      const token = localStorage.getItem("token");
      const url = apiUrl(`/api/invitations/${inv.invitationId}/accept`);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        dismissInvitation(inv.invitationId);
        navigate(`/waiting-room?roomId=${inv.roomId}`);
        setOpen(false);
      }
    } catch (err) {
      console.error("Erreur acceptation invitation:", err);
    }
  };

  const handleRejectInvitation = async (inv: { invitationId: string }) => {
    try {
      const token = localStorage.getItem("token");
      const url = apiUrl(`/api/invitations/${inv.invitationId}/reject`);

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

  if (!userId) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition h-10 md:h-12 min-w-[2.5rem] md:min-w-[3rem] shrink-0 px-2"
        title={t("notifications.title")}
      >
        <Bell className="w-5 h-5 shrink-0" strokeWidth={2.25} />

        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1">
            {totalCount > 99 ? "99+" : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-[400px] overflow-y-auto bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-[300]">
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
                {/* 🎮 INVITATIONS */}
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

                          <p className="text-indigo-300/80 text-xs truncate">
                            {inv.roomName}
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

                {/* 👥 FRIEND REQUESTS */}
                {pendingFriendRequests.length > 0 && (
                  <div>
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}