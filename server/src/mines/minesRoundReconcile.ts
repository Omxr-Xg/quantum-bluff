import type { MinesRound } from './minesRoundStore.js'

/** Manche Mines abandonnée (onglet fermé) — bust automatique, mise déjà débitée. */
export const MINES_ABANDON_RUNNING_MS = 5 * 60 * 1000

export function reconcileMinesRound(round: MinesRound, now = Date.now()): MinesRound {
  if (round.status !== 'running') return round
  if (now - round.startedAtMs >= MINES_ABANDON_RUNNING_MS) {
    return { ...round, status: 'busted', currentMultiplier: 0 }
  }
  return round
}

export function minesRoundPublicView(round: MinesRound) {
  return {
    roundId: round.roundId,
    bet: round.bet,
    mineCount: round.mineCount,
    revealedCells: round.revealedCells,
    multiplier: round.currentMultiplier,
    status: round.status,
    startedAt: round.startedAtMs,
  }
}
