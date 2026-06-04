import { cardsEqual } from './deck.js'
import { trickCardStrength } from './scoring.js'
import type { BeloteCard, BeloteSuit, BeloteTrickCard } from './types.js'

export function canPlayCard(
  hand: BeloteCard[],
  card: BeloteCard,
  trump: BeloteSuit,
  currentTrick: BeloteTrickCard[],
): boolean {
  if (!hand.some((c) => cardsEqual(c, card))) return false
  if (currentTrick.length === 0) return true

  const ledSuit = currentTrick[0].card.suit
  const hasLed = hand.some((c) => c.suit === ledSuit)
  const hasTrump = hand.some((c) => c.suit === trump)
  const cardIsTrump = card.suit === trump
  const cardIsLed = card.suit === ledSuit

  if (hasLed) {
    if (!cardIsLed) return false
    const highestLedSoFar = highestInTrick(currentTrick, trump, ledSuit)
    const mustOvertrump =
      currentTrick.some((t) => t.card.suit === trump) ||
      (highestLedSoFar && trickCardStrength(highestLedSoFar, trump, ledSuit) >= 50)
    if (mustOvertrump) {
      const myBestLed = bestCardInHand(hand.filter((c) => c.suit === ledSuit), trump, ledSuit)
      if (
        myBestLed &&
        trickCardStrength(card, trump, ledSuit) < trickCardStrength(myBestLed, trump, ledSuit)
      ) {
        const canBeat = hand.some(
          (c) =>
            c.suit === ledSuit &&
            trickCardStrength(c, trump, ledSuit) >
              trickCardStrength(highestLedSoFar!, trump, ledSuit),
        )
        if (canBeat) return false
      }
    }
    return true
  }

  if (hasTrump) {
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

function bestCardInHand(hand: BeloteCard[], trump: BeloteSuit, ledSuit: BeloteSuit): BeloteCard | undefined {
  let best: BeloteCard | undefined
  let bestStr = -1
  for (const c of hand) {
    const s = trickCardStrength(c, trump, ledSuit)
    if (s > bestStr) {
      bestStr = s
      best = c
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
