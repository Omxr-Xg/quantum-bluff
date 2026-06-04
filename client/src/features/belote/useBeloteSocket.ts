import { useCallback, useEffect, useState } from "react";
import { useSocket } from "../../hooks/useSocket";
import { apiUrl } from "../../utils/apiBase";
import { getAuthItem } from "../../utils/authStorage";

export type BeloteCard = { suit: string; rank: string };

export type BeloteSanitizedState = {
  gameId: string;
  phase: string;
  targetScore: number;
  teamScoreA: number;
  teamScoreB: number;
  biddingTurnPosition?: number;
  players: Array<{
    userId: string;
    username: string;
    position: number;
    team: string;
    handCount: number;
    hand?: BeloteCard[];
  }>;
  deal: {
    trump?: string;
    currentTrick: Array<{ position: number; card: BeloteCard }>;
    currentPlayerPosition: number;
  };
};

export function useBeloteSocket(gameId: string | null) {
  const { socket } = useSocket();
  const [state, setState] = useState<BeloteSanitizedState | null>(null);
  const [ended, setEnded] = useState<{
    winningTeam: string;
    teamScoreA: number;
    teamScoreB: number;
    settlements?: unknown[];
  } | null>(null);

  const refreshHttp = useCallback(async () => {
    if (!gameId) return;
    const token = getAuthItem("token");
    const res = await fetch(apiUrl(`/api/belote-rooms/game/${gameId}/state`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return;
    const data = (await res.json()) as { state: BeloteSanitizedState };
    setState(data.state);
  }, [gameId]);

  useEffect(() => {
    if (!socket || !gameId) return;
    socket.emit("JOIN_BELOTE_GAME", { gameId });
    void refreshHttp();

    const onUpdate = (payload: { gameId: string; state: BeloteSanitizedState }) => {
      if (payload.gameId === gameId) setState(payload.state);
    };
    const onEnd = (payload: {
      gameId: string;
      winningTeam: string;
      teamScoreA: number;
      teamScoreB: number;
      settlements?: unknown[];
    }) => {
      if (payload.gameId === gameId) setEnded(payload);
    };

    socket.on("BELOTE_GAME_UPDATE", onUpdate);
    socket.on("BELOTE_GAME_END", onEnd);

    return () => {
      socket.emit("LEAVE_BELOTE_GAME", { gameId });
      socket.off("BELOTE_GAME_UPDATE", onUpdate);
      socket.off("BELOTE_GAME_END", onEnd);
    };
  }, [socket, gameId, refreshHttp]);

  const sendAction = useCallback(
    (action: Record<string, unknown>) => {
      if (!socket || !gameId) return;
      socket.emit("BELOTE_ACTION", { gameId, action });
    },
    [socket, gameId],
  );

  return { state, ended, sendAction, refreshHttp };
}
