import { z } from 'zod'
import { env } from '../config/env.js'
import {
  decideBotAction,
  expertOracleDecision,
  type BotActionRequest,
  type BotActionResponse,
  type ExpertPlayerTendency,
} from '../logic/botAI.js'
import type { PlayerTendencyView } from '../poker/services/playerTendency.service.js'
import type { Card, GamePhase } from '../types/poker.js'
import { rootLogger } from '../observability/logger.js'

type AiAction = 'FOLD' | 'CHECK' | 'CALL' | 'RAISE' | 'ALL_IN'

export interface ExpertAiContext {
  gameId?: string
  botId?: string
  street?: GamePhase | string
  opponentStack?: number
  actions?: unknown[]
  opponentStyle?: string
  opponentHoleCards?: Card[][]
  playerTendency?: ExpertPlayerTendency
  rangeWinProb?: number
}

export function toExpertPlayerTendency(
  view: PlayerTendencyView,
  extras?: {
    positionRates?: ExpertPlayerTendency['positionRates']
    recentTendency?: ExpertPlayerTendency['recentTendency']
  },
): ExpertPlayerTendency {
  return {
    vpip: view.vpip,
    pfr: view.pfr,
    bluffRaiseRate: view.bluffRaiseRate,
    foldToRaiseRate: view.foldToRaiseRate,
    styleTag: view.styleTag,
    confidence: view.confidence,
    styleScores: view.styleScores,
    positionRates: extras?.positionRates ?? null,
    recentTendency: extras?.recentTendency,
  }
}

const aiResponseSchema = z.object({
  action: z.enum(['FOLD', 'CHECK', 'CALL', 'RAISE', 'ALL_IN']),
  amount: z.number().int().min(0).optional().default(0),
  confidence: z.number().min(0).max(1),
  style: z.string().max(100).optional().default('unknown'),
  reason: z.string().max(500).optional().default('AI expert decision'),
})

function cardToCompact(card: Card): string {
  const suit = {
    HEARTS: 'h',
    DIAMONDS: 'd',
    CLUBS: 'c',
    SPADES: 's',
  }[card.suit]
  return `${card.rank}${suit}`
}

function streetFromCommunityCards(req: BotActionRequest): string {
  if (req.communityCards.length === 0) return 'PREFLOP'
  if (req.communityCards.length === 3) return 'FLOP'
  if (req.communityCards.length === 4) return 'TURN'
  return 'RIVER'
}

function convertAllIn(req: BotActionRequest, reason: string): BotActionResponse {
  const chips = Math.max(0, Math.floor(req.playerChips))
  const callAmount = Math.max(0, Math.floor(req.callAmount))
  const minRaise = Math.max(1, Math.floor(req.minRaise))

  if (chips <= 0) {
    return {
      action: callAmount > 0 ? 'FOLD' : 'CHECK',
      reasoning: `${reason}; all-in unavailable`,
    }
  }

  if (callAmount > 0 && chips <= callAmount) {
    return {
      action: chips >= callAmount ? 'CALL' : 'FOLD',
      amount: callAmount,
      reasoning: `${reason}; all-in converted to terminal call/fold`,
    }
  }

  if (chips >= minRaise) {
    return {
      action: 'RAISE',
      amount: chips,
      reasoning: `${reason}; all-in converted to max raise`,
    }
  }

  if (callAmount === 0) {
    return { action: 'CHECK', reasoning: `${reason}; all-in converted to check` }
  }

  return chips >= callAmount
    ? { action: 'CALL', amount: callAmount, reasoning: `${reason}; all-in converted to call` }
    : { action: 'FOLD', reasoning: `${reason}; all-in converted to fold` }
}

function convertAiAction(
  aiAction: AiAction,
  amount: number,
  req: BotActionRequest,
  reason: string,
): BotActionResponse {
  if (aiAction === 'ALL_IN') return convertAllIn(req, reason)
  if (aiAction === 'RAISE') {
    return {
      action: 'RAISE',
      amount: Math.max(0, Math.floor(amount)),
      reasoning: reason,
    }
  }
  if (aiAction === 'CALL') {
    return { action: 'CALL', amount: req.callAmount, reasoning: reason }
  }
  return { action: aiAction, reasoning: reason }
}

