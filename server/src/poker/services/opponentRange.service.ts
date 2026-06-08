import { heroShowdownEquity } from '../../logic/botAI.js'
import type { Card } from '../../types/poker.js'
import type { ExpertPlayerTendency } from '../../logic/botAI.js'

const ALL_RANKS: Card['rank'][] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
const RANK_VALUES: Record<Card['rank'], number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  J: 11, Q: 12, K: 13, A: 14,
}

export type WeightedHole = { cards: Card[]; weight: number }

export type OpponentRangeState = {
  holes: WeightedHole[]
  lastStreet: string
}

function cardKey(c: Card): string {
  return `${c.rank}${c.suit[0]}`
}

function buildDeckExcluding(known: Card[]): Card[] {
  const suits: Card['suit'][] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES']
  const knownSet = new Set(known.map(cardKey))
  const deck: Card[] = []
  for (const suit of suits) {
    for (const rank of ALL_RANKS) {
      const c: Card = { suit, rank, value: RANK_VALUES[rank] }
      if (!knownSet.has(cardKey(c))) deck.push(c)
    }
  }
  return deck
}

function combosFromDeck(deck: Card[], maxCombos: number): WeightedHole[] {
  const out: WeightedHole[] = []
  for (let i = 0; i < deck.length - 1 && out.length < maxCombos; i++) {
    for (let j = i + 1; j < deck.length && out.length < maxCombos; j++) {
      out.push({ cards: [deck[i]!, deck[j]!], weight: 1 })
    }
  }
  return out
}

/** Largeur de range préflop dérivée du profil (proxy % mains). */
function preflopWidth(tendency?: ExpertPlayerTendency): number {
  if (!tendency || tendency.confidence === 'LOW') return 0.35
  const vpip = tendency.vpip
  const pfr = tendency.pfr
  return Math.max(0.12, Math.min(0.55, vpip * 0.85 + pfr * 0.25))
}

export function seedOpponentRange(
  knownCards: Card[],
  tendency?: ExpertPlayerTendency,
): OpponentRangeState {
  const deck = buildDeckExcluding(knownCards)
  const width = preflopWidth(tendency)
  const maxCombos = Math.max(20, Math.floor(combosFromDeck(deck, 9999).length * width))
  return {
    holes: combosFromDeck(deck, maxCombos),
    lastStreet: 'PREFLOP',
  }
}

export function narrowOpponentRange(
  state: OpponentRangeState,
  action: 'FOLD' | 'CALL' | 'RAISE' | 'CHECK',
  equityBp: number,
  street: string,
): OpponentRangeState {
  let holes = state.holes

  if (action === 'RAISE' && equityBp < 3500) {
    holes = holes.filter((h) => h.cards[0]!.value <= 10 || h.cards[1]!.value <= 10)
  } else if (action === 'RAISE') {
    holes = holes.filter((h) => h.cards[0]!.value >= 9 || h.cards[1]!.value >= 9)
  } else if (action === 'CALL') {
    holes = holes.filter((h) => h.cards[0]!.value >= 6)
  } else if (action === 'FOLD') {
    holes = holes.slice(0, Math.max(8, Math.floor(holes.length * 0.4)))
  }

  if (holes.length < 8) {
    holes = state.holes.slice(0, Math.max(8, Math.floor(state.holes.length * 0.5)))
  }

  return { holes, lastStreet: street }
}

/** Équité hero vs range estimée (échantillon des combos). */
export function heroEquityVsRange(
  heroCards: Card[],
  board: Card[],
  range: OpponentRangeState,
  sampleSize = 24,
): number {
  if (heroCards.length < 2 || range.holes.length === 0) return 0.35

  const step = Math.max(1, Math.floor(range.holes.length / sampleSize))
  let sum = 0
  let n = 0
  for (let i = 0; i < range.holes.length; i += step) {
    const hole = range.holes[i]!
    sum += heroShowdownEquity(heroCards, [hole.cards], board)
    n++
  }
  return n > 0 ? sum / n : 0.35
}
