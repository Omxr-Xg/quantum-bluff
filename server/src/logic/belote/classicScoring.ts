import type { BeloteGameState, BeloteTeam } from './types.js'
import type { DealScoreResult } from './conteeScoring.js'
import { DIX_DE_DER } from './scoring.js'

/** Belote classique : points de plis ajoutés au score d’équipe (sans contrat chiffré). */
export function computeClassicDealScore(
  state: BeloteGameState,
  lastWinnerTeam: BeloteTeam,
): DealScoreResult {
  const beloteA = state.beloteBonusA ?? 0
  const beloteB = state.beloteBonusB ?? 0
  let pointsA = state.deal.dealPointsA + beloteA
  let pointsB = state.deal.dealPointsB + beloteB

  if (lastWinnerTeam === 'A') pointsA += DIX_DE_DER
  else pointsB += DIX_DE_DER

  return {
    made: true,
    capot: false,
    attackTeam: state.deal.contractTeam ?? 'A',
    attackPoints: pointsA,
    defensePoints: pointsB,
    contract: 0,
    multiplier: 1,
    scoreA: pointsA,
    scoreB: pointsB,
    beloteA,
    beloteB,
  }
}
