import { useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useSocket } from "./useSocket";
import type { GameInvitationNotification } from "../contexts/SocketContext";
import { apiUrl } from "../utils/apiBase";
import { getAuthItem } from "../utils/authStorage";

/**
 * Accepter une invitation salle d’attente / blackjack : si l’utilisateur est en partie cash
 * en ligne (/game?gameId=), on demande confirmation puis CASH_LEAVE (fold / quit côté serveur)
 * avant l’appel API accept.
 */
export function useWaitingRoomInvitationAccept() {
  const location = useLocation();
  const navigate = useNavigate();
  const { socket, dismissInvitation } = useSocket();
  const [pending, setPending] = useState<GameInvitationNotification | null>(null);
  const [confirming, setConfirming] = useState(false);

  const onlineGameId = (() => {
    if (location.pathname !== "/game") return null;
    const sp = new URLSearchParams(location.search);
    return sp.get("gameId");
  })();

  const mustConfirmLeaveGame = useCallback(() => {
    return Boolean(onlineGameId);
  }, [onlineGameId]);

  const runAccept = useCallback(
    async (inv: GameInvitationNotification) => {
      const token = getAuthItem("token");
      const isBj = inv.game === "blackjack";
      const sp = new URLSearchParams(window.location.search);
      const gameId = sp.get("gameId");
      const isSpectate = sp.get("spectate") === "1";

      /* Quitter la table cash (fold / abandon de la main géré côté serveur) avant de rejoindre une autre salle. */
      if (gameId && socket && location.pathname === "/game" && !isSpectate) {
        socket.emit("CASH_LEAVE", { gameId });
        await new Promise((r) => setTimeout(r, 400));
      }

      const url = apiUrl(
        isBj
          ? `/api/blackjack-tables/invitations/${inv.invitationId}/accept`
          : `/api/friends/${inv.invitationId}/accept`,
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
    },
    [dismissInvitation, location.pathname, navigate, socket],
  );

  const requestAccept = useCallback(
    (inv: GameInvitationNotification) => {
      if (mustConfirmLeaveGame()) {
        setPending(inv);
        return;
      }
      setConfirming(true);
      void runAccept(inv).finally(() => setConfirming(false));
    },
    [mustConfirmLeaveGame, runAccept],
  );

  const confirmLeaveAndAccept = useCallback(() => {
    if (!pending) return;
    const inv = pending;
    setConfirming(true);
    void runAccept(inv).finally(() => {
      setConfirming(false);
      setPending(null);
    });
  }, [pending, runAccept]);

  const cancelLeavePrompt = useCallback(() => {
    if (!confirming) setPending(null);
  }, [confirming]);

  return {
    leavePromptInvitation: pending,
    confirmingLeave: confirming,
    requestAccept,
    confirmLeaveAndAccept,
    cancelLeavePrompt,
  };
}
