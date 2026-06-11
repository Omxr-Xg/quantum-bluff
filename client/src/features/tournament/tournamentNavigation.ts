import { apiUrl } from "../../utils/apiBase";
import { getAuthItem } from "../../utils/authStorage";

export const TOURNAMENT_GAME_ID_PREFIX = "game_tournament_";

export type TournamentTableAssignment = {
  tournamentId: string;
  gameId: string;
  roundNumber: number;
  isFinalTable: boolean;
};

export function isTournamentGameId(gameId: string | null | undefined): boolean {
  return Boolean(gameId?.startsWith(TOURNAMENT_GAME_ID_PREFIX));
}

export function tournamentHubPath(tournamentId: string): string {
  return `/tournaments/${encodeURIComponent(tournamentId)}`;
}

export function tournamentWaitingPath(tournamentId: string, opts?: { nextGameId?: string; finalZip?: boolean }): string {
  const base = `${tournamentHubPath(tournamentId)}/waiting`;
  if (!opts?.nextGameId) return base;
  const q = new URLSearchParams();
  q.set("nextGameId", opts.nextGameId);
  if (opts.finalZip) q.set("finalZip", "1");
  return `${base}?${q.toString()}`;
}

export function tournamentGamePath(tournamentId: string, gameId: string): string {
  const q = new URLSearchParams();
  q.set("gameId", gameId);
  q.set("tournamentId", tournamentId);
  return `/game?${q.toString()}`;
}

export async function fetchTournamentContextByGameId(
  gameId: string,
): Promise<TournamentTableAssignment | null> {
  try {
    const r = await fetch(apiUrl(`/api/game/${encodeURIComponent(gameId)}/tournament-context`), {
      headers: { Authorization: `Bearer ${getAuthItem("token") ?? ""}` },
    });
    if (!r.ok) return null;
    return (await r.json()) as TournamentTableAssignment;
  } catch {
    return null;
  }
}

export function navigateToTournamentTable(
  navigate: (path: string, opts?: { replace?: boolean }) => void,
  assignment: Pick<TournamentTableAssignment, "tournamentId" | "gameId" | "isFinalTable">,
  opts?: { replace?: boolean },
): void {
  if (assignment.isFinalTable) {
    navigate(
      tournamentWaitingPath(assignment.tournamentId, {
        nextGameId: assignment.gameId,
        finalZip: true,
      }),
      { replace: opts?.replace },
    );
    return;
  }
  navigate(tournamentGamePath(assignment.tournamentId, assignment.gameId), {
    replace: opts?.replace,
  });
}
