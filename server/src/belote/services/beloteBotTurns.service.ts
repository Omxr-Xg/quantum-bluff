import type { Server } from 'socket.io'
import { activeBeloteGames } from '../../shared/activeBeloteGames.js'
import type { BeloteTableController } from '../../logic/belote/BeloteTableController.js'
import { isBeloteBotId } from '../../shared/beloteBots.js'
import { rootLogger } from '../../observability/logger.js'
import {
  applyBeloteBotDecision,
  decideBeloteBotAction,
} from './beloteBot.service.js'
import { syncBeloteAfterAction } from './beloteSettlement.service.js'
import { getLegalActions, legalActionToBeloteAction } from './beloteLegalEngine.js'
import {
  heuristicDecision,
  type BeloteBotDecision,
} from './beloteBotHeuristic.js'

const MAX_BOT_ACTIONS_PER_TICK = 12
const BOT_THINK_MIN_MS = 350
const BOT_THINK_MAX_MS = 650
const BOT_STUCK_RECOVERY_MS = 5_000

const chainTail = new Map<string, Promise<void>>()
const stuckWatchdogs = new Map<string, ReturnType<typeof setTimeout>>()

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function randomThinkMs(): number {
  return BOT_THINK_MIN_MS + Math.floor(Math.random() * (BOT_THINK_MAX_MS - BOT_THINK_MIN_MS + 1))
}

function currentBotPlayerId(table: BeloteTableController): string | null {
  const state = table.getState()
  if (state.phase === 'GAME_END') return null

  if (state.phase === 'DEAL_END') return null

  let pos: number | undefined
  if (state.phase === 'PLAYING') {
    pos = state.deal.currentPlayerPosition
  } else if (
    state.phase === 'BIDDING' ||
    state.phase === 'CONTREE_ROUND' ||
    state.phase === 'CLASSIQUE_TAKE' ||
    state.phase === 'CLASSIQUE_CHOOSE'
  ) {
    pos = state.biddingTurnPosition
  } else {
    return null
  }

  const player = state.players.find((p) => p.position === pos && !p.forfeited)
  if (!player) return null
  if (!player.isBot && !isBeloteBotId(player.userId)) return null
  return player.userId
}

function clearStuckWatchdog(gameId: string): void {
  const t = stuckWatchdogs.get(gameId)
  if (t) clearTimeout(t)
  stuckWatchdogs.delete(gameId)
}

function scheduleStuckWatchdog(io: Server | undefined, gameId: string): void {
  if (!io) return
  clearStuckWatchdog(gameId)
  const id = setTimeout(() => {
    stuckWatchdogs.delete(gameId)
    void recoverStuckBeloteBotTurn(io, gameId)
  }, BOT_STUCK_RECOVERY_MS)
  stuckWatchdogs.set(gameId, id)
}

/** Dernier recours : timer de tour ou première action légale. */
export async function recoverStuckBeloteBotTurn(
  io: Server | undefined,
  gameId: string,
): Promise<void> {
  const table = activeBeloteGames.getSync(gameId)
  if (!table) return

  const botId = currentBotPlayerId(table)
  if (!botId) return

  rootLogger.warn({ msg: 'belote_bot_stuck_recovery', gameId, botId })

  const advanced = applyBotActionWithFallback(table, botId, {
    action: { type: 'PASS' },
    reason: 'STUCK_RECOVERY',
  })

  if (!advanced) {
    const timed = table.applyTurnTimeout()
    if (!timed) {
      rootLogger.error({ msg: 'belote_bot_stuck_unrecoverable', gameId, botId })
      return
    }
  }

  if (io) {
    await syncBeloteAfterAction(table, io)
  }
  scheduleBeloteBotTurns(io, gameId)
}

function applyBotActionWithFallback(
  table: BeloteTableController,
  botId: string,
  decision: BeloteBotDecision,
): boolean {
  const primary = applyBeloteBotDecision(table, botId, decision)
  if (primary.ok) return true

  rootLogger.warn({
    msg: 'belote_bot_apply_failed',
    gameId: table.gameId,
    botId,
    error: primary.error,
    reason: decision.reason,
  })

  const legal = getLegalActions(table, botId)
  if (legal.length > 0) {
    const fb = heuristicDecision(table, botId, legal)
    const retry = table.applyAction(botId, legalActionToBeloteAction(fb.action))
    if (retry.ok) return true

    for (const action of legal) {
      const attempt = table.applyAction(botId, legalActionToBeloteAction(action))
      if (attempt.ok) return true
    }
  }

  return table.applyTurnTimeout()
}

export function clearBeloteBotSession(gameId: string): void {
  chainTail.delete(gameId)
  clearStuckWatchdog(gameId)
}

async function runBeloteBotChainBody(io: Server | undefined, gameId: string): Promise<void> {
  for (let step = 0; step < MAX_BOT_ACTIONS_PER_TICK; step++) {
    const table = activeBeloteGames.getSync(gameId)
    if (!table) break

    if (table.getState().phase === 'DEAL_END') {
      if (io) {
        await syncBeloteAfterAction(table, io)
      } else {
        table.startNextDeal()
      }
      continue
    }

    const botId = currentBotPlayerId(table)
    if (!botId) break

    const decision = await decideBeloteBotAction(table, botId)
    await sleep(randomThinkMs())

    const fresh = activeBeloteGames.getSync(gameId)
    if (!fresh) break
    const stillBot = currentBotPlayerId(fresh)
    if (stillBot !== botId) break

    const advanced = applyBotActionWithFallback(fresh, botId, decision)
    if (!advanced) break

    if (io) {
      io.to(`belote-game:${gameId}`).emit('BELOTE_BOT_ACTION', {
        gameId,
        botId,
        action: decision.action.type,
        card:
          decision.action.type === 'PLAY_CARD'
            ? `${decision.action.card.rank}_${decision.action.card.suit}`
            : undefined,
        reason: decision.reason,
      })
      await syncBeloteAfterAction(fresh, io)
    }
  }

  const tail = activeBeloteGames.getSync(gameId)
  if (tail && currentBotPlayerId(tail)) {
    scheduleStuckWatchdog(io, gameId)
    scheduleBeloteBotTurns(io, gameId)
  } else {
    clearStuckWatchdog(gameId)
  }
}

export async function runBeloteBotTurnsChain(
  io: Server | undefined,
  gameId: string,
): Promise<void> {
  const prev = chainTail.get(gameId) ?? Promise.resolve()
  const next = prev
    .catch(() => {})
    .then(async () => {
      try {
        await runBeloteBotChainBody(io, gameId)
      } catch (err) {
        rootLogger.error({
          msg: 'belote_bot_chain_failed',
          gameId,
          detail: err instanceof Error ? err.message : String(err),
        })
        scheduleStuckWatchdog(io, gameId)
      }
    })
  chainTail.set(gameId, next)
  await next
}

export function scheduleBeloteBotTurns(io: Server | undefined, gameId: string): void {
  void runBeloteBotTurnsChain(io, gameId).catch((err) => {
    rootLogger.error({
      msg: 'belote_bot_chain_scheduled_failed',
      gameId,
      detail: err instanceof Error ? err.message : String(err),
    })
    scheduleStuckWatchdog(io, gameId)
  })
}
