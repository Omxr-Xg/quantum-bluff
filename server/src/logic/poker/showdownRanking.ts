import type { Card, Player } from '../../types/poker.js'
import { findWinnersWithHand } from '../Evaluator.js'

export interface ShowdownRankingResult {
  winnerIds: string[]
  handName: string
}

export function computeShowdownRanking(
  eligiblePlayers: Player[],
  communityCards: Card[]
): ShowdownRankingResult {
  const { winnerIds, handName } = findWinnersWithHand(
    eligiblePlayers,
    communityCards
  )
  return { winnerIds, handName }
}

