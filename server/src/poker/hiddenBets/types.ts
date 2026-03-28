import type { Card, Rank } from '../../types/poker.js'

export const HIDDEN_BETS_PRICING_VERSION = 'hidden-bets-v1'
export const HIDDEN_BETS_RESOLUTION_VERSION = 'hidden-bets-resolve-v1'
export const QUOTE_TTL_MS = 60_000

export type HandEndReason = 'WIN_BY_FOLD' | 'SHOWDOWN' | 'ALL_IN_RUNOUT' | 'FORCED_END' | undefined

export type MarketType =
  | 'PLAYER_WINS'
  | 'WINNING_HAND_CLASS'
  | 'WINNING_HAND_CONTAINS_RANK'

/** Classes alignées sur Evaluator category 0–9 */
export type WinningHandClassKey =
  | 'HIGH_CARD'
  | 'PAIR'
  | 'TWO_PAIR'
  | 'THREE_OF_A_KIND'
  | 'STRAIGHT'
  | 'FLUSH'
  | 'QUANTUM_COMBI'
  | 'FULL_HOUSE'
  | 'FOUR_OF_A_KIND'
  | 'STRAIGHT_FLUSH'

export const CATEGORY_TO_CLASS_KEY: Record<number, WinningHandClassKey> = {
  0: 'HIGH_CARD',
  1: 'PAIR',
  2: 'TWO_PAIR',
  3: 'THREE_OF_A_KIND',
  4: 'STRAIGHT',
  5: 'FLUSH',
  6: 'QUANTUM_COMBI',
  7: 'FULL_HOUSE',
  8: 'FOUR_OF_A_KIND',
  9: 'STRAIGHT_FLUSH',
}

export const CLASS_KEY_TO_CATEGORY: Record<WinningHandClassKey, number> = {
  HIGH_CARD: 0,
  PAIR: 1,
  TWO_PAIR: 2,
  THREE_OF_A_KIND: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  QUANTUM_COMBI: 6,
  FULL_HOUSE: 7,
  FOUR_OF_A_KIND: 8,
  STRAIGHT_FLUSH: 9,
}

export type SelectionPayload =
  | { marketType: 'PLAYER_WINS'; playerId: string }
  | { marketType: 'WINNING_HAND_CLASS'; class: WinningHandClassKey }
  | { marketType: 'WINNING_HAND_CONTAINS_RANK'; rank: Rank }

export interface QuoteRequestBody {
  gameId: string
  handId: string
  combinator: 'SINGLE' | 'AND'
  selections: SelectionPayload[]
}

export interface HiddenBetResolutionPayload {
  gameId: string
  handId: string
  winnerIds: string[]
  handEndReason: HandEndReason
  /** Catégorie 0–9 de la main gagnante (premier gagnant en split). */
  winningCategory: number
  board: Card[]
  /** Cartes par joueur encore en jeu au showdown ; pour fold, seulement le gagnant. */
  playerCards: Record<string, Card[]>
}
