import type { BeloteCard, BeloteGameState, BeloteSuit, BeloteTrumpChoice, BeloteTrumpMode } from './types.js'
import { cardPoints as suitCardPoints, trickCardStrength as suitTrickStrength } from './scoring.js'
import { TRUMP_RANK_WEAK_TO_STRONG, SIDE_RANK_WEAK_TO_STRONG } from './scoring.js'
import type { BeloteRank } from './types.js'

export type TrumpContext = {
  mode: BeloteTrumpMode
  /** Couleur d’atout (SUIT) ou couleur de référence pour la belote annoncée. */
  suit: BeloteSuit
}

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

export function trumpChoiceToMode(choice: BeloteTrumpChoice): BeloteTrumpMode {
  if (choice === 'ALL_TRUMP') return 'ALL_TRUMP'
  if (choice === 'NO_TRUMP') return 'NO_TRUMP'
  return 'SUIT'
}

export function resolveTrumpContext(state: BeloteGameState): TrumpContext | null {
  const mode = state.deal.trumpMode ?? (state.deal.trump ? 'SUIT' : null)
  if (!mode) return null
  const suit = state.deal.trump ?? 'SPADES'
  return { mode, suit }
}

export function cardPoints(card: BeloteCard, ctx: TrumpContext): number {
  if (ctx.mode === 'ALL_TRUMP') {
    return suitCardPoints(card, ctx.suit) // all cards use trump point table
  }
  if (ctx.mode === 'NO_TRUMP') {
    const other =
      card.suit === 'HEARTS' ? 'CLUBS' : ('HEARTS' as BeloteSuit)
    return suitCardPoints(card, other)
  }
  return suitCardPoints(card, ctx.suit)
}

export function trickCardStrength(
  card: BeloteCard,
  ctx: TrumpContext,
  ledSuit: BeloteSuit,
): number {
  if (ctx.mode === 'ALL_TRUMP') {
    return 100 + rankIndex(TRUMP_RANK_WEAK_TO_STRONG, card.rank)
  }
  if (ctx.mode === 'NO_TRUMP') {
    if (card.suit === ledSuit) {
      return 50 + rankIndex(SIDE_RANK_WEAK_TO_STRONG, card.rank)
    }
    return -1
  }
  return suitTrickStrength(card, ctx.suit, ledSuit)
}

export function isTrumpCard(card: BeloteCard, ctx: TrumpContext): boolean {
  if (ctx.mode === 'ALL_TRUMP') return true
  if (ctx.mode === 'NO_TRUMP') return false
  return card.suit === ctx.suit
}
