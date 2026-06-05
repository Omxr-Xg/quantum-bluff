import { intChips } from '../utils/chips.js'

export const CRASH_MIN_BET = 10
export const CRASH_MAX_BET = 500
export const CRASH_BET_STEP = 10
/** Croissance exponentielle : m(t) = e^(rate × t secondes). */
export const CRASH_GROWTH_RATE = 0.21
/** Tolérance réseau / frame sur le multiplicateur déclaré au cashout. */
export const CRASH_CASHOUT_TOLERANCE = 0.08

export type CrashBetValidation =
  | { ok: true; bet: number }
  | { ok: false; code: 'INVALID_BET' | 'BET_TOO_LOW' | 'BET_TOO_HIGH' | 'BET_STEP' | 'INSUFFICIENT_CHIPS' }

export function validateCrashBet(
  rawBet: unknown,
  chips: number,
  maxBet: number = CRASH_MAX_BET,
): CrashBetValidation {
  const betInput = typeof rawBet === 'number' ? rawBet : Number(rawBet)
  if (!Number.isFinite(betInput)) return { ok: false, code: 'INVALID_BET' }
  const bet = intChips(betInput)
  if (bet < CRASH_MIN_BET) return { ok: false, code: 'BET_TOO_LOW' }
  if (bet > maxBet) return { ok: false, code: 'BET_TOO_HIGH' }
  if (bet % CRASH_BET_STEP !== 0) return { ok: false, code: 'BET_STEP' }
  if (chips < bet) return { ok: false, code: 'INSUFFICIENT_CHIPS' }
  return { ok: true, bet }
}

/** Multiplicateur affiché à t secondes (2 décimales). */
export function multiplierAtElapsedSeconds(elapsedSec: number): number {
  if (elapsedSec <= 0) return 1
  const m = Math.exp(CRASH_GROWTH_RATE * elapsedSec)
  return Math.floor(m * 100) / 100
}

export function elapsedSecondsForMultiplier(multiplier: number): number {
  if (multiplier <= 1) return 0
  return Math.log(multiplier) / CRASH_GROWTH_RATE
}

/** Distribution pondérée du point de crash (serveur uniquement). */
export function generateCrashPoint(randomUnit: () => number): number {
  const r = randomUnit()
  let min: number
  let max: number
  if (r < 0.7) {
    min = 1.01
    max = 2
  } else if (r < 0.9) {
    min = 2
    max = 5
  } else if (r < 0.98) {
    min = 5
    max = 10
  } else {
    min = 10
    max = 50
  }
  const raw = min + randomUnit() * (max - min)
  return Math.floor(raw * 100) / 100
}

export function computeCrashPayout(bet: number, multiplier: number): number {
  return intChips(Math.floor(bet * multiplier))
}

export function isRoundCrashed(elapsedSec: number, crashPoint: number): boolean {
  return multiplierAtElapsedSeconds(elapsedSec) >= crashPoint
}

export function validateCashoutMultiplier(
  requested: number,
  elapsedSec: number,
  crashPoint: number,
): { ok: true; multiplier: number } | { ok: false; code: 'TOO_EARLY' | 'TOO_HIGH' | 'ALREADY_CRASHED' | 'INVALID_MULTIPLIER' } {
  if (!Number.isFinite(requested) || requested < 1) {
    return { ok: false, code: 'INVALID_MULTIPLIER' }
  }
  const serverMult = multiplierAtElapsedSeconds(elapsedSec)
  if (isRoundCrashed(elapsedSec, crashPoint)) {
    return { ok: false, code: 'ALREADY_CRASHED' }
  }
  if (requested > serverMult + CRASH_CASHOUT_TOLERANCE) {
    return { ok: false, code: 'TOO_HIGH' }
  }
  if (requested >= crashPoint) {
    return { ok: false, code: 'ALREADY_CRASHED' }
  }
  const multiplier = Math.floor(Math.min(requested, serverMult) * 100) / 100
  if (multiplier < 1) return { ok: false, code: 'TOO_EARLY' }
  return { ok: true, multiplier }
}
