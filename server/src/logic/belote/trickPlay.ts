import { teamForPosition } from './bidding.js'
import { cardsEqual } from './deck.js'
import {
  isTrumpCard,
  trickCardStrength,
  type TrumpContext,
} from './trumpContext.js'
import type { BeloteCard, BeloteSuit, BeloteTrickCard } from './types.js'

function partnerWinningTrick(
  currentTrick: BeloteTrickCard[],
  ctx: TrumpContext,
  playerPosition: number,
): boolean {
  if (currentTrick.length === 0) return false
  const winnerPos = trickWinnerPosition(currentTrick, ctx)
  return teamForPosition(playerPosition) === teamForPosition(winnerPos)
}

function handHasTrump(hand: BeloteCard[], ctx: TrumpContext): boolean {
  if (ctx.mode === 'NO_TRUMP') return false
  if (ctx.mode === 'ALL_TRUMP') return hand.length > 0
  return hand.some((c) => c.suit === ctx.suit)
}

export function canPlayCard(
  hand: BeloteCard[],
  card: BeloteCard,
  ctx: TrumpContext,
  currentTrick: BeloteTrickCard[],
  playerPosition: number,
): boolean {
  if (!hand.some((c) => cardsEqual(c, card))) return false
  if (currentTrick.length === 0) return true

  const ledSuit = currentTrick[0].card.suit
  const hasLed = hand.some((c) => c.suit === ledSuit)
  const hasTrump = handHasTrump(hand, ctx)
  const cardIsTrump = isTrumpCard(card, ctx)
  const cardIsLed = card.suit === ledSuit
  const partnerWinning = partnerWinningTrick(currentTrick, ctx, playerPosition)

  if (hasLed) {
    if (!cardIsLed) return false
    if (partnerWinning) return true

    const bestInTrick = highestInTrick(currentTrick, ctx, ledSuit)
    const bestStrength = bestInTrick
      ? trickCardStrength(bestInTrick, ctx, ledSuit)
      : -1

    const canBeatWithLed = hand.some(
      (c) =>
        c.suit === ledSuit &&
        trickCardStrength(c, ctx, ledSuit) > bestStrength,
    )

    if (canBeatWithLed) {
      return trickCardStrength(card, ctx, ledSuit) > bestStrength
    }

    return true
  }

  if (hasTrump && ctx.mode !== 'NO_TRUMP') {
    if (partnerWinning) return true
    if (!cardIsTrump) return false
    const highestTrumpSoFar = highestTrumpInTrick(currentTrick, ctx)
    if (highestTrumpSoFar) {
      const mustBeat = hand.some(
        (c) =>
          isTrumpCard(c, ctx) &&
          trickCardStrength(c, ctx, ledSuit) >
            trickCardStrength(highestTrumpSoFar, ctx, ledSuit),
      )
      if (
        mustBeat &&
        trickCardStrength(card, ctx, ledSuit) <=
          trickCardStrength(highestTrumpSoFar, ctx, ledSuit)
      ) {
        return false
      }
    }
    return true
  }

  return true
}

export function playableCards(
  hand: BeloteCard[],
  ctx: TrumpContext,
  currentTrick: BeloteTrickCard[],
  playerPosition: number,
): BeloteCard[] {
  return hand.filter((c) => canPlayCard(hand, c, ctx, currentTrick, playerPosition))
}

export function firstLegalCard(
  hand: BeloteCard[],
  ctx: TrumpContext,
  currentTrick: BeloteTrickCard[],
  playerPosition: number,
): BeloteCard | undefined {
  return hand.find((c) => canPlayCard(hand, c, ctx, currentTrick, playerPosition))
}

function highestInTrick(
  trick: BeloteTrickCard[],
  ctx: TrumpContext,
  ledSuit: BeloteSuit,
): BeloteCard | undefined {
  let best: BeloteCard | undefined
  let bestStr = -1
  for (const t of trick) {
    const s = trickCardStrength(t.card, ctx, ledSuit)
    if (s > bestStr) {
      bestStr = s
      best = t.card
    }
  }
  return best
}

function highestTrumpInTrick(
  trick: BeloteTrickCard[],
  ctx: TrumpContext,
): BeloteCard | undefined {
  let best: BeloteCard | undefined
  let bestStr = -1
  for (const t of trick) {
    if (!isTrumpCard(t.card, ctx)) continue
    const ledSuit = trick[0].card.suit
    const s = trickCardStrength(t.card, ctx, ledSuit)
    if (s > bestStr) {
      bestStr = s
      best = t.card
    }
  }
  return best
}

export function trickWinnerPosition(
  trick: BeloteTrickCard[],
  ctx: TrumpContext,
): number {
  const ledSuit = trick[0].card.suit
  let winner = trick[0]
  let bestStr = trickCardStrength(trick[0].card, ctx, ledSuit)
  for (let i = 1; i < trick.length; i++) {
    const s = trickCardStrength(trick[i].card, ctx, ledSuit)
    if (s > bestStr) {
      bestStr = s
      winner = trick[i]
    }
  }
  return winner.position
}
