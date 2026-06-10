import type { User } from "../services/api";

export type CachedFriendPreview = Pick<
  User,
  "id" | "username" | "avatarUrl" | "isOnline" | "lastSeenAt" | "cosmetics"
>;

const STORAGE_PREFIX = "qb-friends-lobby:";

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function readFriendsLobbyCache(userId: string): CachedFriendPreview[] | null {
  try {
    const raw = sessionStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedFriendPreview[];
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((f) => Boolean(f?.id && f?.username));
  } catch {
    return null;
  }
}

export function writeFriendsLobbyCache(userId: string, friends: User[]): void {
  try {
    const preview: CachedFriendPreview[] = friends.map((f) => ({
      id: f.id,
      username: f.username,
      avatarUrl: f.avatarUrl,
      isOnline: f.isOnline,
      lastSeenAt: f.lastSeenAt,
      cosmetics: f.cosmetics,
    }));
    sessionStorage.setItem(storageKey(userId), JSON.stringify(preview));
  } catch {
    /* quota / mode privé */
  }
}

export function clearFriendsLobbyCache(userId: string): void {
  try {
    sessionStorage.removeItem(storageKey(userId));
  } catch {
    /* ignore */
  }
}
