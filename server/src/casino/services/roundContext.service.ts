import { randomUUID } from 'node:crypto'
import { RNG_VERSION } from '../../rng/rng.service.js'
import type { CasinoRoundContext } from '../domain/casinoRound.types.js'

export const CASINO_ENGINE_VERSION = 'casino-engine-v1'
export const CASINO_RULES_VERSION = 'casino-rules-v1'
export const CASINO_PAYOUT_TABLE_VERSION = 'casino-payout-v1'

export function createCasinoRoundContext(input: {
  userId: string
  gameType: 'roulette' | 'slot' | 'blackjack' | 'poker_hidden_bet' | 'friend_loan' | 'belote'
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

/** Contexte ledger pour opérations prêt entre amis (hors moteur casino RNG). */
export function createFriendLoanLedgerContext(input: {
  userId: string
  loanId: string
  actionId?: string
}): CasinoRoundContext {
  return createCasinoRoundContext({
    userId: input.userId,
    gameType: 'friend_loan',
    roundId: `loan:${input.loanId}`,
    actionId: input.actionId,
  })
}

