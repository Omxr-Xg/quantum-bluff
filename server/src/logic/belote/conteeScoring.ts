import type { BeloteCard, BeloteGameState, BeloteSuit, BeloteTeam } from './types.js'
import { contractMultiplier } from './conteeBidding.js'
import {
  BELOTE_ANNOUNCE_POINTS,
  CONTEE_CAPOT_BID,
  CONTEE_TOTAL_DEAL_POINTS,
} from './conteeConstants.js'
import { DIX_DE_DER } from './scoring.js'

export type DealScoreResult = {
  made: boolean
  capot: boolean
  attackTeam: BeloteTeam
  attackPoints: number
  defensePoints: number
  contract: number
  multiplier: number
  scoreA: number
  scoreB: number
  beloteA: number
  beloteB: number
}

export function detectBeloteInHand(hand: BeloteCard[], trump: BeloteSuit): boolean {
  const hasK = hand.some((c) => c.suit === trump && c.rank === 'K')
  const hasQ = hand.some((c) => c.suit === trump && c.rank === 'Q')
  return hasK && hasQ
}

export function computeDealScore(
  state: BeloteGameState,
  lastWinnerTeam: BeloteTeam,
): DealScoreResult {
  const contractTeam = state.deal.contractTeam ?? 'A'
  const defenseTeam: BeloteTeam = contractTeam === 'A' ? 'B' : 'A'
  const contract = state.contractPoints ?? 80
  const capot = contract >= CONTEE_CAPOT_BID

  let attackPoints =
    contractTeam === 'A' ? state.deal.dealPointsA : state.deal.dealPointsB
  const beloteA = state.beloteBonusA ?? 0
  const beloteB = state.beloteBonusB ?? 0
  attackPoints += contractTeam === 'A' ? beloteA : beloteB

  if (lastWinnerTeam === contractTeam) {
    attackPoints += DIX_DE_DER
  } else {
    const defPts =
      defenseTeam === 'A' ? state.deal.dealPointsA : state.deal.dealPointsB
    void defPts
  }

  const defensePoints = CONTEE_TOTAL_DEAL_POINTS - attackPoints
  const mult = contractMultiplier(state.contreeLevel ?? 0)

  let made: boolean
  if (capot) {
    const tricksAttack =
      contractTeam === 'A' ? state.deal.tricksWonA : state.deal.tricksWonB
    made = tricksAttack === 8
  } else {
    made = attackPoints >= contract
  }

  let scoreA = 0
  let scoreB = 0

  if (made) {
    const pts = Math.round((contract + defensePoints) * mult)
    if (contractTeam === 'A') scoreA = pts
    else scoreB = pts
  } else {
    const pts = Math.round((CONTEE_TOTAL_DEAL_POINTS + contract) * mult)
    if (defenseTeam === 'A') scoreA = pts
    else scoreB = pts
  }

  return {
    made,
    capot,
    attackTeam: contractTeam,
    attackPoints,
    defensePoints,
    contract,
    multiplier: mult,
    scoreA,
    scoreB,
    beloteA,
    beloteB,
  }
}
