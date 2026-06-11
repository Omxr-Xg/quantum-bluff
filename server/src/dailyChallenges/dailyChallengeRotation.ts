import type { DailyChallengeCode } from './dailyChallenge.types.js'
import { WEEKLY_SOCIAL_FOLLOW_CODES } from './socialFollowChallenges.js'

/** Jour 1 = 2026-01-01 UTC (cycle de 7 jours). */
const ROTATION_EPOCH_UTC = Date.parse('2026-01-01T00:00:00.000Z')
const MS_PER_DAY = 86_400_000

export const DAILY_CHALLENGE_ROTATION: Readonly<Record<number, readonly DailyChallengeCode[]>> = {
  1: ['WIN_WITH_PAIR', 'WIN_200_ROULETTE', 'PLAY_5_TIMES', 'WIN_200_SLOT'],
  2: ['WIN_SHOWDOWN', 'WIN_3_BLACKJACK', 'CRASH_CASHOUT_2X', 'SEND_3_CHAT'],
  3: ['WIN_BELOTE_MATCH', 'ROULETTE_10_BETS', 'POKER_10_HANDS', 'ONLINE_15_MIN'],
  4: ['SLOT_20_SPINS', 'BLACKJACK_NATURAL', 'CRASH_5_ROUNDS', 'POKER_WIN_500_CHIPS'],
  5: ['WHEEL_5_SPINS', 'LUCKY_NUMBER_10_ROUNDS', 'WIN_3_MULTIPLAYER', 'INVITE_FRIEND'],
  6: ['REACH_RIVER_5', 'BELOTE_100_POINTS', 'ROULETTE_COLOR_WIN_3', 'SLOT_BONUS_WIN'],
  7: ['WIN_2_HANDS_ROW', 'BLACKJACK_WIN_500', 'CRASH_CASHOUT_3X', 'COMPLETE_ALL_DAILY'],
}

export const META_DAILY_CHALLENGE_CODE = 'COMPLETE_ALL_DAILY' as const

export const DAY_7_GAMEPLAY_CODES: readonly DailyChallengeCode[] = [
  'WIN_2_HANDS_ROW',
  'BLACKJACK_WIN_500',
  'CRASH_CASHOUT_3X',
]

/** @deprecated Ancien défi unique — conservé pour les lignes historiques en base. */
export const LEGACY_WEEKLY_CHALLENGE_CODE = 'WEEKLY_COMPLETE_20' as const

export const WEEKLY_MISSION_CODES = [
  'WEEKLY_POKER_20_HANDS',
  'WEEKLY_WIN_5_GAMES',
  'WEEKLY_INVITE_FRIEND',
  'WEEKLY_BELOTE_3_MATCHES',
  'WEEKLY_WIN_10K_CHIPS',
] as const

export const WEEKLY_BONUS_CODE = 'WEEKLY_BONUS' as const
export const WEEKLY_BONUS_GOAL = WEEKLY_MISSION_CODES.length
export const WEEKLY_BONUS_REWARD = 20_000
export const WEEKLY_BONUS_BADGE_ID = 'weekly_champion'

export const WEEKLY_CHALLENGE_CODES = [
  ...WEEKLY_MISSION_CODES,
  ...WEEKLY_SOCIAL_FOLLOW_CODES,
  WEEKLY_BONUS_CODE,
] as const

export { WEEKLY_SOCIAL_FOLLOW_CODES }

export function isWeeklyChallengeCode(code: string): boolean {
  return (WEEKLY_CHALLENGE_CODES as readonly string[]).includes(code)
}

export function isWeeklyMissionCode(code: string): boolean {
  return (WEEKLY_MISSION_CODES as readonly string[]).includes(code)
}

export function getDayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function getCycleDayIndex(now = new Date()): number {
  const dayKey = getDayKey(now)
  const dayMs = Date.parse(`${dayKey}T00:00:00.000Z`)
  const daysSince = Math.floor((dayMs - ROTATION_EPOCH_UTC) / MS_PER_DAY)
  return ((daysSince % 7) + 7) % 7 + 1
}

export function getActiveChallengeCodesForDate(now = new Date()): DailyChallengeCode[] {
  const day = getCycleDayIndex(now)
  return [...(DAILY_CHALLENGE_ROTATION[day] ?? DAILY_CHALLENGE_ROTATION[1]!)]
}

export function getWeekKey(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / MS_PER_DAY) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

export function getWeekStorageDayKey(weekKey = getWeekKey()): string {
  return `week:${weekKey}`
}

/** Bornes lundi–dimanche (UTC) pour compter les réclamations quotidiennes. */
export function getWeekCalendarBounds(weekKey: string): { start: string; end: string } {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekKey)
  if (!match) {
    const today = getDayKey()
    return { start: today, end: today }
  }
  const year = Number(match[1])
  const week = Number(match[2])
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() || 7
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  }
}
