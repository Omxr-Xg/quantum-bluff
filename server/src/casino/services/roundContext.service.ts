import { randomUUID } from 'node:crypto'
import { RNG_VERSION } from '../../rng/rng.service.js'
import type { CasinoRoundContext } from '../domain/casinoRound.types.js'

export const CASINO_ENGINE_VERSION = 'casino-engine-v1'
export const CASINO_RULES_VERSION = 'casino-rules-v1'
export const CASINO_PAYOUT_TABLE_VERSION = 'casino-payout-v1'

export function createCasinoRoundContext(input: {
  userId: string
  gameType: 'roulette' | 'slot' | 'blackjack'
  actionId?: string
  roundId?: string
}): CasinoRoundContext {
  const actionId = input.actionId?.trim() || randomUUID()
  const roundId = input.roundId?.trim() || randomUUID()
  return {
    roundId,
    actionId,
    userId: input.userId,
    gameType: input.gameType,
    engineVersion: CASINO_ENGINE_VERSION,
    rulesVersion: CASINO_RULES_VERSION,
    payoutTableVersion: CASINO_PAYOUT_TABLE_VERSION,
    rngVersion: RNG_VERSION,
  }
}

