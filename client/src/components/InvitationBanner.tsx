import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Check, X, Gamepad2 } from "lucide-react";
import { useSocket } from "../hooks/useSocket";
import type { GameInvitationNotification } from "../contexts/SocketContext";
import { apiUrl } from "../utils/apiBase";

export function InvitationBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pendingInvitations, dismissInvitation } = useSocket();

  const handleAccept = async (inv: GameInvitationNotification) => {
    try {
      const token = localStorage.getItem("token");
      const isBj = inv.game === "blackjack";
      const url = apiUrl(
        isBj
          ? `/api/blackjack-tables/invitations/${inv.invitationId}/accept`
          : `/api/invitations/${inv.invitationId}/accept`
      );
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        dismissInvitation(inv.invitationId);
        if (isBj) {
          navigate(`/lobby?tab=blackjack&bjRoom=${inv.roomId}`);
        } else {
          navigate(`/waiting-room?roomId=${inv.roomId}`);
        }
      }
    } catch (err) {
      console.error("Erreur acceptation invitation:", err);
    }
  };

  const handleReject = async (inv: GameInvitationNotification) => {
    try {
      const token = localStorage.getItem("token");
      const isBj = inv.game === "blackjack";
      const url = apiUrl(
        isBj
          ? `/api/blackjack-tables/invitations/${inv.invitationId}/reject`
          : `/api/invitations/${inv.invitationId}/reject`
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

  if (pendingInvitations.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {pendingInvitations.map((inv) => (
        <div
          key={inv.invitationId}
          className="pointer-events-auto bg-gradient-to-r from-indigo-900 to-purple-900 border-2 border-indigo-500 rounded-xl shadow-2xl p-4 animate-slide-in"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm">
                {t("invitation.title", { username: inv.sender.username })}
              </p>
              <p className="text-indigo-300 text-xs truncate">
                {inv.game === "blackjack" ? `${t("bjMulti.inviteBannerGame")} · ` : ""}
                {inv.roomName}
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleAccept(inv)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  {t("invitation.accept")}
                </button>
                <button
                  onClick={() => handleReject(inv)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/80 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                  {t("invitation.reject")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
