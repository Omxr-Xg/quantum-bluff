import { apiUrl } from "./apiBase";
import { getAuthItem } from "./authStorage";

/** Aligné sur le catalogue serveur (badges débloqués par niveau). */
export const BADGE_CATALOG: { id: string; minLevel: number }[] = [
  { id: "novice", minLevel: 2 },
  { id: "regular", minLevel: 3 },
  { id: "rising", minLevel: 5 },
  { id: "skilled", minLevel: 7 },
  { id: "veteran", minLevel: 10 },
  { id: "expert", minLevel: 12 },
  { id: "elite", minLevel: 15 },
  { id: "master", minLevel: 18 },
  { id: "champion", minLevel: 22 },
  { id: "legend", minLevel: 25 },
  { id: "weekly_grinder", minLevel: 0 },
];

export const MANUAL_ONLY_BADGE_IDS = new Set(["weekly_grinder"]);

export type StoredGamification = {
  experience: number;
  level: number;
  xpToNext: number;
  badges: string[];
  maxBetSlot: number;
  maxBetRouletteLine: number;
  maxRouletteTotalStake: number;
  maxBetBlackjack: number;
};

const KEY = "quantum_bluff_gamification";

export const GAMIFICATION_CHANGED_EVENT = "quantum-bluff-gamification-changed";

function notifyGamificationChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(GAMIFICATION_CHANGED_EVENT));
  }
}

export function readGamification(): Partial<StoredGamification> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as Record<string, unknown>;
    const out: Partial<StoredGamification> = {};
    if (typeof o.experience === "number") out.experience = o.experience;
    if (typeof o.level === "number") out.level = o.level;
    if (typeof o.xpToNext === "number") out.xpToNext = o.xpToNext;
    if (Array.isArray(o.badges)) out.badges = o.badges.filter((x) => typeof x === "string");
    if (typeof o.maxBetSlot === "number") out.maxBetSlot = o.maxBetSlot;
    if (typeof o.maxBetRouletteLine === "number") out.maxBetRouletteLine = o.maxBetRouletteLine;
    if (typeof o.maxRouletteTotalStake === "number") out.maxRouletteTotalStake = o.maxRouletteTotalStake;
    if (typeof o.maxBetBlackjack === "number") out.maxBetBlackjack = o.maxBetBlackjack;
    return out;
  } catch {
    return {};
  }
}

export function persistGamification(patch: Partial<StoredGamification>): void {
  const prev = readGamification();
  const next: Partial<StoredGamification> = { ...prev, ...patch };
  if (next.badges) {
    next.badges = [...new Set(next.badges)].sort();
  }
  localStorage.setItem(KEY, JSON.stringify(next));
  notifyGamificationChanged();
}

/** Depuis la réponse login / register `user`. */
export function persistGamificationFromAuthUser(u: Record<string, unknown>): void {
  persistGamification({
    experience: typeof u.experience === "number" ? u.experience : undefined,
    level: typeof u.level === "number" ? u.level : undefined,
    xpToNext: typeof u.xpToNext === "number" ? u.xpToNext : undefined,
    badges: Array.isArray(u.badges) ? (u.badges as string[]) : undefined,
    maxBetSlot: typeof u.maxBetSlot === "number" ? u.maxBetSlot : undefined,
    maxBetRouletteLine: typeof u.maxBetRouletteLine === "number" ? u.maxBetRouletteLine : undefined,
    maxRouletteTotalStake: typeof u.maxRouletteTotalStake === "number" ? u.maxRouletteTotalStake : undefined,
    maxBetBlackjack: typeof u.maxBetBlackjack === "number" ? u.maxBetBlackjack : undefined,
  });
}

/** Réponses slot spin, roulette spin, ou record-result poker (bot). */
export function mergeGamificationFromServerResponse(data: Record<string, unknown>): void {
  const patch: Partial<StoredGamification> = {};
  if (typeof data.experience === "number") patch.experience = data.experience;
  if (typeof data.level === "number") patch.level = data.level;
  if (typeof data.xpToNext === "number") patch.xpToNext = data.xpToNext;
  if (typeof data.maxBetSlot === "number") patch.maxBetSlot = data.maxBetSlot;
  if (typeof data.maxBetPerLine === "number") patch.maxBetRouletteLine = data.maxBetPerLine;
  if (typeof data.maxTotalStake === "number") patch.maxRouletteTotalStake = data.maxTotalStake;
  if (typeof data.maxBetBlackjack === "number") patch.maxBetBlackjack = data.maxBetBlackjack;
  if (Array.isArray(data.newBadges) && data.newBadges.length > 0) {
    const prev = readGamification();
    const merged = new Set([...(prev.badges ?? []), ...(data.newBadges as string[])]);
    patch.badges = [...merged].sort();
  }
  if (Object.keys(patch).length > 0) persistGamification(patch);
}

export async function refreshGamificationFromServer(): Promise<Partial<StoredGamification>> {
  const token = getAuthItem("token");
  if (!token) return {};
  const url = apiUrl("/api/auth/gamification");
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return readGamification();
    const g = (await res.json()) as Record<string, unknown>;
    persistGamification({
      experience: typeof g.experience === "number" ? g.experience : undefined,
      level: typeof g.level === "number" ? g.level : undefined,
      xpToNext: typeof g.xpToNext === "number" ? g.xpToNext : undefined,
      badges: Array.isArray(g.badges) ? (g.badges as string[]) : undefined,
      maxBetSlot: typeof g.maxBetSlot === "number" ? g.maxBetSlot : undefined,
      maxBetRouletteLine: typeof g.maxBetRouletteLine === "number" ? g.maxBetRouletteLine : undefined,
      maxRouletteTotalStake: typeof g.maxRouletteTotalStake === "number" ? g.maxRouletteTotalStake : undefined,
      maxBetBlackjack: typeof g.maxBetBlackjack === "number" ? g.maxBetBlackjack : undefined,
    });
    return readGamification();
  } catch {
    return readGamification();
  }
}

export function clearGamificationStorage(): void {
  localStorage.removeItem(KEY);
  notifyGamificationChanged();
}

/** Plafond absolu par main, aligné sur `BLACKJACK_MAX_BET_CAP` serveur. */
export const CLIENT_BLACKJACK_MAX_BET_CAP = 1000;

/** Mise max blackjack affichée (profil joueur), ou 375 par défaut tant que le profil n’est pas chargé. */
export function getDisplayedBlackjackMaxBet(): number {
  const v = readGamification().maxBetBlackjack;
  if (typeof v === "number" && Number.isFinite(v)) {
    return Math.min(CLIENT_BLACKJACK_MAX_BET_CAP, Math.max(10, Math.floor(v)));
  }
  return 375;
}
