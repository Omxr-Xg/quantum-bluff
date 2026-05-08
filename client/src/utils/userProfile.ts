import { apiUrl } from "./apiBase";
import {
  clearAuthStorageEverywhere,
  getAuthItem,
  setAuthItem,
} from "./authStorage";
import { clearGamificationStorage } from "./gamificationStorage";

const defaultAvatar = 'https://ui-avatars.com/api/?name=QB&background=10b981&color=fff&size=128';

/** Avatar stocké en chemin API relatif après persistance serveur (BYTEA). */
export function resolveStoredAvatarUrl(raw: string): string {
  const t = raw.trim();
  if (t.startsWith('/api/')) return apiUrl(t);
  const vmApi = t.match(/^\/vm[^/]+(\/api\/.+)$/i);
  if (vmApi?.[1]) return apiUrl(vmApi[1]);
  return t;
}

const STORAGE_KEYS = {
  USERNAME: 'quantum_bluff_username',
  EMAIL: 'quantum_bluff_email',
  AVATAR: 'quantum_bluff_avatar',
  BALANCE: 'quantum_bluff_balance',
};

/** Émis après chaque changement de balance locale (localStorage). Le Layout peut s’y abonner. */
export const BALANCE_CHANGED_EVENT = 'quantum-bluff-balance-changed';
export const PROFILE_CHANGED_EVENT = 'quantum-bluff-profile-changed';

function notifyBalanceChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(BALANCE_CHANGED_EVENT));
  }
}

export interface UserProfile {
  username: string;
  email: string;
  avatar: string;
  balance: number;
}

export function getUserProfile(): UserProfile {
  const username = getAuthItem(STORAGE_KEYS.USERNAME) || "PokerKing47";
  const email = getAuthItem(STORAGE_KEYS.EMAIL) || "support@QuantumBluff.sxb";
  const avatarRaw = getAuthItem(STORAGE_KEYS.AVATAR) || defaultAvatar;
  const avatar = resolveStoredAvatarUrl(avatarRaw);
  const raw = parseInt(getAuthItem(STORAGE_KEYS.BALANCE) || "6340", 10);
  const balance = Number.isNaN(raw) ? 0 : Math.max(0, raw);

  return { username, email, avatar, balance };
}

export function saveUserProfile(profile: Partial<UserProfile>): void {
  if (profile.username) setAuthItem(STORAGE_KEYS.USERNAME, profile.username);
  if (profile.email) setAuthItem(STORAGE_KEYS.EMAIL, profile.email);
  if (profile.avatar) setAuthItem(STORAGE_KEYS.AVATAR, profile.avatar);
  if (profile.balance !== undefined) setAuthItem(STORAGE_KEYS.BALANCE, Math.max(0, profile.balance).toString());
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
  }
}

export function getUserAvatar(): string {
  const raw = getAuthItem(STORAGE_KEYS.AVATAR) || defaultAvatar;
  return resolveStoredAvatarUrl(raw);
}

export function saveUserAvatar(avatar: string): void {
  setAuthItem(STORAGE_KEYS.AVATAR, avatar);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
  }
}

export function getUsername(): string {
  return getAuthItem(STORAGE_KEYS.USERNAME) || "PokerKing47";
}

export function getUserBalance(): number {
  const n = parseInt(getAuthItem(STORAGE_KEYS.BALANCE) || "6340", 10);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
}

export function updateUserBalance(newBalance: number): void {
  const safe = Math.max(0, Math.floor(newBalance));
  setAuthItem(STORAGE_KEYS.BALANCE, safe.toString());
  notifyBalanceChanged();
}

/** Add amount to current balance and persist. Returns new balance. */
export function addToUserBalance(amount: number): number {
  const current = getUserBalance();
  const next = Math.max(0, current + amount);
  updateUserBalance(next);
  return next;
}

/** Si le JWT est expiré, inutile d'appeler l'API (sinon 401 dans la console réseau). */
function accessTokenIsExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const json = atob(b64);
    const payload = JSON.parse(json) as { exp?: number };
    if (typeof payload.exp !== "number") return false;
    return payload.exp * 1000 < Date.now() + 10_000;
  } catch {
    return false;
  }
}

/**
 * Token expiré / révoqué : nettoyage local sans appel serveur (évite 401 en boucle sur /balance).
 */
export function invalidateStaleAuthSession(): void {
  clearAuthStorageEverywhere();
  clearGamificationStorage();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth-changed"));
  }
}

