import type { CasinoRoundState } from '../domain/casinoRound.types.js'

const allowedTransitions: Record<CasinoRoundState, CasinoRoundState[]> = {
  CREATED: ['BETTING_OPEN', 'FAILED'],
  BETTING_OPEN: ['BETTING_CLOSED', 'FAILED'],
  BETTING_CLOSED: ['SPINNING', 'FAILED'],
  SPINNING: ['RESULT_READY', 'FAILED'],
  RESULT_READY: ['SETTLED', 'FAILED'],
  SETTLED: ['ARCHIVED'],
  FAILED: ['ROLLED_BACK', 'ARCHIVED'],
  ROLLED_BACK: ['ARCHIVED'],
  ARCHIVED: [],
}

export function assertRoundTransition(
  from: CasinoRoundState,
  to: CasinoRoundState
): void {
  const next = allowedTransitions[from] ?? []
  if (!next.includes(to)) {
    throw new Error(`INVALID_ROUND_STATE_TRANSITION:${from}->${to}`)
  }
}

