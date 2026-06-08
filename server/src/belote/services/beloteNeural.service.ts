import type { BeloteTableController } from '../../logic/belote/BeloteTableController.js'
import {
  legalActionKey,
  legalActionsIncludes,
  type BeloteLegalAction,
} from './beloteLegalEngine.js'
import type { BeloteBotDecision } from './beloteBotHeuristic.js'
import { env } from '../../config/env.js'
import { rootLogger } from '../../observability/logger.js'
import { getActiveBeloteModelVersionId } from './beloteAnalytics.service.js'

function buildBelotePredictPayload(
  table: BeloteTableController,
  playerId: string,
  legalActions: BeloteLegalAction[],
) {
  const state = table.getState()
  const player = state.players.find((p) => p.userId === playerId)
  return {
    gameId: state.gameId,
    playerId,
    variant: state.variant,
    phase: state.phase,
    teamScoreA: state.teamScoreA,
    teamScoreB: state.teamScoreB,
    position: player?.position,
    team: player?.team,
    hand: player?.hand ?? [],
    legalActions: legalActions.map((a) => ({
      key: legalActionKey(a),
      action: a,
    })),
    deal: {
      trump: state.deal.trump,
      trumpMode: state.deal.trumpMode,
      currentTrick: state.deal.currentTrick,
      tricksWonA: state.deal.tricksWonA,
      tricksWonB: state.deal.tricksWonB,
    },
  }
}

function mapResponseToDecision(
  legalActions: BeloteLegalAction[],
  body: { action?: unknown; confidence?: number; reason?: string },
): BeloteBotDecision | null {
  const raw = body.action
  if (!raw || typeof raw !== 'object') return null

  const action = raw as BeloteLegalAction
  if (!legalActionsIncludes(legalActions, action)) {
    const key = legalActionKey(action)
    const match = legalActions.find((a) => legalActionKey(a) === key)
    if (!match) return null
    return {
      action: match,
      reason: body.reason ?? `neural:${key}`,
    }
  }
  return {
    action,
    reason: body.reason ?? 'neural',
  }
}

/**
 * Phase 5 — inference neural (Python / ONNX).
 * Retourne null si service indisponible → fallback heuristique.
 */
export async function predictNeuralBeloteAction(
  table: BeloteTableController,
  playerId: string,
  legalActions: BeloteLegalAction[],
): Promise<BeloteBotDecision | null> {
  if (!env.aiServiceEnabled || !env.aiServiceUrl) return null

  const start = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), env.aiServiceTimeoutMs)

  try {
    const response = await fetch(
      `${env.aiServiceUrl.replace(/\/$/, '')}/predict/belote`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBelotePredictPayload(table, playerId, legalActions)),
        signal: controller.signal,
      },
    )

    if (!response.ok) {
      throw new Error(`AI service returned HTTP ${response.status}`)
    }

    const body = (await response.json()) as {
      action?: unknown
      confidence?: number
      reason?: string
    }
    const decision = mapResponseToDecision(legalActions, body)
    if (!decision) return null

    rootLogger.info({
      msg: 'belote_neural_decision',
      gameId: table.gameId,
      playerId,
      latencyMs: Date.now() - start,
      confidence: body.confidence,
      reason: decision.reason,
    })

    void getActiveBeloteModelVersionId()
    return decision
  } catch (err) {
    rootLogger.warn({
      msg: 'belote_neural_predict_failed',
      gameId: table.gameId,
      playerId,
      detail: err instanceof Error ? err.message : String(err),
    })
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export function filterNeuralDecision(
  legalActions: BeloteLegalAction[],
  predicted: BeloteBotDecision | null,
): BeloteBotDecision | null {
  if (!predicted) return null
  if (!legalActionsIncludes(legalActions, predicted.action)) {
    return null
  }
  return predicted
}
