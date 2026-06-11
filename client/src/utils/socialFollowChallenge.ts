export const WEEKLY_SOCIAL_FOLLOW_CODES = [
  "WEEKLY_FOLLOW_INSTAGRAM",
  "WEEKLY_FOLLOW_TIKTOK",
  "WEEKLY_FOLLOW_LINKEDIN",
] as const;

export type WeeklySocialFollowCode = (typeof WEEKLY_SOCIAL_FOLLOW_CODES)[number];

export const SOCIAL_FOLLOW_URLS: Record<WeeklySocialFollowCode, string> = {
  WEEKLY_FOLLOW_INSTAGRAM: "https://www.instagram.com/quantum_bluff/",
  WEEKLY_FOLLOW_TIKTOK: "https://www.tiktok.com/@quantum_bluff",
  WEEKLY_FOLLOW_LINKEDIN: "https://www.linkedin.com/company/quantum-bluff",
};

export const SOCIAL_FOLLOW_MIN_AWAY_MS = 3_000;

const PENDING_KEY = "qb-social-follow-pending";

type PendingSocialFollow = {
  code: WeeklySocialFollowCode;
  startedAt: number;
};

export function isSocialFollowChallenge(code: string): code is WeeklySocialFollowCode {
  return (WEEKLY_SOCIAL_FOLLOW_CODES as readonly string[]).includes(code);
}

export function getSocialFollowUrl(code: WeeklySocialFollowCode): string {
  return SOCIAL_FOLLOW_URLS[code];
}

export function setPendingSocialFollow(code: WeeklySocialFollowCode): void {
  const payload: PendingSocialFollow = { code, startedAt: Date.now() };
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload));
}

export function getPendingSocialFollow(): PendingSocialFollow | null {
  const raw = sessionStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingSocialFollow;
    if (!isSocialFollowChallenge(parsed.code)) return null;
    if (typeof parsed.startedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingSocialFollow(): void {
  sessionStorage.removeItem(PENDING_KEY);
}
