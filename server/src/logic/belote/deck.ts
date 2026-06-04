import { drawInt } from '../../rng/rng.service.js'
import type { BeloteCard, BeloteRank, BeloteSuit } from './types.js'

const SUITS: BeloteSuit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES']
const RANKS: BeloteRank[] = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A']

export function createBeloteDeck(): BeloteCard[] {
  const deck: BeloteCard[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank })
    }
  }
  return deck
}

export function shuffleBeloteDeck(deck: BeloteCard[], gameId: string, dealIndex: number): BeloteCard[] {
  const cards = [...deck]
  for (let i = cards.length - 1; i > 0; i--) {
    const j = drawInt('belote', gameId, `belote.shuffle.${dealIndex}`, 0, i).value
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }
  return cards
}

export function cardKey(c: BeloteCard): string {
  return `${c.rank}_${c.suit}`
}

export function cardsEqual(a: BeloteCard, b: BeloteCard): boolean {
  return a.rank === b.rank && a.suit === b.suit
}

export function removeCardFromHand(hand: BeloteCard[], card: BeloteCard): BeloteCard[] {
  const idx = hand.findIndex((c) => cardsEqual(c, card))
  if (idx < 0) return hand
  return [...hand.slice(0, idx), ...hand.slice(idx + 1)]
}
