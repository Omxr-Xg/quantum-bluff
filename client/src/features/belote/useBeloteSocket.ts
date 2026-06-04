import { useCallback, useEffect, useMemo, useState } from "react";
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
  turnDeadlineAt?: string;
  turnTimeLimitSec?: number;
  players: Array<{
    userId: string;
    username: string;
    position: number;
    team: string;
    handCount: number;
    hand?: BeloteCard[];
    avatarUrl?: string | null;
    disconnectedAt?: string | null;
    disconnectDeadline?: string | null;
    forfeited?: boolean;
  }>;
  deal: {
    trump?: string;
    takerPosition?: number;
    contractTeam?: string;
    currentTrick: Array<{ position: number; card: BeloteCard }>;
    currentPlayerPosition: number;
  };
};

export function useBeloteSocket(gameId: string | null) {
  const { socket } = useSocket();
  const [state, setState] = useState<BeloteSanitizedState | null>(null);
  const [presentUserIds, setPresentUserIds] = useState<string[]>([]);
  const [turnTimeLeft, setTurnTimeLeft] = useState<number | null>(null);
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
    const data = (await res.json()) as {
      state: BeloteSanitizedState;
      presentUserIds?: string[];
    };
    setState(data.state);
    if (data.presentUserIds) setPresentUserIds(data.presentUserIds);
  }, [gameId]);

  const deadlineTurnLeft = useMemo(() => {
    if (!state?.turnDeadlineAt) return null;
    const ms = new Date(state.turnDeadlineAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 1000));
  }, [state?.turnDeadlineAt, turnTimeLeft]);

  const effectiveTurnLeft = turnTimeLeft ?? deadlineTurnLeft;

  useEffect(() => {
    if (!socket || !gameId) return;
    socket.emit("JOIN_BELOTE_GAME", { gameId });
    void refreshHttp();

    const onUpdate = (payload: {
      gameId: string;
      state: BeloteSanitizedState;
      presentUserIds?: string[];
    }) => {
      if (payload.gameId !== gameId) return;
      setState(payload.state);
      if (payload.presentUserIds) setPresentUserIds(payload.presentUserIds);
    };
    const onTimer = (payload: { gameId: string; timeLeft: number }) => {
      if (payload.gameId === gameId) {
        setTurnTimeLeft(Math.max(0, payload.timeLeft));
      }
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
    socket.on("BELOTE_TURN_TIMER", onTimer);
    socket.on("BELOTE_GAME_END", onEnd);

    return () => {
      socket.emit("LEAVE_BELOTE_GAME", { gameId });
      socket.off("BELOTE_GAME_UPDATE", onUpdate);
      socket.off("BELOTE_TURN_TIMER", onTimer);
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

  return {
    state,
    ended,
    presentUserIds,
    turnTimeLeft: effectiveTurnLeft,
    sendAction,
    refreshHttp,
  };
}
