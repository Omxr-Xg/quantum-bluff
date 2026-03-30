import type { Card, Rank } from '../../types/poker.js'

/** @deprecated Utiliser HIDDEN_BETS_PRE_PRICING_VERSION pour les nouveaux tickets */
export const HIDDEN_BETS_PRICING_VERSION = 'hidden-bets-pre-v1'
export const HIDDEN_BETS_PRE_PRICING_VERSION = 'hidden-bets-pre-v1'
export const HIDDEN_BETS_LIVE_PRICING_VERSION = 'hidden-bets-live-v1'
export const HIDDEN_BETS_RESOLUTION_VERSION = 'hidden-bets-resolve-v1'
export const QUOTE_TTL_MS = 60_000

export type HandEndReason = 'WIN_BY_FOLD' | 'SHOWDOWN' | 'ALL_IN_RUNOUT' | 'FORCED_END' | undefined

/** Phases API / Prisma (V1 LIVE sans PREFLOP). */
export type HiddenBetMarketPhase = 'PRE_HAND' | 'LIVE_FLOP' | 'LIVE_TURN' | 'LIVE_RIVER'

export type HiddenBetWindowType = 'PRE_HAND' | 'LIVE_FLOP' | 'LIVE_TURN' | 'LIVE_RIVER' | null

export type MarketType =
  | 'PLAYER_WINS'
  | 'WINNING_HAND_CLASS'
  | 'WINNING_HAND_CONTAINS_RANK'
  | 'PLAYER_WINS_CURRENT_HAND'
  | 'HAND_REACHES_SHOWDOWN'
  | 'HAND_ENDS_BY_FOLD'
  | 'FINAL_WINNING_HAND_CLASS'

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
  | { marketType: 'PLAYER_WINS_CURRENT_HAND'; playerId: string }
  | { marketType: 'HAND_REACHES_SHOWDOWN' }
  | { marketType: 'HAND_ENDS_BY_FOLD' }
  | { marketType: 'FINAL_WINNING_HAND_CLASS'; class: WinningHandClassKey }

export interface QuoteRequestBody {
  gameId: string
  /** @deprecated utiliser targetHandId */
  handId?: string
  targetHandId?: string
  marketPhase: HiddenBetMarketPhase
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

export function pricingVersionForPhase(phase: HiddenBetMarketPhase): string {
  return phase === 'PRE_HAND' ? HIDDEN_BETS_PRE_PRICING_VERSION : HIDDEN_BETS_LIVE_PRICING_VERSION
}
