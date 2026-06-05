import { intChips } from '../utils/chips.js'

export const WHEEL_MIN_BET = 10
export const WHEEL_MAX_BET = 500
export const WHEEL_BET_STEP = 10
export const WHEEL_SEGMENT_COUNT = 12
export const WHEEL_SLICE_DEG = 360 / WHEEL_SEGMENT_COUNT

export type WheelSegmentKind =
  | 'x0'
  | 'x0_5'
  | 'x1'
  | 'x1_5'
  | 'x2'
  | 'x3'
  | 'x5'
  | 'jackpot'

export type WheelSegment = {
  kind: WheelSegmentKind
  multiplier: number
  label: string
}

/** 12 segments visuels — ordre horaire depuis le haut. */
export const WHEEL_SEGMENTS: readonly WheelSegment[] = [
  { kind: 'x0', multiplier: 0, label: 'x0' },
  { kind: 'x0', multiplier: 0, label: 'x0' },
  { kind: 'x0', multiplier: 0, label: 'x0' },
  { kind: 'x0_5', multiplier: 0.5, label: 'x0.5' },
  { kind: 'x0_5', multiplier: 0.5, label: 'x0.5' },
  { kind: 'x1', multiplier: 1, label: 'x1' },
  { kind: 'x1', multiplier: 1, label: 'x1' },
  { kind: 'x1_5', multiplier: 1.5, label: 'x1.5' },
  { kind: 'x2', multiplier: 2, label: 'x2' },
  { kind: 'x3', multiplier: 3, label: 'x3' },
  { kind: 'x5', multiplier: 5, label: 'x5' },
  { kind: 'jackpot', multiplier: 20, label: 'JACKPOT' },
] as const

export type WheelBetValidation =
  | { ok: true; bet: number }
  | { ok: false; code: 'INVALID_BET' | 'BET_TOO_LOW' | 'BET_TOO_HIGH' | 'BET_STEP' | 'INSUFFICIENT_CHIPS' }

export function validateWheelBet(
  rawBet: unknown,
  chips: number,
  maxBet: number = WHEEL_MAX_BET,
): WheelBetValidation {
  const betInput = typeof rawBet === 'number' ? rawBet : Number(rawBet)
  if (!Number.isFinite(betInput)) return { ok: false, code: 'INVALID_BET' }
  const bet = intChips(betInput)
  if (bet < WHEEL_MIN_BET) return { ok: false, code: 'BET_TOO_LOW' }
  if (bet > maxBet) return { ok: false, code: 'BET_TOO_HIGH' }
  if (bet % WHEEL_BET_STEP !== 0) return { ok: false, code: 'BET_STEP' }
  if (chips < bet) return { ok: false, code: 'INSUFFICIENT_CHIPS' }
  return { ok: true, bet }
}

export function pickWheelSegmentIndex(randomUnit: () => number): number {
  const r = randomUnit()
  return Math.min(WHEEL_SEGMENT_COUNT - 1, Math.floor(r * WHEEL_SEGMENT_COUNT))
}

export function computeWheelPayout(bet: number, multiplier: number): number {
  return intChips(Math.floor(bet * multiplier))
}

/** Angle final (degrés, horaire) pour aligner le segment sous le pointeur fixe en haut. */
export function computeFinalAngle(
  segmentIndex: number,
  randomUnit: () => number,
  minSpins = 5,
  maxSpins = 8,
): number {
  const slice = WHEEL_SLICE_DEG
  const segmentCenter = segmentIndex * slice + slice / 2
  const offset = (360 - segmentCenter) % 360
  const extraSpins = minSpins + Math.floor(randomUnit() * (maxSpins - minSpins + 1))
  return extraSpins * 360 + offset
}

export function getWheelSegment(index: number): WheelSegment {
  const seg = WHEEL_SEGMENTS[index]
  if (!seg) throw new Error('INVALID_SEGMENT_INDEX')
  return seg
}