function buildAiPayload(req: BotActionRequest, context: ExpertAiContext = {}) {
  return {
    gameId: context.gameId,
    botId: context.botId,
    street: context.street ?? streetFromCommunityCards(req),
    holeCards: req.playerCards.map(cardToCompact),
    communityCards: req.communityCards.map(cardToCompact),
    pot: req.potSize,
    toCall: req.callAmount,
    botStack: req.playerChips,
    opponentStack: context.opponentStack ?? req.playerChips,
    position: req.position,
    playersCount: req.playersCount,
    actions: context.actions ?? [],
    opponentStyle: context.opponentStyle,
    opponentHoleCards: context.opponentHoleCards?.map((cards) => cards.map(cardToCompact)),
    minRaise: req.minRaise,
  }
}

function hasOracleOpponentHoles(context: ExpertAiContext): boolean {
  return Boolean(
    context.opponentHoleCards?.some((h) => Array.isArray(h) && h.length >= 2),
  )
}

async function callPythonExpertAi(
  req: BotActionRequest,
  context: ExpertAiContext = {},
): Promise<BotActionResponse> {
  if (!env.aiServiceUrl) {
    throw new Error('AI_SERVICE_URL is not configured')
  }

  const start = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), env.aiServiceTimeoutMs)

  try {
    const response = await fetch(`${env.aiServiceUrl.replace(/\/$/, '')}/predict/poker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildAiPayload(req, context)),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`AI service returned HTTP ${response.status}`)
    }

    const parsed = aiResponseSchema.safeParse(await response.json())
    if (!parsed.success) {
      throw new Error(`AI service returned invalid payload: ${parsed.error.message}`)
    }

    const latencyMs = Date.now() - start
    rootLogger.info({
      msg: 'expert_ai_decision',
      gameId: context.gameId,
      botId: context.botId,
      difficulty: req.difficulty,
      aiAction: parsed.data.action,
      confidence: parsed.data.confidence,
      style: parsed.data.style,
      latencyMs,
      fallbackUsed: false,
      reason: parsed.data.reason,
    })
    const reason = `python-expert(${parsed.data.confidence.toFixed(2)}, ${parsed.data.style}): ${parsed.data.reason}`
    return {
      ...convertAiAction(parsed.data.action, parsed.data.amount, req, reason),
      style: parsed.data.style,
    }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Expert :
 * - **Trous adverses (`opponentHoleCards`)** : toujours `expertOracleDecision` (TS). Le modèle Python fold trop
 *   en multiway avec oracle côté client ; la politique TS est calibrée pour ce cas.
 * - **Sans trous** : si `AI_SERVICE_ENABLED` + URL → Python (`python-expert` dans reasoning) ; sinon `expertBotDecision`.
 * - Échec Python (sans oracle, car sinon on n’appelle pas Python) : heuristique expert avec message de fallback.
 */
export async function decideBotActionWithExpertAi(
  req: BotActionRequest,
  context: ExpertAiContext = {},
): Promise<BotActionResponse> {
  if (req.difficulty !== 'expert') {
    return decideBotAction(req)
  }

  const oracle = hasOracleOpponentHoles(context)

  if (oracle) {
    return expertOracleDecision(req, {
      opponentHoleCards: context.opponentHoleCards,
      opponentStack: context.opponentStack,
      playerTendency: context.playerTendency,
      rangeWinProb: context.rangeWinProb,
    })
  }

  if (!env.aiServiceEnabled) {
    return decideBotAction(req)
  }

  try {
    return await callPythonExpertAi(req, context)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    rootLogger.warn({
      msg: 'expert_ai_fallback',
      gameId: context.gameId,
      botId: context.botId,
      difficulty: req.difficulty,
      fallbackUsed: true,
      latencyMs: env.aiServiceTimeoutMs,
      reason: 'AI unavailable or invalid',
      detail,
    })
    return {
      ...decideBotAction(req),
      reasoning: 'fallback heuristic expert: AI unavailable or invalid',
    }
  }
}
