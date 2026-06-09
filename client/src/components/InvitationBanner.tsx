import { useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { Check, X, Gamepad2 } from "lucide-react";
import { useSocket } from "../hooks/useSocket";
import type { GameInvitationNotification } from "../contexts/SocketContext";
import { apiUrl } from "../utils/apiBase";
import { useEffect, useState } from "react";
import { useInvitationAccept } from "../contexts/InvitationAcceptContext";
import { getAuthItem } from "../utils/authStorage";

export function InvitationBanner() {
  const { t } = useTranslation();
  const location = useLocation();
  const { pendingInvitations, dismissInvitation } = useSocket();
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const { requestAccept } = useInvitationAccept();

  const isGamePage = location.pathname === "/game";

  const handleReject = async (inv: GameInvitationNotification) => {
    try {
      const token = getAuthItem("token");
      const isBj = inv.game === "blackjack";
      const isBelote = inv.game === "belote";
      const url = apiUrl(
        isBj
          ? `/api/blackjack-tables/invitations/${inv.invitationId}/reject`
          : isBelote
            ? `/api/belote-rooms/invitations/${inv.invitationId}/reject`
            : `/api/friends/${inv.invitationId}/reject`,
      );
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      /* best effort */
    }
    dismissInvitation(inv.invitationId);
  };

  useEffect(() => {
    if (pendingInvitations.length === 0) return;
    const timers = pendingInvitations.map((inv) =>
      setTimeout(() => setHiddenIds((prev) => new Set([...prev, inv.invitationId])), 10000),
    );
    return () => timers.forEach(clearTimeout);
  }, [pendingInvitations.map((i) => i.invitationId).join(",")]);

  const visibleInvitations = pendingInvitations.filter((inv) => !hiddenIds.has(inv.invitationId));
  if (visibleInvitations.length === 0) return null;

  return (
    <>
      <div
        className={
          isGamePage
            ? "fixed top-3 left-1/2 z-[300] flex w-[min(100%-1rem,24rem)] -translate-x-1/2 flex-col gap-3 pointer-events-none"
            : "pointer-events-none fixed right-4 top-4 z-[300] flex w-full max-w-sm flex-col gap-3"
        }
      >
        {visibleInvitations.map((inv) => (
          <div
            key={inv.invitationId}
            className="pointer-events-auto animate-slide-in rounded-xl border-2 border-indigo-500 bg-gradient-to-r from-indigo-900 to-purple-900 p-4 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600">
                <Gamepad2 className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white">
                  {t("invitation.title", { username: inv.sender.username })}
                </p>
                <p className="truncate text-xs text-indigo-300">
                  {inv.game === "blackjack"
                    ? `${t("bjMulti.inviteBannerGame")} · `
                    : inv.game === "belote"
                      ? `${t("belote.lobbyTitle")} · `
                      : ""}
                  {inv.roomName}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => requestAccept(inv)}
                    className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-green-500"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {t("invitation.accept")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(inv)}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-red-500"
                  >
                    <X className="h-3.5 w-3.5" />
                    {t("invitation.reject")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