/** Vide toutes les données d'authentification du localStorage (déconnexion). Appelle l'API logout pour invalider le token côté serveur. */
export function clearAuthStorage(): void {
  const token = getAuthItem("token");
  const url = apiUrl("/api/auth/logout");
  if (token) {
    fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  }
  clearAuthStorageEverywhere(["gamePlayers", "gameId"]);
  clearGamificationStorage();
  localStorage.removeItem("gamePlayers");
  localStorage.removeItem("gameId");
  sessionStorage.removeItem("gamePlayers");
  sessionStorage.removeItem("gameId");
  window.dispatchEvent(new Event("auth-changed"));
}

export type FetchBalanceOptions = {
  /**
   * Solde serveur tel quel (pas de fusion `max` avec le local).
   * À utiliser sur `/slot` pour que gains/pertes du mini-jeu restent cohérents.
   */
  authoritative?: boolean;
};

/**
 * Récupère la balance serveur et la fusionne avec le localStorage.
 * `Math.max(local, serveur)` évite d’écraser les gains du **mode bot** (non encore persistés côté API)
 * quand on revient au lobby.
 */
export async function fetchBalanceFromServer(options?: FetchBalanceOptions): Promise<number> {
  const token = getAuthItem("token");
  if (!token) return getUserBalance();
  if (accessTokenIsExpired(token)) {
    invalidateStaleAuthSession();
    return getUserBalance();
  }
  const url = apiUrl("/api/auth/balance");
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      if (res.status === 401) {
        invalidateStaleAuthSession();
      }
      return getUserBalance();
    }
    const data = await res.json();
    const serverChips = typeof data?.chips === "number" ? Math.max(0, Math.floor(data.chips)) : getUserBalance();
    if (options?.authoritative) {
      updateUserBalance(serverChips);
      return serverChips;
    }
    const localChips = getUserBalance();
    const merged = Math.max(localChips, serverChips);
    updateUserBalance(merged);
    return merged;
  } catch {
    return getUserBalance();
  }
}

/** Ajoute des jetons via l'API serveur (validation "dev" côté serveur). Retourne la nouvelle balance. */
export async function addDevMoney(amount: number): Promise<number> {
  const safeAmount = Math.max(0, Math.floor(amount));
  if (safeAmount <= 0) return getUserBalance();
  const token = getAuthItem("token");
  if (!token) {
    return addToUserBalance(safeAmount);
  }
  const url = apiUrl("/api/auth/add-dev-money");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount: safeAmount, secret: "dev" }),
    });
    if (res.ok) {
      const data = await res.json();
      const chips = typeof data?.chips === "number" ? Math.max(0, Math.floor(data.chips)) : getUserBalance();
      updateUserBalance(chips);
      return chips;
    }
    // Rendu académique: fallback local si l'API est désactivée/non joignable.
    return addToUserBalance(safeAmount);
  } catch {
    return addToUserBalance(safeAmount);
  }
}

/** @deprecated Utiliser fetchBalanceFromServer. Ne plus pousser de balance client vers le serveur (sécurité). */
export async function syncBalanceToServer(): Promise<void> {
  await fetchBalanceFromServer();
}

// ======================================================================
// Daily login streak (récompense de connexion quotidienne)
// ======================================================================

export type DailyLoginStatus = {
  dayKey: string;
  streakCount: number;
  claimedToday: boolean;
  nextAction: "CLAIM_TODAY" | "ALREADY_CLAIMED";
  nextDayIndex: number;
  nextReward: number;
  rewards: number[];
};

export type DailyLoginClaimResult = {
  success: true;
  dayKey: string;
  streakCount: number;
  rewardTokens: number;
  chips: number;
  reset: boolean;
};

/** Récupère l'état du daily streak depuis le serveur. */
export async function fetchDailyLoginStatus(): Promise<DailyLoginStatus | null> {
  const token = getAuthItem("token");
  if (!token) return null;
  try {
    const res = await fetch(apiUrl("/api/daily-login/me"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as DailyLoginStatus;
  } catch {
    return null;
  }
}

/** Réclame la récompense de connexion du jour. Renvoie null si déjà réclamé / erreur. */
export async function claimDailyLogin(): Promise<DailyLoginClaimResult | null> {
  const token = getAuthItem("token");
  if (!token) return null;
  try {
    const res = await fetch(apiUrl("/api/daily-login/claim"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as DailyLoginClaimResult;
    if (typeof data?.chips === "number") {
      updateUserBalance(Math.max(0, Math.floor(data.chips)));
    }
    return data;
  } catch {
    return null;
  }
}
