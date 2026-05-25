import { apiFetch, apiUrl } from "./apiBase";
import {
  clearAuthStorageEverywhere,
  getAuthItem,
  setAuthItem,
} from "./authStorage";
import { clearGamificationStorage } from "./gamificationStorage";
/* Avatar par défaut bundlé localement (Vite) — évite une requête externe
 * vers `ui-avatars.com` et garantit l'affichage hors-ligne / sur VM isolée. */
import defaultAvatarAsset from "../assets/avatars/NA.png";

const defaultAvatar: string = defaultAvatarAsset;

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
/** Détail : `{ delta: number }` — gain de jetons portefeuille (affiche +Δ à côté du solde). */
export const BALANCE_GAIN_FLASH_EVENT = "quantum-bluff-balance-gain-flash";
/** Partie cash : solde affiché = portefeuille API + jetons au siège (`detail.total`, ou `null` pour réinitialiser). */
export const POKER_WALLET_DISPLAY_EVENT = 'quantum-bluff-poker-wallet-display';
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
  const prev = getUserBalance();
  const safe = Math.max(0, Math.floor(newBalance));
  setAuthItem(STORAGE_KEYS.BALANCE, safe.toString());
  notifyBalanceChanged();
  const gain = safe - prev;
  if (gain > 0 && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(BALANCE_GAIN_FLASH_EVENT, { detail: { delta: gain } }),
    );
  }
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
    localStorage.removeItem("quantum_bluff_daily_login_auto_opened");
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
  localStorage.removeItem("quantum_bluff_daily_login_auto_opened");
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
    const res = await apiFetch(url, { headers: { Authorization: `Bearer ${token}` } });
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
export async function addDevMoney(
  amount: number,
  options?: { promoCode?: string },
): Promise<number> {
  const safeAmount = Math.max(0, Math.floor(amount));
  if (safeAmount <= 0) return getUserBalance();
  const token = getAuthItem("token");
  if (!token) {
    return addToUserBalance(safeAmount);
  }
  const url = apiUrl("/api/auth/add-dev-money");
  const promo = options?.promoCode?.trim();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        amount: safeAmount,
        secret: "dev",
        ...(promo ? { promoCode: promo } : {}),
      }),
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

/**
 * Demande un retrait : decremente le solde cote serveur, ecrit une entree
 * de ledger « WITHDRAWAL_REQUEST » et met a jour le solde local.
 *
 * Note : la monnaie etant virtuelle, aucun virement bancaire reel n'est
 * declenche. Le serveur valide neanmoins le montant (> 0, <= solde courant)
 * et la structure IBAN basique pour eviter les abus.
 */
export async function requestWithdrawal(input: {
  amount: number;
  iban: string;
  holder: string;
}): Promise<{ ok: true; chips: number } | { ok: false; error: string }> {
  const safeAmount = Math.max(0, Math.floor(input.amount));
  if (safeAmount <= 0) return { ok: false, error: "invalid_amount" };
  const token = getAuthItem("token");
  if (!token) return { ok: false, error: "not_authenticated" };
  try {
    const res = await fetch(apiUrl("/api/auth/withdraw-money"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount: safeAmount,
        iban: input.iban,
        holder: input.holder,
        secret: "dev",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: typeof data?.error === "string" ? data.error : `http_${res.status}`,
      };
    }
    const chips =
      typeof data?.chips === "number"
        ? Math.max(0, Math.floor(data.chips))
        : getUserBalance();
    updateUserBalance(chips);
    return { ok: true, chips };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "network_error",
    };
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

export type DailyLoginStatusFetch =
  | { ok: true; data: DailyLoginStatus }
  | { ok: false; message: string };

export type DailyLoginClaimFetch =
  | { ok: true; data: DailyLoginClaimResult }
  | { ok: false; message: string };

function isDailyLoginStatusPayload(x: unknown): x is DailyLoginStatus {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const na = o.nextAction;
  return (
    typeof o.dayKey === "string" &&
    typeof o.streakCount === "number" &&
    typeof o.claimedToday === "boolean" &&
    (na === "CLAIM_TODAY" || na === "ALREADY_CLAIMED") &&
    typeof o.nextDayIndex === "number" &&
    typeof o.nextReward === "number" &&
    Array.isArray(o.rewards)
  );
}

function isDailyLoginClaimPayload(x: unknown): x is DailyLoginClaimResult {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    o.success === true &&
    typeof o.dayKey === "string" &&
    typeof o.streakCount === "number" &&
    typeof o.rewardTokens === "number" &&
    typeof o.chips === "number" &&
    typeof o.reset === "boolean"
  );
}

