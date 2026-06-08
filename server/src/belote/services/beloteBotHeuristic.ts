import { cardKey } from '../../logic/belote/deck.js'
import { trickWinnerPosition } from '../../logic/belote/trickPlay.js'
import { isTrumpCard, resolveTrumpContext } from '../../logic/belote/trumpContext.js'
import { teamForPosition } from '../../logic/belote/bidding.js'
import type { BeloteTableController } from '../../logic/belote/BeloteTableController.js'
import type { BeloteCard } from '../../logic/belote/types.js'
import {
  legalActionKey,
  legalActionToBeloteAction,
  type BeloteLegalAction,
} from './beloteLegalEngine.js'

export type BeloteBotDecision = {
  action: BeloteLegalAction
  reason: string
}

function cardRankValue(rank: BeloteCard['rank']): number {
  const map: Record<BeloteCard['rank'], number> = {
    '7': 0,
    '8': 1,
    '9': 2,
    '10': 3,
    J: 4,
    Q: 5,
    K: 6,
    A: 7,
  }
  return map[rank] ?? 0
}

function handScoreForBidding(hand: BeloteCard[]): number {
  let score = 0
  for (const c of hand) {
    if (c.rank === 'A') score += 14
    else if (c.rank === '10') score += 10
    else if (c.rank === 'J') score += 8
    else if (c.rank === '9') score += 6
    else score += 2
  }
  const suits = new Map<string, number>()
  for (const c of hand) suits.set(c.suit, (suits.get(c.suit) ?? 0) + 1)
  for (const n of suits.values()) {
    if (n >= 4) score += 12
    else if (n === 3) score += 6
  }
  return score
}

function pickLowestCard(cards: BeloteCard[]): BeloteCard {
  return [...cards].sort((a, b) => cardRankValue(a.rank) - cardRankValue(b.rank))[0]!
}

function pickPlayCard(
  table: BeloteTableController,
  playerId: string,
  legal: Extract<BeloteLegalAction, { type: 'PLAY_CARD' }>[],
): BeloteBotDecision {
  const state = table.getState()
  const player = state.players.find((p) => p.userId === playerId)!
  const ctx = resolveTrumpContext(state)!
  const trick = state.deal.currentTrick
  const cards = legal.map((a) => a.card)

  if (trick.length === 0) {
    const trumpCards = cards.filter((c) => isTrumpCard(c, ctx))
    if (trumpCards.length >= 2) {
      const c = pickLowestCard(trumpCards)
      return {
        action: { type: 'PLAY_CARD', card: c },
        reason: 'LEAD_LOW_TRUMP',
      }
    }
    const high = cards.filter((c) => c.rank === 'A' || c.rank === '10')
    if (high.length > 0) {
      const c = pickLowestCard(high)
      return {
        action: { type: 'PLAY_CARD', card: c },
        reason: 'LEAD_VALUE_CARD',
      }
    }
    const c = pickLowestCard(cards)
    return { action: { type: 'PLAY_CARD', card: c }, reason: 'LEAD_LOW_CARD' }
  }

  const leaderPos = trick[0]!.position
  const currentBest = trickWinnerPosition(trick, ctx)
  const partnerPos = (player.position + 2) % 4
  const partnerWinning = currentBest === partnerPos

  if (partnerWinning) {
    const c = pickLowestCard(cards)
    return {
      action: { type: 'PLAY_CARD', card: c },
      reason: 'PARTNER_WINNING_LOW_CARD',
    }
  }

  const c = pickLowestCard(cards)
  return {
    action: { type: 'PLAY_CARD', card: c },
    reason: 'FOLLOW_SUIT_LOW_CARD',
  }
}

/** Heuristique NORMAL — choisit uniquement dans `legalActions`. */
export function heuristicDecision(
  table: BeloteTableController,
  playerId: string,
  legalActions: BeloteLegalAction[],
): BeloteBotDecision {
  if (legalActions.length === 0) {
    return { action: { type: 'PASS' }, reason: 'NO_LEGAL_FALLBACK_PASS' }
  }

  const state = table.getState()
  const player = state.players.find((p) => p.userId === playerId)

  const playActions = legalActions.filter(
    (a): a is Extract<BeloteLegalAction, { type: 'PLAY_CARD' }> => a.type === 'PLAY_CARD',
  )
  if (playActions.length > 0) {
    return pickPlayCard(table, playerId, playActions)
  }

  const bids = legalActions.filter((a) => a.type === 'BID')
  if (bids.length > 0 && player) {
    const score = handScoreForBidding(player.hand)
    if (score >= 70) {
      const bid = bids[0]!
      return { action: bid, reason: `BID_HAND_SCORE_${score}` }
    }
  }

  const take = legalActions.find((a) => a.type === 'TAKE')
  if (take && player) {
    const score = handScoreForBidding(player.hand)
    if (score >= 55) {
      return { action: take, reason: `TAKE_HAND_SCORE_${score}` }
    }
  }

  const choose = legalActions.filter(
    (a): a is Extract<BeloteLegalAction, { type: 'CHOOSE_TRUMP' }> => a.type === 'CHOOSE_TRUMP',
  )
  if (choose.length > 0 && player) {
    const suitCounts = new Map<string, number>()
    for (const c of player.hand) {
      suitCounts.set(c.suit, (suitCounts.get(c.suit) ?? 0) + 1)
    }
    const best = [...choose].sort((a, b) => {
      return (suitCounts.get(b.trump) ?? 0) - (suitCounts.get(a.trump) ?? 0)
    })[0]!
    return { action: best, reason: 'CHOOSE_LONGEST_SUIT' }
  }

  const contree = legalActions.find((a) => a.type === 'CONTREE')
  if (contree && player && handScoreForBidding(player.hand) >= 75) {
    return { action: contree, reason: 'CONTREE_STRONG_HAND' }
  }

  const pass = legalActions.find((a) => a.type === 'PASS')
  if (pass) return { action: pass, reason: 'PASS_DEFAULT' }

  return { action: legalActions[0]!, reason: 'FIRST_LEGAL' }
}

export function randomLegalDecision(legalActions: BeloteLegalAction[]): BeloteBotDecision {
  const action = legalActions[Math.floor(Math.random() * legalActions.length)]!
  return { action, reason: 'RANDOM_LEGAL' }
}

export { legalActionToBeloteAction, legalActionKey }
