import { useEffect, useRef } from "react";
import { socket } from "../../../services/socket";

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
};

export function useTournamentSocket(
  tournamentId: string | undefined,
  handlers: Handlers,
) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (!tournamentId) return;
    socket.emit("JOIN_TOURNAMENT_ROOM", { tournamentId });
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
    socket.on("TOURNAMENT_TABLE_ASSIGNED", a);
    socket.on("TOURNAMENT_NEXT_ROUND", n);
    socket.on("TOURNAMENT_COMPLETED", c);
    socket.on("TOURNAMENT_CANCELLED", x);
    socket.on("TOURNAMENT_STARTED", s);
    return () => {
      socket.off("TOURNAMENT_TABLE_ASSIGNED", a);
      socket.off("TOURNAMENT_NEXT_ROUND", n);
      socket.off("TOURNAMENT_COMPLETED", c);
      socket.off("TOURNAMENT_CANCELLED", x);
      socket.off("TOURNAMENT_STARTED", s);
    };
  }, [tournamentId]);
}
