import { teamForPosition } from './bidding.js'
import { cardsEqual } from './deck.js'
import { trickCardStrength } from './scoring.js'
import type { BeloteCard, BeloteSuit, BeloteTrickCard } from './types.js'

function partnerWinningTrick(
  currentTrick: BeloteTrickCard[],
  trump: BeloteSuit,
  playerPosition: number,
): boolean {
  if (currentTrick.length === 0) return false
  const winnerPos = trickWinnerPosition(currentTrick, trump)
  return teamForPosition(playerPosition) === teamForPosition(winnerPos)
}

export function canPlayCard(
  hand: BeloteCard[],
  card: BeloteCard,
  trump: BeloteSuit,
  currentTrick: BeloteTrickCard[],
  playerPosition: number,
): boolean {
  if (!hand.some((c) => cardsEqual(c, card))) return false
  if (currentTrick.length === 0) return true

  const ledSuit = currentTrick[0].card.suit
  const hasLed = hand.some((c) => c.suit === ledSuit)
  const hasTrump = hand.some((c) => c.suit === trump)
  const cardIsTrump = card.suit === trump
  const cardIsLed = card.suit === ledSuit
  const partnerWinning = partnerWinningTrick(currentTrick, trump, playerPosition)

  if (hasLed) {
    if (!cardIsLed) return false
    if (partnerWinning) return true

    const bestInTrick = highestInTrick(currentTrick, trump, ledSuit)
    const bestStrength = bestInTrick
      ? trickCardStrength(bestInTrick, trump, ledSuit)
      : -1

    const canBeatWithLed = hand.some(
      (c) =>
        c.suit === ledSuit &&
        trickCardStrength(c, trump, ledSuit) > bestStrength,
    )

    if (canBeatWithLed) {
      return trickCardStrength(card, trump, ledSuit) > bestStrength
    }

    return true
  }

  if (hasTrump) {
    if (partnerWinning) return true
    if (!cardIsTrump) return false
    const highestTrumpSoFar = highestTrumpInTrick(currentTrick, trump)
    if (highestTrumpSoFar) {
      const mustBeat = hand.some(
        (c) =>
          c.suit === trump &&
          trickCardStrength(c, trump, ledSuit) >
            trickCardStrength(highestTrumpSoFar, trump, ledSuit),
      )
      if (mustBeat && trickCardStrength(card, trump, ledSuit) <= trickCardStrength(highestTrumpSoFar, trump, ledSuit)) {
        return false
      }
    }
    return true
  }

  return true
}

export function playableCards(
  hand: BeloteCard[],
  trump: BeloteSuit,
  currentTrick: BeloteTrickCard[],
  playerPosition: number,
): BeloteCard[] {
  return hand.filter((c) => canPlayCard(hand, c, trump, currentTrick, playerPosition))
}

/** Première carte jouable (timeout automatique). */
export function firstLegalCard(
  hand: BeloteCard[],
  trump: BeloteSuit,
  currentTrick: BeloteTrickCard[],
  playerPosition: number,
): BeloteCard | undefined {
  return hand.find((c) => canPlayCard(hand, c, trump, currentTrick, playerPosition))
}

function highestInTrick(
  trick: BeloteTrickCard[],
  trump: BeloteSuit,
  ledSuit: BeloteSuit,
): BeloteCard | undefined {
  let best: BeloteCard | undefined
  let bestStr = -1
  for (const t of trick) {
    const s = trickCardStrength(t.card, trump, ledSuit)
    if (s > bestStr) {
      bestStr = s
      best = t.card
    }
  }
  return best
}

function highestTrumpInTrick(trick: BeloteTrickCard[], trump: BeloteSuit): BeloteCard | undefined {
  let best: BeloteCard | undefined
  let bestStr = -1
  for (const t of trick) {
    if (t.card.suit !== trump) continue
    const s = trickCardStrength(t.card, trump, trump)
    if (s > bestStr) {
      bestStr = s
      best = t.card
    }
  }
  return best
}

export function trickWinnerPosition(
  trick: BeloteTrickCard[],
  trump: BeloteSuit,
): number {
  const ledSuit = trick[0].card.suit
  let winner = trick[0]
  let bestStr = trickCardStrength(trick[0].card, trump, ledSuit)
  for (let i = 1; i < trick.length; i++) {
    const s = trickCardStrength(trick[i].card, trump, ledSuit)
    if (s > bestStr) {
      bestStr = s
      winner = trick[i]
    }
  }
  return winner.position
}
