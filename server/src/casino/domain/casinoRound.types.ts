export type CasinoRoundState =
  | 'CREATED'
  | 'BETTING_OPEN'
  | 'BETTING_CLOSED'
  | 'SPINNING'
  | 'RESULT_READY'
  | 'SETTLED'
  | 'FAILED'
  | 'ROLLED_BACK'
  | 'ARCHIVED'

export type SettlementState = 'PENDING' | 'SETTLED' | 'FAILED' | 'ROLLED_BACK'

export interface CasinoRoundContext {
  roundId: string
  actionId: string
  userId: string
  gameType: 'roulette' | 'slot' | 'blackjack' | 'poker_hidden_bet' | 'friend_loan' | 'poker_cash' | 'belote' | 'crash' | 'mines' | 'wheel' | 'lucky_number'
  engineVersion: string
  rulesVersion: string
  payoutTableVersion: string
  rngVersion: string
}

