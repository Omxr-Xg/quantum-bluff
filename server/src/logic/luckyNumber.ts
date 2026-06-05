import { intChips } from '../utils/chips.js'

export const LUCKY_NUMBER_MIN_BET = 10
export const LUCKY_NUMBER_MAX_BET = 500
export const LUCKY_NUMBER_BET_STEP = 10
export const LUCKY_NUMBER_MIN = 1
export const LUCKY_NUMBER_MAX = 10
export const LUCKY_NUMBER_WIN_MULTIPLIER = 8

export type LuckyNumberBetValidation =
  | { ok: true; bet: number }
  | { ok: false; code: 'INVALID_BET' | 'BET_TOO_LOW' | 'BET_TOO_HIGH' | 'BET_STEP' | 'INSUFFICIENT_CHIPS' }

export type LuckyNumberSelectionValidation =
  | { ok: true; selectedNumber: number }
  | { ok: false; code: 'INVALID_NUMBER' | 'NUMBER_OUT_OF_RANGE' }

export function validateLuckyNumberBet(
  rawBet: unknown,
  chips: number,
  maxBet: number = LUCKY_NUMBER_MAX_BET,
): LuckyNumberBetValidation {
  const betInput = typeof rawBet === 'number' ? rawBet : Number(rawBet)
  if (!Number.isFinite(betInput)) return { ok: false, code: 'INVALID_BET' }
  const bet = intChips(betInput)
  if (bet < LUCKY_NUMBER_MIN_BET) return { ok: false, code: 'BET_TOO_LOW' }
  if (bet > maxBet) return { ok: false, code: 'BET_TOO_HIGH' }
  if (bet % LUCKY_NUMBER_BET_STEP !== 0) return { ok: false, code: 'BET_STEP' }
  if (chips < bet) return { ok: false, code: 'INSUFFICIENT_CHIPS' }
  return { ok: true, bet }
}

export function validateSelectedNumber(raw: unknown): LuckyNumberSelectionValidation {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n) || !Number.isInteger(n)) return { ok: false, code: 'INVALID_NUMBER' }
  if (n < LUCKY_NUMBER_MIN || n > LUCKY_NUMBER_MAX) return { ok: false, code: 'NUMBER_OUT_OF_RANGE' }
  return { ok: true, selectedNumber: n }
}

/** Tirage uniforme entre 1 et 10 (inclus). */
export function pickLuckyNumber(randomUnit: () => number): number {
  const r = randomUnit()
  return Math.min(LUCKY_NUMBER_MAX, 1 + Math.floor(r * LUCKY_NUMBER_MAX))
}

export function isLuckyNumberWin(selectedNumber: number, drawnNumber: number): boolean {
  return selectedNumber === drawnNumber
}

export function computeLuckyNumberPayout(bet: number, win: boolean): number {
  if (!win) return 0
  return intChips(bet * LUCKY_NUMBER_WIN_MULTIPLIER)
}
