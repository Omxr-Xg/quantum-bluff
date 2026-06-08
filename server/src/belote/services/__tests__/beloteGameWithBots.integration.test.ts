import { BeloteTableController } from '../../../logic/belote/BeloteTableController.js'
import { makeBeloteBotId } from '../../../shared/beloteBots.js'
import {
  getLegalActions,
  legalActionToBeloteAction,
} from '../beloteLegalEngine.js'
import { heuristicDecision } from '../beloteBotHeuristic.js'

function makeBotTable() {
  return new BeloteTableController({
    gameId: 'bot-integration',
    roomId: 'room-bot',
    targetScore: 500,
    buyIn: 100,
    variant: 'CONTEE',
    players: [
      { userId: 'u0', username: 'Human', position: 0 },
      { userId: makeBeloteBotId(), username: 'Bot1', position: 1, isBot: true },
      { userId: makeBeloteBotId(), username: 'Bot2', position: 2, isBot: true },
      { userId: makeBeloteBotId(), username: 'Bot3', position: 3, isBot: true },
    ],
  })
}

function currentPlayerId(table: BeloteTableController): string | null {
  const s = table.getState()
  if (s.phase === 'GAME_END') return null
  const pos =
    s.phase === 'PLAYING' ? s.deal.currentPlayerPosition : s.biddingTurnPosition
  const p = s.players.find((x) => x.position === pos && !x.forfeited)
  return p?.userId ?? null
}

describe('belote game with bots integration', () => {
  it('plays many bot actions without illegal moves or stall', () => {
    const table = makeBotTable()
    let steps = 0
    const maxSteps = 120

    while (table.getState().phase !== 'GAME_END' && steps++ < maxSteps) {
      const pid = currentPlayerId(table)
      if (!pid) break
      const legal = getLegalActions(table, pid)
      expect(legal.length).toBeGreaterThan(0)
      const decision = heuristicDecision(table, pid, legal)
      let result = table.applyAction(pid, legalActionToBeloteAction(decision.action))
      if (!result.ok) {
        const fallback = legal.find((a) => a.type === 'PASS') ?? legal[0]!
        result = table.applyAction(pid, legalActionToBeloteAction(fallback))
      }
      expect(result.ok).toBe(true)
      if (table.getState().phase === 'DEAL_END') {
        table.startNextDeal()
      }
    }

    expect(steps).toBeGreaterThan(10)
    expect(['PLAYING', 'DEAL_END', 'GAME_END', 'BIDDING', 'CONTREE_ROUND']).toContain(
      table.getState().phase,
    )
  })
})
