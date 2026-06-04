import { useCallback, useEffect, useMemo, useState } from "react";
import { useSocket } from "../../hooks/useSocket";
import { useUser } from "../../hooks/useUser";
import { apiUrl } from "../../utils/apiBase";
import { getAuthItem } from "../../utils/authStorage";

export type BeloteCard = { suit: string; rank: string };

export type BeloteSanitizedState = {
  gameId: string;
  phase: string;
  variant?: string;
  targetScore: number;
  teamScoreA: number;
  teamScoreB: number;
  biddingTurnPosition?: number;
  contractPoints?: number;
  contreeLevel?: number;
  contreePhase?: "DEFENSE" | "ATTACK";
  turnDeadlineAt?: string;
  turnTimeLimitSec?: number;
  myLegalPlays?: BeloteCard[];
  myLegalBids?: Array<{ value: number; trump: string }>;
  dealEndSummary?: {
    made: boolean;
    contract: number;
    multiplier: number;
    scoreA: number;
    scoreB: number;
  };
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
  buyIn?: number;
  potTotal?: number;
  deal: {
    trump?: string;
    takerPosition?: number;
    contractTeam?: string;
    currentTrick: Array<{ position: number; card: BeloteCard }>;
    currentPlayerPosition: number;
  };
};

export function useBeloteSocket(
  gameId: string | null,
  options?: { spectate?: boolean },
) {
  const spectate = options?.spectate === true;
  const { socket } = useSocket();
  const { userId: myUserId } = useUser();
  const [state, setState] = useState<BeloteSanitizedState | null>(null);
  const [presentUserIds, setPresentUserIds] = useState<string[]>([]);
  const [turnTimeLeft, setTurnTimeLeft] = useState<number | null>(null);
  const [ended, setEnded] = useState<{
    winningTeam: string;
    teamScoreA: number;
    teamScoreB: number;
    buyIn?: number;
    potTotal?: number;
    payoutPerWinner?: number;
    settlements?: Array<{
      userId: string;
      username: string;
      won: boolean;
      chipsAwarded: number;
      xpAwarded: number;
    }>;
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
    const ids = new Set(data.presentUserIds ?? []);
    if (myUserId) ids.add(myUserId);
    setPresentUserIds([...ids]);
  }, [gameId, myUserId]);

  const deadlineTurnLeft = useMemo(() => {
    if (!state?.turnDeadlineAt) return null;
    const ms = new Date(state.turnDeadlineAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 1000));
  }, [state?.turnDeadlineAt, turnTimeLeft]);

  const effectiveTurnLeft = turnTimeLeft ?? deadlineTurnLeft;

  useEffect(() => {
    if (!socket || !gameId) return;
    const join = () => {
      if (spectate) {
        socket.emit("JOIN_BELOTE_SPECTATE", { gameId });
      } else {
        socket.emit("JOIN_BELOTE_GAME", { gameId });
      }
    };
    if (socket.connected) join();
    else socket.once("connect", join);
    void refreshHttp();

    const onUpdate = (payload: {
      gameId: string;
      state: BeloteSanitizedState;
      presentUserIds?: string[];
    }) => {
      if (payload.gameId !== gameId) return;
      setState(payload.state);
      const ids = new Set(payload.presentUserIds ?? []);
      if (myUserId) ids.add(myUserId);
      setPresentUserIds([...ids]);
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
      buyIn?: number;
      potTotal?: number;
      payoutPerWinner?: number;
      settlements?: Array<{
        userId: string;
        username: string;
        won: boolean;
        chipsAwarded: number;
        xpAwarded: number;
      }>;
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
  }, [socket, gameId, refreshHttp, myUserId, spectate]);

  const sendAction = useCallback(
    (action: Record<string, unknown>) => {
      if (!socket || !gameId || spectate) return;
      socket.emit("BELOTE_ACTION", { gameId, action });
    },
    [socket, gameId, spectate],
  );

  return {
    state,
    ended,
    presentUserIds,
    turnTimeLeft: effectiveTurnLeft,
    sendAction,
    refreshHttp,
    isSpectating: spectate,
  };
}
