import { randomUUID } from 'crypto'
import { BeloteTableController } from '../server/src/logic/belote/BeloteTableController.js'
import { makeBeloteBotId } from '../server/src/shared/beloteBots.js'
import {
  getLegalActions,
  legalActionToBeloteAction,
  legalActionsIncludes,
} from '../server/src/belote/services/beloteLegalEngine.js'
import { heuristicDecision } from '../server/src/belote/services/beloteBotHeuristic.js'

const table = new BeloteTableController({
  gameId: randomUUID(),
  roomId: 'bench',
  targetScore: 200,
  buyIn: 0,
  variant: 'CONTEE',
  players: [0, 1, 2, 3].map((position) => ({
    userId: makeBeloteBotId(),
    username: `B${position}`,
    position,
    isBot: true,
  })),
})

for (let steps = 0; steps < 500; steps++) {
  const s = table.getState()
  if (s.phase === 'GAME_END') break
  if (s.phase === 'DEAL_END') {
    table.startNextDeal()
    continue
  }
  const pos =
    s.phase === 'PLAYING' ? s.deal.currentPlayerPosition : s.biddingTurnPosition
  const player = s.players.find((p) => p.position === pos)
  if (!player) {
    console.log('no player', s.phase, pos)
    break
  }
  const legal = getLegalActions(table, player.userId)
  if (legal.length === 0) {
    console.log('no legal', s.phase, pos)
    break
  }
  const decision = heuristicDecision(table, player.userId, legal)
  const inList = legalActionsIncludes(legal, decision.action)
  const result = table.applyAction(
    player.userId,
    legalActionToBeloteAction(decision.action),
  )
  if (!inList || !result.ok) {
    console.log({
      step: steps,
      phase: s.phase,
      inList,
      error: result.ok ? null : result.error,
      reason: decision.reason,
      action: decision.action,
      legalCount: legal.length,
    })
    break
  }
}

console.log('final', table.getState().phase)
