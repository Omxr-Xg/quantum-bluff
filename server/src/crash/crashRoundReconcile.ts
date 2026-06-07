import { isRoundCrashed, multiplierAtElapsedSeconds } from '../logic/crash.js'
import type { CrashRound } from './crashRoundStore.js'

/** Au-delà de cette durée, une manche « running » abandonnée est clôturée (mise perdue). */
export const CRASH_ABANDON_RUNNING_SEC = 90

export function elapsedCrashSec(startedAtMs: number, now = Date.now()): number {
  return Math.max(0, (now - startedAtMs) / 1000)
}

/** Clôture une manche running si le crash est dépassé ou si le joueur a abandonné. */
export function reconcileCrashRound(round: CrashRound, now = Date.now()): CrashRound {
  if (round.status !== 'running') return round
  const elapsed = elapsedCrashSec(round.startedAtMs, now)
  if (isRoundCrashed(elapsed, round.crashPoint) || elapsed >= CRASH_ABANDON_RUNNING_SEC) {
    return { ...round, status: 'crashed' }
  }
  return round
}

export function crashRoundPublicView(round: CrashRound, now = Date.now()) {
  const elapsed = elapsedCrashSec(round.startedAtMs, now)
  return {
    roundId: round.roundId,
    bet: round.bet,
    startedAt: round.startedAtMs,
    status: round.status,
    multiplier: multiplierAtElapsedSeconds(elapsed),
  }
}
