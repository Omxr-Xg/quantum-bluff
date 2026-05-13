/**
 * Client API pour les paris cachés « vainqueur de tournoi » (parimutuel dynamique).
 * Marché ouvert en permanence tant que le tournoi n'est pas terminé / annulé.
 */
import { apiUrl } from "../../../utils/apiBase";
import { getAuthItem } from "../../../utils/authStorage";
import { readApiError } from "./tournamentApi";

export const TOURNAMENT_WINNER_BET_MIN_STAKE = 10;
export const TOURNAMENT_WINNER_BET_MAX_STAKE = 5000;

const API = () => apiUrl("/api/tournaments");

function authHeaders(): HeadersInit {
  const token = getAuthItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type TournamentBetCandidate = {
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  status: string;
  totalStake: number;
  betCount: number;
  /** `null` si aucun pari sur ce candidat. */
  odds: number | null;
  share: number;
};

export type TournamentBetPoolSnapshot = {
  tournamentId: string;
  status: string;
  marketOpen: boolean;
  totalPool: number;
  totalBets: number;
  candidates: TournamentBetCandidate[];
};

export type MyTournamentBetRow = {
  id: string;
  tournamentId: string;
  predictedWinnerUserId: string;
  predictedWinnerUsername: string | null;
  predictedWinnerAvatarUrl: string | null;
  stake: number;
  status: "PENDING" | "WON" | "LOST" | "REFUNDED";
  payout: number | null;
  oddsSnapshot: number | null;
  placedAt: string;
  resolvedAt: string | null;
};

export async function fetchTournamentWinnerBetPool(
  tournamentId: string,
): Promise<TournamentBetPoolSnapshot> {
  const r = await fetch(
    `${API()}/${encodeURIComponent(tournamentId)}/bets/pool`,
    { headers: authHeaders() },
  );
  if (!r.ok) throw new Error(await readApiError(r));
  return r.json() as Promise<TournamentBetPoolSnapshot>;
}

export async function fetchMyTournamentWinnerBets(
  tournamentId: string,
): Promise<{ bets: MyTournamentBetRow[] }> {
  const r = await fetch(
    `${API()}/${encodeURIComponent(tournamentId)}/bets/mine`,
    { headers: authHeaders() },
  );
  if (!r.ok) throw new Error(await readApiError(r));
  return r.json() as Promise<{ bets: MyTournamentBetRow[] }>;
}

export type PlaceTournamentWinnerBetResponse = {
  ok: boolean;
  bet: {
    id: string;
    stake: number;
    predictedWinnerUserId: string;
    oddsSnapshot: number | null;
    placedAt: string;
  };
  newBalance: number;
};

export async function placeTournamentWinnerBet(
  tournamentId: string,
  body: { predictedWinnerUserId: string; stake: number },
): Promise<PlaceTournamentWinnerBetResponse> {
  const r = await fetch(`${API()}/${encodeURIComponent(tournamentId)}/bets`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await readApiError(r));
  return r.json() as Promise<PlaceTournamentWinnerBetResponse>;
}
