const defaultAvatar = 'https://ui-avatars.com/api/?name=QB&background=10b981&color=fff&size=128';

const STORAGE_KEYS = {
  USERNAME: 'quantum_bluff_username',
  EMAIL: 'quantum_bluff_email',
  AVATAR: 'quantum_bluff_avatar',
  BALANCE: 'quantum_bluff_balance',
};

/** Émis après chaque changement de balance locale (localStorage). Le Layout peut s’y abonner. */
export const BALANCE_CHANGED_EVENT = 'quantum-bluff-balance-changed';

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
  const username = localStorage.getItem(STORAGE_KEYS.USERNAME) || 'PokerKing47';
  const email = localStorage.getItem(STORAGE_KEYS.EMAIL) || 'support@QuantumBluff.sxb';
  const avatar = localStorage.getItem(STORAGE_KEYS.AVATAR) || defaultAvatar;
  const raw = parseInt(localStorage.getItem(STORAGE_KEYS.BALANCE) || '6340', 10);
  const balance = Number.isNaN(raw) ? 0 : Math.max(0, raw);

  return { username, email, avatar, balance };
}

export function saveUserProfile(profile: Partial<UserProfile>): void {
  if (profile.username) localStorage.setItem(STORAGE_KEYS.USERNAME, profile.username);
  if (profile.email) localStorage.setItem(STORAGE_KEYS.EMAIL, profile.email);
  if (profile.avatar) localStorage.setItem(STORAGE_KEYS.AVATAR, profile.avatar);
  if (profile.balance !== undefined) localStorage.setItem(STORAGE_KEYS.BALANCE, Math.max(0, profile.balance).toString());
}

export function getUserAvatar(): string {
  return localStorage.getItem(STORAGE_KEYS.AVATAR) || defaultAvatar;
}

export function saveUserAvatar(avatar: string): void {
  localStorage.setItem(STORAGE_KEYS.AVATAR, avatar);
}

export function getUsername(): string {
  return localStorage.getItem(STORAGE_KEYS.USERNAME) || 'PokerKing47';
}

export function getUserBalance(): number {
  const n = parseInt(localStorage.getItem(STORAGE_KEYS.BALANCE) || '6340', 10);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
}

export function updateUserBalance(newBalance: number): void {
  const safe = Math.max(0, Math.floor(newBalance));
  localStorage.setItem(STORAGE_KEYS.BALANCE, safe.toString());
  notifyBalanceChanged();
}

/** Add amount to current balance and persist. Returns new balance. */
export function addToUserBalance(amount: number): number {
  const current = getUserBalance();
  const next = Math.max(0, current + amount);
  updateUserBalance(next);
  return next;
}

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "") || "";

/** Vide toutes les données d'authentification du localStorage (déconnexion). Appelle l'API logout pour invalider le token côté serveur. */
export function clearAuthStorage(): void {
  const token = localStorage.getItem("token");
  const url = API_BASE ? `${API_BASE}/api/auth/logout` : "/api/auth/logout";
  if (token) {
    fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  }
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  localStorage.removeItem("userid");
  localStorage.removeItem("username");
  localStorage.removeItem(STORAGE_KEYS.USERNAME);
  localStorage.removeItem(STORAGE_KEYS.EMAIL);
  localStorage.removeItem(STORAGE_KEYS.AVATAR);
  localStorage.removeItem(STORAGE_KEYS.BALANCE);
  localStorage.removeItem("gamePlayers");
  localStorage.removeItem("gameId");
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
  const token = localStorage.getItem("token");
  if (!token) return getUserBalance();
  const url = API_BASE ? `${API_BASE}/api/auth/balance` : "/api/auth/balance";
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return getUserBalance();
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
  const token = localStorage.getItem("token");
  if (!token) return getUserBalance();
  const url = API_BASE ? `${API_BASE}/api/auth/add-dev-money` : "/api/auth/add-dev-money";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount: Math.max(0, Math.floor(amount)), secret: "dev" }),
  });
  if (!res.ok) return getUserBalance();
  const data = await res.json();
  const chips = typeof data?.chips === "number" ? Math.max(0, Math.floor(data.chips)) : getUserBalance();
  updateUserBalance(chips);
  return chips;
}

/** @deprecated Utiliser fetchBalanceFromServer. Ne plus pousser de balance client vers le serveur (sécurité). */
export async function syncBalanceToServer(): Promise<void> {
  await fetchBalanceFromServer();
}
