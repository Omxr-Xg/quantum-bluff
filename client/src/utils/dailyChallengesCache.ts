/** Cache session pour affichage instantané des défis au retour sur le lobby. */

export type CachedDailyChallenge = {
  code: string;
  i18nKey: string;
  category: string;
  progress: number;
  goal: number;
  completed: boolean;
  claimed: boolean;
  rewardTokens: number;
};

export type CachedWeeklyBonus = {
  code: string;
  weekKey: string;
  i18nKey: string;
  progress: number;
  goal: number;
  completed: boolean;
  claimed: boolean;
  rewardTokens: number;
  badgeId: string;
};

export type DailyChallengesPayload = {
  dayKey: string;
  cycleDay: number;
  challenges: CachedDailyChallenge[];
  weeklyChallenges: CachedDailyChallenge[];
  weeklyBonus: CachedWeeklyBonus;
};

const STORAGE_PREFIX = "qb-daily-challenges:";

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function readDailyChallengesCache(userId: string): DailyChallengesPayload | null {
  try {
    const raw = sessionStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailyChallengesPayload;
    if (!parsed?.dayKey || !Array.isArray(parsed.challenges)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeDailyChallengesCache(userId: string, payload: DailyChallengesPayload): void {
  try {
    sessionStorage.setItem(storageKey(userId), JSON.stringify(payload));
  } catch {
    /* quota / mode privé */
  }
}

export function clearDailyChallengesCache(userId: string): void {
  try {
    sessionStorage.removeItem(storageKey(userId));
  } catch {
    /* ignore */
  }
}
