import type { CasinoRoundContext } from '../../casino/domain/casinoRound.types.js'

export function createPokerCashLedgerContext(input: {
  userId: string
  gameId: string
  handId: string
  actionId: string
}): CasinoRoundContext {
  return {
    roundId: `${input.gameId}:${input.handId}`,
    actionId: input.actionId,
    userId: input.userId,
    gameType: 'poker_cash',
    engineVersion: '1',
    rulesVersion: '1',
    payoutTableVersion: 'n/a',
    rngVersion: 'n/a',
  }
}
