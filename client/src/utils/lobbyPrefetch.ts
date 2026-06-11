import { apiFetch, apiUrl } from "./apiBase";
import { getAuthItem } from "./authStorage";
import { writeLobbySnapshot } from "./lobbyDataCache";
import {
  fetchLiveSpectateTournaments,
  fetchTournaments,
} from "../features/tournament/services/tournamentApi";

function authHeaders(): Record<string, string> {
  const token = getAuthItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function prefetchWaitingRooms(userId: string): Promise<void> {
  const base = apiUrl("/api/waiting-room");
  const url = `${base}?userId=${encodeURIComponent(userId)}`;
  const res = await apiFetch(url, { headers: authHeaders(), maxRetries: 0 });
  if (!res.ok) return;
  const data = await res.json();
  writeLobbySnapshot({ rooms: Array.isArray(data) ? data : [] });
}

async function prefetchGamesInProgress(userId: string): Promise<void> {
  const base = apiUrl("/api/waiting-room/games-in-progress");
  const url = `${base}?userId=${encodeURIComponent(userId)}`;
  const res = await apiFetch(url, { headers: authHeaders(), maxRetries: 0 });
  if (!res.ok) return;
  const data = await res.json();
  writeLobbySnapshot({ games: Array.isArray(data) ? data : [] });
}

async function prefetchTournaments(): Promise<void> {
  const [openResult, liveResult] = await Promise.allSettled([
    fetchTournaments(),
    fetchLiveSpectateTournaments(),
  ]);
  const open =
    openResult.status === "fulfilled" && Array.isArray(openResult.value)
      ? openResult.value
      : [];
  const live =
    liveResult.status === "fulfilled" && Array.isArray(liveResult.value)
      ? liveResult.value
      : [];
  writeLobbySnapshot({ openTournaments: open, liveTournaments: live });
}

/** Précharge salles / parties / tournois en arrière-plan (sessionStorage). */
export function prefetchLobbyData(userId: string | null): void {
  if (getAuthItem("role") === "admin") return;
  if (!userId || !getAuthItem("token")) return;

  const run = () => {
    void prefetchWaitingRooms(userId);
    window.setTimeout(() => void prefetchGamesInProgress(userId), 50);
    window.setTimeout(() => void prefetchTournaments(), 100);
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 2500 });
  } else {
    window.setTimeout(run, 120);
  }
}
