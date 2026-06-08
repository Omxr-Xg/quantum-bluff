const STORAGE_KEY = "qb-lobby-snapshot-v1";

export type LobbySnapshot = {
  rooms: unknown[];
  games: unknown[];
  openTournaments: unknown[];
  liveTournaments: unknown[];
  savedAt: number;
};

export function readLobbySnapshot(): LobbySnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LobbySnapshot;
    if (!parsed || typeof parsed.savedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLobbySnapshot(partial: Partial<Omit<LobbySnapshot, "savedAt">>): void {
  if (typeof window === "undefined") return;
  try {
    const prev = readLobbySnapshot();
    const next: LobbySnapshot = {
      rooms: partial.rooms ?? prev?.rooms ?? [],
      games: partial.games ?? prev?.games ?? [],
      openTournaments: partial.openTournaments ?? prev?.openTournaments ?? [],
      liveTournaments: partial.liveTournaments ?? prev?.liveTournaments ?? [],
      savedAt: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / mode privé */
  }
}
