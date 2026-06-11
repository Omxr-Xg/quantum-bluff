import type { DailyChallengeCode } from './dailyChallenge.types.js'

export const WEEKLY_SOCIAL_FOLLOW_CODES = [
  'WEEKLY_FOLLOW_INSTAGRAM',
  'WEEKLY_FOLLOW_TIKTOK',
  'WEEKLY_FOLLOW_LINKEDIN',
] as const

export type WeeklySocialFollowCode = (typeof WEEKLY_SOCIAL_FOLLOW_CODES)[number]

export const SOCIAL_FOLLOW_URLS: Record<WeeklySocialFollowCode, string> = {
  WEEKLY_FOLLOW_INSTAGRAM: 'https://www.instagram.com/quantum_bluff/',
  WEEKLY_FOLLOW_TIKTOK: 'https://www.tiktok.com/@quantum_bluff',
  WEEKLY_FOLLOW_LINKEDIN: 'https://www.linkedin.com/company/quantum-bluff',
}

export const SOCIAL_FOLLOW_MIN_AWAY_MS = 3_000
export const SOCIAL_FOLLOW_MAX_AWAY_MS = 30 * 60_000

export function isSocialFollowChallengeCode(code: string): code is WeeklySocialFollowCode {
  return (WEEKLY_SOCIAL_FOLLOW_CODES as readonly string[]).includes(code)
}

export function assertSocialFollowCode(code: string): WeeklySocialFollowCode {
  if (!isSocialFollowChallengeCode(code)) {
    throw new Error(`Not a social follow challenge: ${code}`)
  }
  return code
}

export function isWeeklySocialFollowCode(code: DailyChallengeCode): boolean {
  return isSocialFollowChallengeCode(code)
}
