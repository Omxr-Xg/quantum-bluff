import type { BeloteTableController } from '../../logic/belote/BeloteTableController.js'
import {
  getLegalActions,
  legalActionToBeloteAction,
} from './beloteLegalEngine.js'
import {
  heuristicDecision,
  type BeloteBotDecision,
} from './beloteBotHeuristic.js'
import { filterNeuralDecision, predictNeuralBeloteAction } from './beloteNeural.service.js'
import {
  getActiveBeloteModelVersionId,
  recordBeloteBotDecision,
} from './beloteAnalytics.service.js'
import { journalBeloteTrainingSample } from './beloteTrainingJournal.service.js'
import { env } from '../../config/env.js'

export async function decideBeloteBotAction(
  table: BeloteTableController,
  botPlayerId: string,
): Promise<BeloteBotDecision> {
  const start = Date.now()
  const legalActions = getLegalActions(table, botPlayerId)

  if (legalActions.length === 0) {
    return { action: { type: 'PASS' }, reason: 'NO_LEGAL_ACTIONS' }
  }

  let decision: BeloteBotDecision
  let source: 'HEURISTIC' | 'NEURAL' = 'HEURISTIC'
  let neuralRejected = false

  const neural = filterNeuralDecision(
    legalActions,
    await predictNeuralBeloteAction(table, botPlayerId, legalActions),
  )

  let modelVersionId: string | null = null

  if (neural) {
    decision = { ...neural, reason: `neural:${neural.reason}` }
    source = 'NEURAL'
    void getActiveBeloteModelVersionId().then((id) => {
      modelVersionId = id
    })
  } else {
    if (env.aiServiceEnabled) neuralRejected = true
    decision = heuristicDecision(table, botPlayerId, legalActions)
  }

  void recordBeloteBotDecision({
    table,
    playerId: botPlayerId,
    decision,
    decisionSource: source,
    decisionTimeMs: Date.now() - start,
    neuralRejected,
    modelVersionId,
  })

  void journalBeloteTrainingSample({
    table,
    playerId: botPlayerId,
    legalActions,
    decision,
    source: 'SELF_PLAY',
  })

  return decision
}

export function applyBeloteBotDecision(
  table: BeloteTableController,
  botPlayerId: string,
  decision: BeloteBotDecision,
): { ok: true } | { ok: false; error: string } {
  return table.applyAction(botPlayerId, legalActionToBeloteAction(decision.action))
}
