import type { CasinoRoundContext } from '../../casino/domain/casinoRound.types.js'
import { HIDDEN_BETS_PRICING_VERSION } from './types.js'

export function createHiddenBetLedgerContext(input: {
  userId: string
  actionId: string
  gameId: string
  handId: string
}): CasinoRoundContext {
  return {
    roundId: `${input.gameId}:${input.handId}`,
    actionId: input.actionId,
    userId: input.userId,
    gameType: 'poker_hidden_bet',
    engineVersion: 'poker-hidden-bets-v1',
    rulesVersion: HIDDEN_BETS_PRICING_VERSION,
    payoutTableVersion: HIDDEN_BETS_PRICING_VERSION,
    rngVersion: 'n/a',
  }
}
