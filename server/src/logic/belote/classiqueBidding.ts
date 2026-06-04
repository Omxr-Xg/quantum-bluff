import { nextPosition, teamForPosition } from './bidding.js'
import type { BeloteGameState, BeloteSuit } from './types.js'

export type ClassiqueBidResult =
  | { ok: true; redeal?: boolean; dealComplete?: boolean }
  | { ok: false; error: string }

export function applyClassiqueBidAction(
  state: BeloteGameState,
  position: number,
  action: { type: 'PASS' } | { type: 'TAKE' } | { type: 'CHOOSE_TRUMP'; trump: BeloteSuit },
): ClassiqueBidResult {
  if (position !== state.biddingTurnPosition) {
    return { ok: false, error: 'NOT_YOUR_TURN' }
  }

  const turned = state.deal.turnedCard
  if (!turned && state.phase === 'CLASSIQUE_TAKE') {
    return { ok: false, error: 'NO_TURNED_CARD' }
  }

  if (state.phase === 'CLASSIQUE_TAKE') {
    if (action.type === 'TAKE') {
      state.bids.push({ position, action: 'TAKE' })
      state.deal.takerPosition = position
      state.deal.contractTeam = teamForPosition(position)
      state.deal.trump = turned!.suit
      state.deal.trumpMode = 'SUIT'
      state.contractPoints = 0
      return { ok: true, dealComplete: true }
    }

    if (action.type === 'PASS') {
      state.bids.push({ position, action: 'PASS' })
      const passCount = state.bids.filter((b) => b.action === 'PASS').length
      if (passCount >= 4) {
        state.bids = []
        state.phase = 'CLASSIQUE_CHOOSE'
        state.biddingTurnPosition = nextPosition(state.deal.dealerPosition)
        return { ok: true }
      }
      state.biddingTurnPosition = nextPosition(position)
      return { ok: true }
    }

    return { ok: false, error: 'INVALID_ACTION' }
  }

  if (state.phase === 'CLASSIQUE_CHOOSE') {
    if (action.type === 'CHOOSE_TRUMP') {
      if (!['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'].includes(action.trump)) {
        return { ok: false, error: 'INVALID_TRUMP' }
      }
      if (turned && action.trump === turned.suit) {
        return { ok: false, error: 'SAME_AS_TURNED' }
      }
      state.bids.push({ position, action: 'CHOOSE_TRUMP', trump: action.trump })
      state.deal.takerPosition = position
      state.deal.contractTeam = teamForPosition(position)
      state.deal.trump = action.trump
      state.deal.trumpMode = 'SUIT'
      state.contractPoints = 0
      return { ok: true, dealComplete: true }
    }

    if (action.type === 'PASS') {
      state.bids.push({ position, action: 'PASS' })
      const passCount = state.bids.filter((b) => b.action === 'PASS').length
      if (passCount >= 4) {
        return { ok: true, redeal: true }
      }
      state.biddingTurnPosition = nextPosition(position)
      return { ok: true }
    }

    return { ok: false, error: 'INVALID_ACTION' }
  }

  return { ok: false, error: 'INVALID_PHASE' }
}
