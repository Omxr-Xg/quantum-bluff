import type { BeloteGameState, BeloteSuit, BeloteTeam } from './types.js'

export function teamForPosition(position: number): BeloteTeam {
  return position % 2 === 0 ? 'A' : 'B'
}

export function nextPosition(current: number, n = 4): number {
  return (current + 1) % n
}

export function allPassedRound1(state: BeloteGameState): boolean {
  const round1Bids = state.bids.filter((b) => b.action === 'PASS' || b.action === 'TAKE')
  return round1Bids.length >= 4 && !round1Bids.some((b) => b.action === 'TAKE')
}

export function findTaker(state: BeloteGameState): number | undefined {
  const take = state.bids.find((b) => b.action === 'TAKE')
  if (take) return take.position
  const choose = state.bids.find((b) => b.action === 'CHOOSE_TRUMP')
  return choose?.position
}

export function biddingComplete(state: BeloteGameState): boolean {
  if (state.phase !== 'BIDDING_ROUND_1' && state.phase !== 'BIDDING_ROUND_2') return false
  const taker = findTaker(state)
  if (taker !== undefined && state.deal.trump) return true
  if (state.phase === 'BIDDING_ROUND_2') {
    const chooses = state.bids.filter((b) => b.action === 'CHOOSE_TRUMP')
    if (chooses.length > 0) return true
    const passes = state.bids.filter((b) => state.biddingRound === 2 && b.action === 'PASS')
    return passes.length >= 4
  }
  const takes = state.bids.filter((b) => b.action === 'TAKE')
  if (takes.length > 0) return Boolean(state.deal.trump)
  const passes = state.bids.filter((b) => b.action === 'PASS')
  return passes.length >= 4 && state.biddingRound === 1
}

export function validateTrumpChoice(trump: BeloteSuit): boolean {
  return ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'].includes(trump)
}
