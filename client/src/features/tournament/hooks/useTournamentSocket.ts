import { useEffect, useRef } from "react";
import { useSocket } from "../../../hooks/useSocket";

type Handlers = {
  onTableAssigned?: (p: {
    tournamentId: string;
    gameId: string;
    roundNumber: number;
  }) => void;
  onNextRound?: (p: { tournamentId: string; roundNumber: number }) => void;
  onCompleted?: (p: { tournamentId: string; winnerUserId: string }) => void;
  onCancelled?: (p: { tournamentId: string; reason?: string }) => void;
  onStarted?: (p: { tournamentId: string }) => void;
  onRosterUpdated?: (p: {
    tournamentId: string;
    kind: "join" | "leave";
    playerCount: number;
    maxPlayers: number;
    username?: string;
    userId?: string;
  }) => void;
  /** Exclu par l’hôte (événement ciblé sur `user:{id}`). */
  onKicked?: (p: { tournamentId: string }) => void;
  /** Fin de table / nouvelle manche : rafraîchir les liens spectate (parties réellement actives). */
  onLiveTablesChanged?: (p: { tournamentId: string }) => void;
};

export type UseTournamentSocketArgs = Handlers & {
  /** Si `false`, ne rejoint pas la room `tournament:{id}`. Omis = `true`. */
  shouldJoinTournamentRoom?: boolean;
};

export function useTournamentSocket(
  tournamentId: string | undefined,
  args: UseTournamentSocketArgs,
) {
  const { socket } = useSocket();
  const { shouldJoinTournamentRoom, ...handlers } = args;
  const shouldJoin = shouldJoinTournamentRoom !== false;
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (!tournamentId || !socket) return;

    const joinRoom = () => {
      if (!shouldJoin) return;
      if (socket.connected) {
        socket.emit("JOIN_TOURNAMENT_ROOM", { tournamentId });
      }
    };

    joinRoom();
    socket.on("connect", joinRoom);

    const a = (payload: {
      tournamentId: string;
      gameId: string;
      roundNumber: number;
    }) => {
      if (payload.tournamentId === tournamentId)
        ref.current.onTableAssigned?.(payload);
    };
    const n = (payload: { tournamentId: string; roundNumber: number }) => {
      if (payload.tournamentId === tournamentId)
        ref.current.onNextRound?.(payload);
    };
    const c = (payload: { tournamentId: string; winnerUserId: string }) => {
      if (payload.tournamentId === tournamentId)
        ref.current.onCompleted?.(payload);
    };
    const x = (payload: { tournamentId: string; reason?: string }) => {
      if (payload.tournamentId === tournamentId)
        ref.current.onCancelled?.(payload);
    };
    const s = (payload: { tournamentId: string }) => {
      if (payload.tournamentId === tournamentId)
        ref.current.onStarted?.(payload);
    };
    const roster = (payload: {
      tournamentId: string;
      kind: "join" | "leave";
      playerCount: number;
      maxPlayers: number;
      username?: string;
      userId?: string;
    }) => {
      if (payload.tournamentId === tournamentId)
        ref.current.onRosterUpdated?.(payload);
    };
    const kicked = (payload: { tournamentId?: string }) => {
      if (payload.tournamentId === tournamentId)
        ref.current.onKicked?.({ tournamentId: payload.tournamentId });
    };
    const liveTables = (payload: { tournamentId?: string }) => {
      if (payload.tournamentId === tournamentId && tournamentId)
        ref.current.onLiveTablesChanged?.({ tournamentId });
    };

    socket.on("TOURNAMENT_TABLE_ASSIGNED", a);
    socket.on("TOURNAMENT_NEXT_ROUND", n);
    socket.on("TOURNAMENT_COMPLETED", c);
    socket.on("TOURNAMENT_CANCELLED", x);
    socket.on("TOURNAMENT_STARTED", s);
    socket.on("TOURNAMENT_ROSTER_UPDATED", roster);
    socket.on("TOURNAMENT_KICKED", kicked);
    socket.on("TOURNAMENT_LIVE_TABLES_CHANGED", liveTables);
    return () => {
      if (socket.connected) {
        socket.emit("LEAVE_TOURNAMENT_ROOM", { tournamentId });
      }
      socket.off("connect", joinRoom);
      socket.off("TOURNAMENT_TABLE_ASSIGNED", a);
      socket.off("TOURNAMENT_NEXT_ROUND", n);
      socket.off("TOURNAMENT_COMPLETED", c);
      socket.off("TOURNAMENT_CANCELLED", x);
      socket.off("TOURNAMENT_STARTED", s);
      socket.off("TOURNAMENT_ROSTER_UPDATED", roster);
      socket.off("TOURNAMENT_KICKED", kicked);
      socket.off("TOURNAMENT_LIVE_TABLES_CHANGED", liveTables);
    };
  }, [tournamentId, socket, shouldJoin]);
}
