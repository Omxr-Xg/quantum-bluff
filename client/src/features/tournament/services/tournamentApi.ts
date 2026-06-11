import { apiFetch, apiUrl } from "../../../utils/apiBase";
import { getAuthItem } from "../../../utils/authStorage";

const API = () => apiUrl("/api/tournaments");

function authHeaders(): HeadersInit {
  const token = getAuthItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Lit le message d’erreur d’une réponse API (JSON `{ error }` ou corps texte). */
export async function readApiError(r: Response): Promise<string> {
  const text = await r.text();
  const trimmed = text.trim();
  if (!trimmed) return r.statusText || `Erreur ${r.status}`;
  try {
    const j = JSON.parse(trimmed) as { error?: unknown };
    if (j && typeof j.error === "string" && j.error.length > 0) return j.error;
  } catch {
    /* pas du JSON */
  }
  return trimmed;
}

export type TournamentGameType = "POKER" | "BELOTE";

export async function fetchTournaments(gameType: TournamentGameType = "POKER") {
  const q = new URLSearchParams({ gameType });
  const r = await apiFetch(`${API()}?${q}`, { headers: authHeaders(), maxRetries: 0 });
  if (!r.ok) throw new Error(await readApiError(r));
  return r.json();
}

export async function fetchLiveSpectateTournaments(gameType: TournamentGameType = "POKER") {
  const q = new URLSearchParams({ gameType });
  const r = await apiFetch(`${API()}/live-spectate?${q}`, { headers: authHeaders(), maxRetries: 0 });
  if (!r.ok) throw new Error(await readApiError(r));
  return r.json();
}

export async function fetchTournament(id: string) {
  const r = await apiFetch(`${API()}/${encodeURIComponent(id)}`, { headers: authHeaders() });
  if (!r.ok) throw new Error(await readApiError(r));
  return r.json();
}

export async function fetchTournamentResults(id: string) {
  const r = await apiFetch(`${API()}/${encodeURIComponent(id)}/results`, { headers: authHeaders() });
  if (!r.ok) throw new Error(await readApiError(r));
  return r.json();
}

export async function createTournament(body: Record<string, unknown>) {
  const r = await apiFetch(API(), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await readApiError(r));
  return r.json() as Promise<{ id: string }>;
}

export type TournamentJoinLeaveResponse = {
  ok: boolean;
  newBalance: number | null;
};

export async function joinTournament(
  id: string,
  code?: string,
): Promise<TournamentJoinLeaveResponse> {
  const r = await apiFetch(`${API()}/${encodeURIComponent(id)}/join`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ code }),
  });
  if (!r.ok) throw new Error(await readApiError(r));
  return r.json() as Promise<TournamentJoinLeaveResponse>;
}

export async function leaveTournament(
  id: string,
): Promise<TournamentJoinLeaveResponse> {
  const r = await apiFetch(`${API()}/${encodeURIComponent(id)}/leave`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!r.ok) throw new Error(await readApiError(r));
  return r.json() as Promise<TournamentJoinLeaveResponse>;
}

export async function kickTournamentPlayer(tournamentId: string, targetUserId: string) {
  const r = await apiFetch(`${API()}/${encodeURIComponent(tournamentId)}/kick`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ userId: targetUserId }),
  });
  if (!r.ok) throw new Error(await readApiError(r));
  return r.json();
}

export async function startTournamentHost(id: string) {
  const r = await apiFetch(`${API()}/${encodeURIComponent(id)}/start`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!r.ok) throw new Error(await readApiError(r));
  return r.json();
}