function serverErrorMessage(body: unknown, status: number): string {
  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const msg = typeof o.error === "string" ? o.error : "";
  const code = typeof o.code === "string" ? o.code : "";
  if (status === 401) {
    return msg || "Session expirée ou invalide. Reconnecte-toi.";
  }
  if (status === 403) {
    return msg || "Ce compte ne peut pas utiliser cette récompense.";
  }
  if (status === 404 && code === "USER_NOT_FOUND") {
    return "Compte introuvable sur le serveur. Déconnecte-toi puis reconnecte-toi.";
  }
  if (status === 409 && code === "ALREADY_CLAIMED") {
    return msg || "Récompense déjà récupérée aujourd’hui.";
  }
  if (status === 503 && code === "SCHEMA_OUTDATED") {
    return (
      msg ||
      "Base de données non à jour. Sur la machine du serveur : cd server && npx prisma migrate deploy"
    );
  }
  if (status >= 500) {
    return msg || "Erreur serveur. Réessaie dans un instant.";
  }
  return msg || `Réponse serveur inattendue (${status}).`;
}

/** Détail pour l’UI (messages d’erreur explicites). */
export async function fetchDailyLoginStatusDetailed(): Promise<DailyLoginStatusFetch> {
  const token = getAuthItem("token");
  if (!token) {
    return { ok: false, message: "Tu n’es pas connecté." };
  }
  try {
    const res = await fetch(apiUrl("/api/daily-login/me"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (!res.ok) {
      const message = serverErrorMessage(body, res.status);
      if (import.meta.env.DEV) {
        console.warn("[daily-login/me]", res.status, body);
      }
      return { ok: false, message };
    }
    if (!isDailyLoginStatusPayload(body)) {
      return {
        ok: false,
        message: "Réponse serveur invalide. Mets à jour l’application ou réessaie.",
      };
    }
    return { ok: true, data: body };
  } catch {
    return {
      ok: false,
      message:
        "Impossible de joindre le serveur. Vérifie que l’API tourne (ou ta connexion réseau).",
    };
  }
}

/** Réclame la récompense ; messages utilisables dans une modale. */
export async function claimDailyLoginDetailed(): Promise<DailyLoginClaimFetch> {
  const token = getAuthItem("token");
  if (!token) {
    return { ok: false, message: "Tu n’es pas connecté." };
  }
  try {
    const res = await fetch(apiUrl("/api/daily-login/claim"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (!res.ok) {
      const message = serverErrorMessage(body, res.status);
      if (import.meta.env.DEV) {
        console.warn("[daily-login/claim]", res.status, body);
      }
      return { ok: false, message };
    }
    if (!isDailyLoginClaimPayload(body)) {
      return { ok: false, message: "Réponse serveur invalide après la réclamation." };
    }
    if (typeof body.chips === "number") {
      updateUserBalance(Math.max(0, Math.floor(body.chips)));
    }
    return { ok: true, data: body };
  } catch {
    return {
      ok: false,
      message:
        "Impossible de joindre le serveur. Vérifie que l’API tourne (ou ta connexion réseau).",
    };
  }
}

/** Récupère l'état du daily streak depuis le serveur. */
export async function fetchDailyLoginStatus(): Promise<DailyLoginStatus | null> {
  const r = await fetchDailyLoginStatusDetailed();
  return r.ok ? r.data : null;
}

/** Réclame la récompense de connexion du jour. Renvoie null si déjà réclamé / erreur. */
export async function claimDailyLogin(): Promise<DailyLoginClaimResult | null> {
  const r = await claimDailyLoginDetailed();
  return r.ok ? r.data : null;
}
