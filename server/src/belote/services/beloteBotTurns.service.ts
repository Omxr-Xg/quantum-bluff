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
import { getLegalActions } from './beloteLegalEngine.js'
import { heuristicDecision, legalActionToBeloteAction } from './beloteBotHeuristic.js'

const MAX_BOT_ACTIONS_PER_TICK = 10
const BOT_THINK_MIN_MS = 500
const BOT_THINK_MAX_MS = 900

const chainTail = new Map<string, Promise<void>>()

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function randomThinkMs(): number {
  return BOT_THINK_MIN_MS + Math.floor(Math.random() * (BOT_THINK_MAX_MS - BOT_THINK_MIN_MS + 1))
}

function currentBotPlayerId(table: BeloteTableController): string | null {
  const state = table.getState()
  if (state.phase === 'GAME_END' || state.phase === 'DEAL_END') return null

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

export function clearBeloteBotSession(gameId: string): void {
  chainTail.delete(gameId)
}

async function runBeloteBotChainBody(io: Server | undefined, gameId: string): Promise<void> {
  for (let step = 0; step < MAX_BOT_ACTIONS_PER_TICK; step++) {
    const table = activeBeloteGames.getSync(gameId)
    if (!table) break

    const botId = currentBotPlayerId(table)
    if (!botId) break

    const decision = await decideBeloteBotAction(table, botId)
    await sleep(randomThinkMs())

    const fresh = activeBeloteGames.getSync(gameId)
    if (!fresh) break
    const stillBot = currentBotPlayerId(fresh)
    if (stillBot !== botId) break

    const result = applyBeloteBotDecision(fresh, botId, decision)
    if (!result.ok) {
      rootLogger.warn({
        msg: 'belote_bot_apply_failed',
        gameId,
        botId,
        error: result.error,
        reason: decision.reason,
      })
      const legal = getLegalActions(fresh, botId)
      const fb = heuristicDecision(fresh, botId, legal)
      const retry = fresh.applyAction(botId, legalActionToBeloteAction(fb.action))
      if (!retry.ok) break
    }

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
  })
}
