import type { BeloteCard, BeloteRank, BeloteSuit } from './types.js'

/** Faible → fort à l’atout : 7 … J (le Valet est la carte maîtresse). */
export const TRUMP_RANK_WEAK_TO_STRONG: BeloteRank[] = ['7', '8', 'Q', 'K', '10', 'A', '9', 'J']
/** Faible → fort en couleur (hors atout) : 7 … A (l’As est la carte maîtresse). */
export const SIDE_RANK_WEAK_TO_STRONG: BeloteRank[] = ['7', '8', '9', 'J', 'Q', 'K', '10', 'A']

const TRUMP_ORDER = TRUMP_RANK_WEAK_TO_STRONG
const NON_TRUMP_ORDER = SIDE_RANK_WEAK_TO_STRONG

function normalizeRank(rank: string): BeloteRank {
  const r = rank.toUpperCase()
  if (r === '10') return '10'
  if (['7', '8', '9', 'J', 'Q', 'K', 'A'].includes(r)) return r as BeloteRank
  return '7'
}

function rankIndex(order: BeloteRank[], rank: string): number {
  const i = order.indexOf(normalizeRank(rank))
  return i >= 0 ? i : 0
}

const TRUMP_POINTS: Record<BeloteRank, number> = {
  '7': 0,
  '8': 0,
  '9': 14,
  '10': 10,
  J: 20,
  Q: 3,
  K: 4,
  A: 11,
}

const NON_TRUMP_POINTS: Record<BeloteRank, number> = {
  '7': 0,
  '8': 0,
  '9': 0,
  '10': 10,
  J: 2,
  Q: 3,
  K: 4,
  A: 11,
}

export function cardPoints(card: BeloteCard, trump: BeloteSuit): number {
  if (card.suit === trump) return TRUMP_POINTS[card.rank]
  return NON_TRUMP_POINTS[card.rank]
}

export function trickCardStrength(card: BeloteCard, trump: BeloteSuit, ledSuit: BeloteSuit): number {
  const isTrump = card.suit === trump
  const isLed = card.suit === ledSuit
  if (isTrump) return 100 + rankIndex(TRUMP_ORDER, card.rank)
  if (isLed) return 50 + rankIndex(NON_TRUMP_ORDER, card.rank)
  return -1
}

export function sumTrickPoints(cards: BeloteCard[], trump: BeloteSuit): number {
  return cards.reduce((sum, c) => sum + cardPoints(c, trump), 0)
}

/** Dix de der: +10 to last trick winner's team (applied in controller). */
export const DIX_DE_DER = 10

/** Total card points in a belote deck (excluding dix de der). */
export const TOTAL_CARD_POINTS = 152
