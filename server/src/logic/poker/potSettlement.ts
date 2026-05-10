import type { Player } from '../../types/poker.js'
import { computeShowdownRanking } from './showdownRanking.js'
import type { Card } from '../../types/poker.js'
import { getBestFiveOfSeven } from '../Evaluator.js'

export interface PotSettlementInput {
  players: Player[]
  communityCards: Card[]
}

export interface PotSettlementResult {
  payouts: Map<string, number>
  showdownWinnerId: string
  showdownWinnerIds: string[]
  showdownHandName: string
  showdownPot: number
  /** 5 cartes de la main gagnante (premier gagnant en cas de partage — même force). */
  showdownWinningCards: Card[]
}

function contributionOf(player: Player): number {
  return player.totalPutInThisHand ?? player.currentBet ?? 0
}

export function settlePots(input: PotSettlementInput): PotSettlementResult {
  const players = input.players
  const activePlayers = players.filter((p) => p.isActive)
  const playersToEvaluate = activePlayers.length > 0 ? activePlayers : players
  const totalPot = players.reduce((sum, p) => sum + contributionOf(p), 0)

  const payouts = new Map<string, number>()
  if (playersToEvaluate.length === 0) {
    return {
      payouts,
      showdownWinnerId: '',
      showdownWinnerIds: [],
      showdownHandName: '',
      showdownPot: totalPot,
      showdownWinningCards: [],
    }
  }

  const levels = [
    ...new Set(playersToEvaluate.map((p) => contributionOf(p))),
  ].sort((a, b) => a - b)

  let distributed = 0
  let lastWinnerId = ''
  let lastWinnerIds: string[] = []
  let lastHandName = ''
  let lastWinningCards: Card[] = []

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i]
    const prevLevel = i === 0 ? 0 : levels[i - 1]
    const diff = level - prevLevel
    if (diff <= 0) continue

    const eligible = playersToEvaluate.filter((p) => contributionOf(p) >= level)
    if (eligible.length === 0) continue

    let potSize = 0
    for (const player of players) {
      const contrib = contributionOf(player)
      const slice = Math.min(Math.max(0, contrib - prevLevel), diff)
      potSize += slice
    }
    if (potSize <= 0) continue

    const { winnerIds, handName } = computeShowdownRanking(
      eligible,
      input.communityCards
    )
    if (winnerIds.length === 0) continue

    const share = Math.floor(potSize / winnerIds.length)
    const oddChip = potSize - share * winnerIds.length
    winnerIds.forEach((winnerId, idx) => {
      const base = payouts.get(winnerId) ?? 0
      payouts.set(winnerId, base + share + (idx === 0 ? oddChip : 0))
    })
    distributed += potSize
    lastWinnerId = winnerIds[0] ?? lastWinnerId
    lastWinnerIds = winnerIds
    lastHandName = handName
    const wp = eligible.find((p) => p.id === winnerIds[0])
    const combined =
      wp && wp.cards.length + input.communityCards.length >= 5
        ? [...wp.cards, ...input.communityCards]
        : []
    if (combined.length >= 5) {
      lastWinningCards = getBestFiveOfSeven(combined)
    }
  }

  const remainder = totalPot - distributed
  if (remainder > 0 && lastWinnerId) {
    payouts.set(lastWinnerId, (payouts.get(lastWinnerId) ?? 0) + remainder)
  }

  return {
    payouts,
    showdownWinnerId: lastWinnerId,
    showdownWinnerIds: lastWinnerIds,
    showdownHandName: lastHandName,
    showdownPot: totalPot,
    showdownWinningCards: lastWinningCards,
  }
}

