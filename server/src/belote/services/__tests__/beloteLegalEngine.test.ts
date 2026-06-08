import { BeloteTableController } from '../../../logic/belote/BeloteTableController.js'
import type { BeloteGameVariant } from '../../../logic/belote/types.js'
import {
  getLegalActions,
  legalActionToBeloteAction,
  legalActionsIncludes,
} from '../beloteLegalEngine.js'
import { heuristicDecision } from '../beloteBotHeuristic.js'

const PLAYERS = [
  { userId: 'u0', username: 'P0', position: 0 },
  { userId: 'u1', username: 'P1', position: 1 },
  { userId: 'u2', username: 'P2', position: 2 },
  { userId: 'u3', username: 'P3', position: 3 },
]

function makeTable(variant: BeloteGameVariant) {
  return new BeloteTableController({
    gameId: `legal-${variant}`,
    roomId: 'room-legal',
    targetScore: 500,
    buyIn: 100,
    variant,
    players: PLAYERS,
  })
}

function currentPlayerId(table: BeloteTableController): string {
  const s = table.getState()
  const pos =
    s.phase === 'PLAYING' ? s.deal.currentPlayerPosition : s.biddingTurnPosition
  return s.players.find((p) => p.position === pos)!.userId
}

describe('beloteLegalEngine', () => {
  const variants: BeloteGameVariant[] = ['CONTEE', 'COINCHE', 'MODERNE', 'CLASSIQUE']

  it.each(variants)('%s: bidding legal actions apply successfully', (variant) => {
    const table = makeTable(variant)
    const playerId = currentPlayerId(table)
    const legal = getLegalActions(table, playerId)
    expect(legal.some((a) => a.type === 'PASS')).toBe(true)
    const pick = legal[0]!
    const result = table.applyAction(playerId, legalActionToBeloteAction(pick))
    expect(result.ok).toBe(true)
  })

  it.each(variants)('%s: heuristic always picks legal action', (variant) => {
    const table = makeTable(variant)
    const playerId = currentPlayerId(table)
    const legal = getLegalActions(table, playerId)
    const decision = heuristicDecision(table, playerId, legal)
    expect(legalActionsIncludes(legal, decision.action)).toBe(true)
  })

  it('CONTEE: repeated heuristic decisions stay legal', () => {
    const table = makeTable('CONTEE')
    for (let i = 0; i < 8; i++) {
      const pid = currentPlayerId(table)
      const legal = getLegalActions(table, pid)
      if (legal.length === 0) break
      const decision = heuristicDecision(table, pid, legal)
      expect(legalActionsIncludes(legal, decision.action)).toBe(true)
      table.applyAction(pid, legalActionToBeloteAction(decision.action))
    }
  })

  it('CONTEE contree round: every legal action applies successfully', () => {
    const table = makeTable('CONTEE')
    let illegal = 0

    while (table.getState().phase !== 'GAME_END' && illegal === 0) {
      const s = table.getState()
      if (s.phase === 'DEAL_END') {
        table.startNextDeal()
        continue
      }
      if (s.phase !== 'CONTREE_ROUND') {
        const pid = currentPlayerId(table)
        const legal = getLegalActions(table, pid)
        const pick = legal.find((a) => a.type === 'BID') ?? legal[0]
        if (!pick) break
        table.applyAction(pid, legalActionToBeloteAction(pick))
        continue
      }

      const pid = currentPlayerId(table)
      const legal = getLegalActions(table, pid)
      expect(legal.some((a) => a.type === 'PASS')).toBe(true)
      const decision = heuristicDecision(table, pid, legal)
      expect(legalActionsIncludes(legal, decision.action)).toBe(true)
      const result = table.applyAction(pid, legalActionToBeloteAction(decision.action))
      if (!result.ok) illegal++
      if (table.getState().phase === 'PLAYING') break
    }

    expect(illegal).toBe(0)
  })
})
