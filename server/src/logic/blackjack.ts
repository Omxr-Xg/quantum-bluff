/**
 * Blackjack — logique pure (testable).
 *
 * Règles (MVP) :
 * - Un sabot de 6 jeux mélangés, re-mélangé en début de main côté session.
 * - Blackjack naturel : As + figure ou 10 → 21 en 2 cartes.
 * - Croupier : tire jusqu’à avoir une valeur >= 17 (As compté 11 si possible sans bust). Donc s’arrête sur soft 17 (A+6 = 17).
 * - Pas de split (v1).
 * - Double : uniquement avec exactement 2 cartes, une carte supplémentaire puis fin de main joueur.
 * - Paiement BJ naturel vs non-BJ : 3:2 sur la mise (gain net = floor(mise * 1.5), rendu mise + gain).
 * - Victoire normale / dealer bust : 1:1 (rendu 2× mise totale engagée sur la main).
 * - Égalité : push (rendu mise totale).
 */
import { randomInt as cryptoRandomInt } from 'node:crypto'

export const BLACKJACK_MIN_BET = 10
/** Plafond absolu par main (aligné slot). */
export const BLACKJACK_MAX_BET_CAP = 1000

export type Suit = 'h' | 'd' | 'c' | 's'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export type Card = { rank: Rank; suit: Suit }

export type RandomIntFn = (minInclusive: number, maxInclusive: number) => number

const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const SUITS: Suit[] = ['h', 'd', 'c', 's']

const DECKS = 6

function defaultRandomInt(min: number, max: number): number {
  return cryptoRandomInt(min, max + 1)
}

/** Sabot : 6 × 52 cartes. */
export function createShoe(): Card[] {
  const shoe: Card[] = []
  for (let d = 0; d < DECKS; d++) {
    for (const s of SUITS) {
      for (const r of RANKS) {
        shoe.push({ rank: r, suit: s })
      }
    }
  }
  return shoe
}

/** Mélange Fisher–Yates. */
export function shuffleShoe(shoe: Card[], randomInt: RandomIntFn = defaultRandomInt): void {
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = randomInt(0, i)
    ;[shoe[i], shoe[j]] = [shoe[j]!, shoe[i]!]
  }
}

export function drawCard(shoe: Card[]): Card {
  const c = shoe.pop()
  if (!c) throw new Error('SHOE_EMPTY')
  return c
}

/** Valeur « best » <= 21 ; si bust retourne la somme minimale (peut être > 21). */
export function handValue(cards: Card[]): { total: number; soft: boolean; bust: boolean } {
  let sum = 0
  let aces = 0
  for (const c of cards) {
    if (c.rank === 'A') {
      aces++
      sum += 11
    } else if (c.rank === 'J' || c.rank === 'Q' || c.rank === 'K') {
      sum += 10
    } else if (c.rank === '10') {
      sum += 10
    } else {
      sum += parseInt(c.rank, 10)
    }
  }
  while (sum > 21 && aces > 0) {
    sum -= 10
    aces--
  }
  const soft = aces > 0 && sum <= 21
  return { total: sum, soft, bust: sum > 21 }
}

export function isNaturalBlackjack(cards: Card[]): boolean {
  if (cards.length !== 2) return false
  const v = handValue(cards)
  return v.total === 21 && !v.bust
}

/** Croupier : tire si total < 17. */
export function dealerShouldHit(cards: Card[]): boolean {
  const v = handValue(cards)
  if (v.bust) return false
  return v.total < 17
}

/** Joue la main croupier jusqu’à stand ; modifie shoe et dealerHand. */
export function playDealerHand(dealerHand: Card[], shoe: Card[]): void {
  while (dealerShouldHit(dealerHand)) {
    dealerHand.push(drawCard(shoe))
  }
}

export type SettleReason =
  | 'player_blackjack'
  | 'dealer_blackjack'
  | 'push'
  | 'player_bust'
  | 'dealer_bust'
  | 'player_win'
  | 'dealer_win'

/**
 * Payout total chips to add back to player (stake was already removed at deal / double).
 * `totalBet` = mise initiale + éventuelle mise du double.
 */
export function settleRound(
  playerHand: Card[],
  dealerHand: Card[],
  totalBet: number
): { payout: number; reason: SettleReason } {
  const pb = handValue(playerHand)
  const db = handValue(dealerHand)
  const pBJ = isNaturalBlackjack(playerHand)
  const dBJ = isNaturalBlackjack(dealerHand)

  if (pBJ && dBJ) {
    return { payout: totalBet, reason: 'push' }
  }
  if (pBJ && !dBJ) {
    const bonus = Math.floor(totalBet * 1.5)
    return { payout: totalBet + bonus, reason: 'player_blackjack' }
  }
  if (!pBJ && dBJ) {
    return { payout: 0, reason: 'dealer_blackjack' }
  }

  if (pb.bust) {
    return { payout: 0, reason: 'player_bust' }
  }
  if (db.bust) {
    return { payout: totalBet * 2, reason: 'dealer_bust' }
  }
  if (pb.total > db.total) {
    return { payout: totalBet * 2, reason: 'player_win' }
  }
  if (pb.total < db.total) {
    return { payout: 0, reason: 'dealer_win' }
  }
  return { payout: totalBet, reason: 'push' }
}

export type ValidateBetResult =
  | { ok: true; bet: number }
  | { ok: false; code: 'BET_TOO_LOW' | 'BET_TOO_HIGH' | 'INSUFFICIENT_CHIPS' | 'BET_INVALID' }

export function validateBlackjackBet(
  raw: unknown,
  chipsAvailable: number,
  maxBetEffective: number
): ValidateBetResult {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, code: 'BET_INVALID' }
  }
  const bet = Math.floor(n)
  if (bet < BLACKJACK_MIN_BET) {
    return { ok: false, code: 'BET_TOO_LOW' }
  }
  if (bet > maxBetEffective) {
    return { ok: false, code: 'BET_TOO_HIGH' }
  }
  if (bet > chipsAvailable) {
    return { ok: false, code: 'INSUFFICIENT_CHIPS' }
  }
  return { ok: true, bet }
}

export function cardToPublic(c: Card): Card {
  return { rank: c.rank, suit: c.suit }
}
