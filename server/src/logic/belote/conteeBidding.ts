import { nextPosition, teamForPosition } from './bidding.js'
import { isValidTrumpChoice, usesContreeRound } from './beloteVariants.js'
import { trumpChoiceToMode } from './trumpContext.js'
import type { BeloteGameState, BeloteTrumpChoice } from './types.js'
import {
  CONTEE_BID_STEP,
  CONTEE_CAPOT_BID,
  CONTEE_MAX_BID,
  CONTEE_MIN_BID,
} from './conteeConstants.js'

export type ContreeBidRecord =
  | { position: number; action: 'PASS' }
  | { position: number; action: 'BID'; value: number; trump: BeloteTrumpChoice }
  | { position: number; action: 'CONTREE' }
  | { position: number; action: 'SURCONTREE' }

export type ContreeBidResult =
  | { ok: true; redeal?: boolean; startPlay?: boolean }
  | { ok: false; error: string }

export function isValidBidValue(value: number): boolean {
  if (value === CONTEE_CAPOT_BID) return true
  if (value < CONTEE_MIN_BID || value > CONTEE_MAX_BID) return false
  return value % CONTEE_BID_STEP === 0
}

export function getHighestBid(
  bids: Array<{ action: string; position: number; value?: number; trump?: BeloteTrumpChoice }>,
): { position: number; value: number; trump: BeloteTrumpChoice } | null {
  let best: { position: number; value: number; trump: BeloteTrumpChoice } | null = null
  for (const b of bids) {
    if (b.action !== 'BID' || b.value == null || b.trump == null) continue
    if (!best || b.value > best.value) {
      best = { position: b.position, value: b.value, trump: b.trump }
    }
  }
  return best
}

function passesSinceLastBid(bids: ContreeBidRecord[]): number {
  let n = 0
  for (let i = bids.length - 1; i >= 0; i--) {
    const b = bids[i]
    if (b.action === 'BID') break
    if (b.action === 'PASS') n++
  }
  return n
}

function allPassedFromStart(bids: ContreeBidRecord[]): boolean {
  return bids.length >= 4 && bids.every((b) => b.action === 'PASS')
}

export function biddingFinished(state: BeloteGameState): boolean {
  const highest = getHighestBid(state.bids as ContreeBidRecord[])
  if (!highest) return false
  return passesSinceLastBid(state.bids as ContreeBidRecord[]) >= 3
}

export function applyContreeBidAction(
  state: BeloteGameState,
  position: number,
  action:
    | { type: 'PASS' }
    | { type: 'BID'; value: number; trump: BeloteTrumpChoice }
    | { type: 'CONTREE' }
    | { type: 'SURCONTREE' },
): ContreeBidResult {
  const bids = state.bids as ContreeBidRecord[]

  if (state.phase === 'BIDDING') {
    if (position !== state.biddingTurnPosition) {
      return { ok: false, error: 'NOT_YOUR_TURN' }
    }

    if (action.type === 'PASS') {
      bids.push({ position, action: 'PASS' })
      if (allPassedFromStart(bids)) {
        return { ok: true, redeal: true }
      }
      if (biddingFinished(state)) {
        const highest = getHighestBid(bids)!
        state.deal.takerPosition = highest.position
        state.deal.contractTeam = teamForPosition(highest.position)
        state.deal.trumpMode = trumpChoiceToMode(highest.trump)
        if (state.deal.trumpMode === 'SUIT') {
          state.deal.trump = highest.trump as import('./types.js').BeloteSuit
        } else {
          state.deal.trump = 'SPADES'
        }
        state.contractPoints = highest.value
        state.contreeLevel = 0
        state.contreeDefensePasses = 0
        state.contreeAttackPasses = 0
        if (usesContreeRound(state.variant)) {
          state.phase = 'CONTREE_ROUND'
          state.contreePhase = 'DEFENSE'
          state.biddingTurnPosition = nextPosition(highest.position)
        } else {
          return { ok: true, startPlay: true }
        }
        return { ok: true }
      }
      state.biddingTurnPosition = nextPosition(position)
      return { ok: true }
    }

    if (action.type === 'BID') {
      if (!isValidTrumpChoice(action.trump, state.variant)) {
        return { ok: false, error: 'INVALID_TRUMP' }
      }
      if (!isValidBidValue(action.value)) {
        return { ok: false, error: 'INVALID_BID_VALUE' }
      }
      const highest = getHighestBid(bids)
      if (highest && action.value <= highest.value) {
        return { ok: false, error: 'BID_TOO_LOW' }
      }
      bids.push({
        position,
        action: 'BID',
        value: action.value,
        trump: action.trump,
      })
      state.biddingTurnPosition = nextPosition(position)
      return { ok: true }
    }

    return { ok: false, error: 'INVALID_ACTION' }
  }

  if (state.phase === 'CONTREE_ROUND') {
    const contractTeam = state.deal.contractTeam
    if (!contractTeam) return { ok: false, error: 'NO_CONTRACT' }
    const defenseTeam = contractTeam === 'A' ? 'B' : 'A'
    const myTeam = teamForPosition(position)

    if (action.type === 'PASS') {
      if (state.contreePhase === 'DEFENSE') {
        if (myTeam !== defenseTeam) {
          return { ok: false, error: 'NOT_DEFENDER' }
        }
        bids.push({ position, action: 'PASS' })
        state.contreeDefensePasses = (state.contreeDefensePasses ?? 0) + 1
        if (state.contreeDefensePasses >= 2) {
          state.contreePhase = 'ATTACK'
          state.biddingTurnPosition = state.deal.takerPosition ?? 0
          return { ok: true }
        }
        state.biddingTurnPosition = nextPosition(position)
        return { ok: true }
      }

      if (state.contreePhase === 'ATTACK') {
        if (myTeam !== contractTeam) {
          return { ok: false, error: 'NOT_ATTACK' }
        }
        bids.push({ position, action: 'PASS' })
        state.contreeAttackPasses = (state.contreeAttackPasses ?? 0) + 1
        if (state.contreeAttackPasses >= 2) {
          return { ok: true, startPlay: true }
        }
        state.biddingTurnPosition = nextPosition(position)
        return { ok: true }
      }

      return { ok: false, error: 'INVALID_PHASE' }
    }

    if (action.type === 'CONTREE') {
      if (state.contreePhase !== 'DEFENSE' || myTeam !== defenseTeam) {
        return { ok: false, error: 'INVALID_ACTION' }
      }
      state.contreeLevel = 1
      state.contreePhase = 'ATTACK'
      state.biddingTurnPosition = state.deal.takerPosition ?? 0
      bids.push({ position, action: 'CONTREE' })
      return { ok: true }
    }

    if (action.type === 'SURCONTREE') {
      if (state.contreePhase !== 'ATTACK' || myTeam !== contractTeam) {
        return { ok: false, error: 'INVALID_ACTION' }
      }
      if ((state.contreeLevel ?? 0) < 1) {
        return { ok: false, error: 'NO_CONTREE' }
      }
      state.contreeLevel = 2
      bids.push({ position, action: 'SURCONTREE' })
      return { ok: true, startPlay: true }
    }

    return { ok: false, error: 'INVALID_ACTION' }
  }

  return { ok: false, error: 'INVALID_PHASE' }
}

export function contractMultiplier(contreeLevel: number): number {
  if (contreeLevel >= 2) return 4
  if (contreeLevel >= 1) return 2
  return 1
}
