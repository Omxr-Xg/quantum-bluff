import { useCallback, useEffect, useMemo, useState } from "react";
import { useSocket } from "../../hooks/useSocket";
import { useUser } from "../../hooks/useUser";
import { apiUrl } from "../../utils/apiBase";
import { getAuthItem } from "../../utils/authStorage";
import type { TableVisualsPayload } from "../../utils/tableThemeShop";

export type BeloteCard = { suit: string; rank: string };

export type BeloteTrumpChoice = string;

export type BeloteSanitizedState = {
  gameId: string;
  phase: string;
  variant?: "CLASSIQUE" | "COINCHE" | "CONTEE" | "MODERNE";
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
  dealLogId?: string;
  actionVersion?: number;
  lastBeloteAction?: {
    actionVersion: number;
    phase: string;
    playerId: string;
    playerName: string;
    action: string;
    value?: number;
    trump?: string;
    card?: BeloteCard;
  };
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
    isBot?: boolean;
  }>;
  buyIn?: number;
  potTotal?: number;
  tableVisuals?: TableVisualsPayload;
  deal: {
    trump?: string;
    trumpMode?: "SUIT" | "ALL_TRUMP" | "NO_TRUMP";
    turnedCard?: BeloteCard;
    takerPosition?: number;
    contractTeam?: string;
    currentTrick: Array<{ position: number; card: BeloteCard }>;
    lastCompletedTrick?: Array<{ position: number; card: BeloteCard }>;
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
  const [botThinkingId, setBotThinkingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
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
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      setLoadError(
        errBody.error ??
          (res.status === 404 ? "Partie introuvable" : "Impossible de charger la partie"),
      );
      return;
    }
    setLoadError(null);
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
      setLoadError(null);
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

    const onBotAction = (payload: { gameId: string; botId: string }) => {
      if (payload.gameId !== gameId) return;
      setBotThinkingId(payload.botId);
      window.setTimeout(() => setBotThinkingId((id) => (id === payload.botId ? null : id)), 900);
    };
    const onReplaced = () => {
      void refreshHttp();
    };

    const onSocketError = (payload: { code?: string; message?: string }) => {
      const code = payload?.code ?? "";
      if (
        code === "GAME_NOT_FOUND" ||
        code === "GAME_CLOSED" ||
        (code === "NOT_IN_GAME" && !spectate) ||
        code === "SPECTATE_ERROR"
      ) {
        setLoadError(payload.message ?? "Partie indisponible");
      }
    };

    socket.on("BELOTE_GAME_UPDATE", onUpdate);
    socket.on("BELOTE_TURN_TIMER", onTimer);
    socket.on("BELOTE_GAME_END", onEnd);
    socket.on("BELOTE_BOT_ACTION", onBotAction);
    socket.on("BELOTE_PLAYER_REPLACED_BY_BOT", onReplaced);
    socket.on("ERROR", onSocketError);

    return () => {
      socket.emit("LEAVE_BELOTE_GAME", { gameId });
      socket.off("BELOTE_GAME_UPDATE", onUpdate);
      socket.off("BELOTE_TURN_TIMER", onTimer);
      socket.off("BELOTE_GAME_END", onEnd);
      socket.off("BELOTE_BOT_ACTION", onBotAction);
      socket.off("BELOTE_PLAYER_REPLACED_BY_BOT", onReplaced);
      socket.off("ERROR", onSocketError);
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
    loadError,
    presentUserIds,
    turnTimeLeft: effectiveTurnLeft,
    botThinkingId,
    sendAction,
    refreshHttp,
    isSpectating: spectate,
  };
}
