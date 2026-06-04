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
  const [blockedWarning, setBlockedWarning] = useState<{
    invitation: GameInvitationNotification;
    names: string[];
  } | null>(null);
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
    async (inv: GameInvitationNotification, options?: { confirmBlockedWarning?: boolean }) => {
      const token = getAuthItem("token");
      const isBj = inv.game === "blackjack";
      const isBelote = inv.game === "belote";
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
          : isBelote
            ? `/api/belote-rooms/invitations/${inv.invitationId}/accept`
            : `/api/friends/${inv.invitationId}/accept`,
      );
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...(options?.confirmBlockedWarning ? { confirmBlockedWarning: true } : {}),
        }),
      });
      if (res.ok) {
        dismissInvitation(inv.invitationId);
        if (isBj) {
          navigate(`/lobby?tab=blackjack&bjRoom=${inv.roomId}`);
        } else if (isBelote) {
          navigate(`/belote/waiting-room?roomId=${inv.roomId}`);
        } else {
          navigate(`/waiting-room?roomId=${inv.roomId}`);
        }
        return;
      }

      if (!isBj && res.status === 409) {
        const payload = (await res.json().catch(() => null)) as {
          code?: string;
          blockedPlayers?: { username?: string }[];
        } | null;
        if (payload?.code === "BLOCKED_USER_IN_ROOM") {
          setBlockedWarning({
            invitation: inv,
            names: (payload.blockedPlayers ?? [])
              .map((player) => player.username)
              .filter((name): name is string => Boolean(name)),
          });
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

  const confirmBlockedWarningAndAccept = useCallback(() => {
    if (!blockedWarning) return;
    const inv = blockedWarning.invitation;
    setConfirming(true);
    void runAccept(inv, { confirmBlockedWarning: true }).finally(() => {
      setConfirming(false);
      setBlockedWarning(null);
    });
  }, [blockedWarning, runAccept]);

  const cancelBlockedWarning = useCallback(() => {
    if (!confirming) setBlockedWarning(null);
  }, [confirming]);

  return {
    leavePromptInvitation: pending,
    blockedWarningInvitation: blockedWarning?.invitation ?? null,
    blockedWarningNames: blockedWarning?.names ?? [],
    confirmingLeave: confirming,
    requestAccept,
    confirmLeaveAndAccept,
    cancelLeavePrompt,
    confirmBlockedWarningAndAccept,
    cancelBlockedWarning,
  };
}
