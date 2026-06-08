import { randomUUID } from 'node:crypto'
import type { Server } from 'socket.io'
import { activeGames } from '../../shared/activeGames.js'
import { isPracticeBotGameId } from '../../shared/practiceBotGames.js'
import { applyPokerAction } from './pokerActionOrchestrator.service.js'
import { CashGameController } from '../../logic/CashGameController.js'
import type { GameTable } from '../../logic/GameTable.js'
import type { ActiveGame } from '../../shared/activeGames.js'
import {
  decideBotAction,
  type BotActionRequest,
  type BotDifficulty,
} from '../../logic/botAI.js'
import { sanitizeBotDecision } from '../../logic/botDecisionSanitize.js'
import {
  getPracticeBotDifficulty,
  usesAdaptiveExpertAi,
  usesExpertOraclePath,
} from '../../shared/practiceBotGames.js'
import { rootLogger } from '../../observability/logger.js'
import {
  decideBotActionWithExpertAi,
  toExpertPlayerTendency,
} from '../../services/botAi.service.js'
import {
  getPlayerTendencyProfile,
  getRecentTendencySession,
  positionRatesFromStats,
  resolveHeroPosition,
} from './playerTendency.service.js'
import {
  heroEquityVsRange,
  narrowOpponentRange,
  seedOpponentRange,
} from './opponentRange.service.js'

const QB_BOT_PREFIX = 'qb-bot-'

/** Délai avant chaque action bot (affordance « réflexion » côté joueur humain). */
const PRACTICE_BOT_THINK_MS = 3000

/** Garde-fou : mains très longues (beaucoup de relances). */
const PRACTICE_BOT_MAX_STEPS = 160

/** Si le tour bot ne progresse pas après N tentatives, on force CHECK/FOLD. */
const PRACTICE_BOT_STALL_BEFORE_FORCE = 3

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** File par `gameId` : évite deux chaînes bot concurrentes (JOIN + relance auto). */
const practiceBotChainTail = new Map<string, Promise<void>>()

function isBotSeatId(playerId: string): boolean {
  return playerId.startsWith(QB_BOT_PREFIX)
}

function tableHighestCurrentBet(state: { players: { currentBet?: number }[] }): number {
  return Math.max(0, ...state.players.map((p) => p.currentBet ?? 0))
}

function progressSignature(g: GameTable): string {
  const s = g.state
  return `${s.handId ?? ''}|${s.phase}|${s.currentTurn ?? ''}|${s.actionVersion ?? 0}|${s.streetVersion ?? 0}|${s.pot}`
}

/** Action sûre si l’IA ou la requête bot est indisponible. */
function inferFallbackAction(inner: GameTable, botId: string): 'CHECK' | 'FOLD' {
  const bot = inner.state.players.find((p) => p.id === botId)
  const highest = tableHighestCurrentBet(inner.state)
  const myBet = bot?.currentBet ?? 0
  const callAmount = Math.max(0, highest - myBet)
  if (callAmount === 0) return 'CHECK'
  return 'FOLD'
}

function buildBotRequest(
  game: GameTable,
  botId: string,
  difficulty: BotDifficulty,
): BotActionRequest | null {
  const bot = game.state.players.find((p) => p.id === botId)
  if (!bot || !Array.isArray(bot.cards) || bot.cards.length < 2) return null

  const highest = tableHighestCurrentBet(game.state)
  const myBet = bot.currentBet ?? 0
  const callAmount = Math.max(0, highest - myBet)
  const minRaise = Math.max(1, game.getMinRaise())

  const participants =
    Array.isArray(game.state.handParticipantIds) && game.state.handParticipantIds.length > 0
      ? game.state.handParticipantIds.length
      : game.state.players.filter((p) => p.isConnected !== false).length

  return {
    playerCards: bot.cards,
    communityCards: game.state.communityCards ?? [],
    difficulty,
    currentBet: myBet,
    playerChips: bot.chips,
    callAmount,
    minRaise,
    potSize: game.state.pot,
    position: bot.position ?? 0,
    playersCount: Math.max(2, participants),
  }
}

async function buildExpertAiContext(game: GameTable, gameId: string, botId: string) {
  const bot = game.state.players.find((p) => p.id === botId)
  const activeOpponents = game.state.players.filter((p) => p.id !== botId && p.isActive !== false)
  const opponentStack =
    activeOpponents
      .sort((a, b) => b.chips - a.chips)[0]?.chips ?? bot?.chips ?? 0

  const human = game.state.players.find((p) => !isBotSeatId(p.id))
  let playerTendency
  let rangeWinProb: number | undefined

  if (human && usesAdaptiveExpertAi(getPracticeBotDifficulty(gameId))) {
    const profile = await getPlayerTendencyProfile(human.id)
    const recent = await getRecentTendencySession(human.id, gameId, 5)
    const heroPos = resolveHeroPosition(game, human.id)
    const positionRates =
      profile?.positionStats
        ? positionRatesFromStats(profile.positionStats, heroPos)
        : null

    if (profile) {
      playerTendency = toExpertPlayerTendency(profile, {
        positionRates,
        recentTendency: {
          consecutiveBluffHands: recent.consecutiveBluffHands,
          consecutiveFoldStreak: recent.consecutiveFoldStreak,
        },
      })
    }

    const bot = game.state.players.find((p) => p.id === botId)
    if (bot?.cards && bot.cards.length >= 2) {
      const known = [
        ...bot.cards,
        ...(game.state.communityCards ?? []),
        ...(human.cards ?? []),
      ]
      let range = seedOpponentRange(known, playerTendency)
      const last = game.state.lastHandAction as
        | { playerId?: string; action?: string; equityBp?: number }
        | undefined
      if (last?.playerId === human.id && last.action) {
        range = narrowOpponentRange(
          range,
          last.action as 'FOLD' | 'CALL' | 'RAISE' | 'CHECK',
          last.equityBp ?? 5000,
          game.state.phase ?? 'PREFLOP',
        )
      }
      rangeWinProb = heroEquityVsRange(
        bot.cards,
        game.state.communityCards ?? [],
        range,
      )
    }
  }

  return {
    gameId,
    botId,
    street: game.state.phase,
    opponentStack,
    actions: game.state.lastHandAction ? [game.state.lastHandAction] : [],
    opponentHoleCards: activeOpponents
      .map((p) => p.cards ?? [])
      .filter((cards) => cards.length >= 2),
    playerTendency,
    rangeWinProb,
  }
}

/** Diffuse l’état courant à toute la room (même logique que la gateway). */
export async function broadcastPracticeTableState(
  io: Server,
  gameId: string,
): Promise<void> {
  const g = await activeGames.get(gameId)
  if (!g || g instanceof CashGameController) return
  await emitRoomAfterPracticeAction(io, gameId, g)
}

async function emitRoomAfterPracticeAction(
  io: Server,
  gameId: string,
  game: ActiveGame,
): Promise<void> {
  const socketsInRoom = await io.in(gameId).fetchSockets()
  for (const s of socketsInRoom) {
    const uid = (s as unknown as { userId?: string }).userId
    const isSpectator = !game.getPlayerState(uid ?? '')
    const snapshot = game.getSanitizedState(isSpectator ? undefined : uid, isSpectator)
    s.emit('GAME_UPDATE', snapshot)
    s.emit('GAME_STATE_UPDATED', snapshot)
  }
  io.to(gameId).emit('HAND_STATE_CHANGED', {
    gameId,
    phase: game.state.phase,
    handRuntimePhase: game.state.handRuntimePhase,
    handEndReason: game.state.handEndReason,
    handId: game.state.handId,
  })
  if (game.state.phase === 'SHOWDOWN') {
    io.to(gameId).emit('SHOWDOWN_REVEAL', {
      gameId,
      handId: game.state.handId,
      handEndReason: game.state.handEndReason,
    })
  }
}

async function applyBotAction(
  gameId: string,
  botId: string,
  inner: GameTable,
  actionType: 'FOLD' | 'CALL' | 'RAISE' | 'CHECK',
  amount?: number,
): Promise<void> {
  await applyPokerAction({
    gameId,
    playerId: botId,
    actionType,
    amount,
    actionId: `bot-${randomUUID()}`,
    handId: inner.state.handId,
    expectedStreet: inner.state.phase,
  })
}

async function runPracticeBotTurnsChainBody(
  io: Server,
  gameId: string,
): Promise<void> {
  let stallCount = 0

  for (let step = 0; step < PRACTICE_BOT_MAX_STEPS; step++) {
    const game = await activeGames.get(gameId)
    if (!game || game instanceof CashGameController) {
      break
    }

    const turn = game.state.currentTurn
    if (!turn || !isBotSeatId(turn)) {
      break
    }

    if (game.state.handRuntimePhase === 'HAND_COMPLETE') {
      break
    }

    const inner = game as GameTable
    const sigBefore = progressSignature(inner)
    const difficulty = getPracticeBotDifficulty(gameId)
    const req = buildBotRequest(inner, turn, difficulty)

    const runFallbackOnly = async (reason: string): Promise<boolean> => {
      const latest = (await activeGames.get(gameId)) as GameTable | undefined
      if (!latest || latest instanceof CashGameController) return false
      if (latest.state.currentTurn !== turn || !isBotSeatId(turn)) return true
      const fb = inferFallbackAction(latest, turn)
      rootLogger.warn({
        msg: 'practice_bot_fallback_action',
        gameId,
        turn,
        reason,
        fallback: fb,
      })
      await sleep(Math.min(500, PRACTICE_BOT_THINK_MS))
      try {
        await applyBotAction(gameId, turn, latest, fb)
      } catch (err) {
        rootLogger.error({
          msg: 'practice_bot_fallback_failed',
          gameId,
          turn,
          detail: err instanceof Error ? err.message : String(err),
        })
        await broadcastPracticeTableState(io, gameId)
        return false
      }
      return true
    }

    if (!req) {
      rootLogger.warn({
        msg: 'practice_bot_skip_no_request',
        gameId,
        turn,
        cardsLen: inner.state.players.find((p) => p.id === turn)?.cards?.length ?? -1,
      })
      const ok = await runFallbackOnly('no_bot_request')
      if (!ok) break
      const fresh = await activeGames.get(gameId)
      if (!fresh) break
      await emitRoomAfterPracticeAction(io, gameId, fresh)
      if (fresh.state.phase === 'SHOWDOWN') break
      if (fresh.state.handRuntimePhase === 'HAND_COMPLETE') break
      stallCount = 0
      continue
    }

    const decisionStart = Date.now()
    const raw =
      usesExpertOraclePath(difficulty)
        ? await decideBotActionWithExpertAi(
            req,
            await buildExpertAiContext(inner, gameId, turn),
          )
        : decideBotAction(req)
    const decision = sanitizeBotDecision(raw, req)
    const finalAmount = 'amount' in decision ? decision.amount : undefined
    rootLogger.info({
      msg: 'practice_bot_action_final',
      gameId,
      botId: turn,
      difficulty,
      aiAction: raw.action,
      finalAction: decision.action,
      finalAmount,
      latencyMs: Date.now() - decisionStart,
      reason: decision.reasoning ?? raw.reasoning,
    })

    const actionType = decision.action
    const amount =
      actionType === 'CALL' || actionType === 'RAISE' ? decision.amount : undefined

    await sleep(PRACTICE_BOT_THINK_MS)

    try {
      await applyBotAction(gameId, turn, inner, actionType, amount)
    } catch (err) {
      rootLogger.warn({
        msg: 'practice_bot_primary_apply_failed',
        gameId,
        turn,
        detail: err instanceof Error ? err.message : String(err),
      })
      try {
        const reRead = await activeGames.get(gameId)
        if (!reRead || reRead instanceof CashGameController) {
          const ok = await runFallbackOnly('apply_failed')
          if (!ok) break
        } else {
          await applyBotAction(gameId, turn, reRead as GameTable, actionType, amount)
        }
      } catch (err2) {
        rootLogger.warn({
          msg: 'practice_bot_retry_failed',
          gameId,
          turn,
          detail: err2 instanceof Error ? err2.message : String(err2),
        })
        const ok = await runFallbackOnly('apply_failed')
        if (!ok) break
      }
    }

    const fresh = await activeGames.get(gameId)
    if (!fresh) break

    const sigAfter = progressSignature(fresh as GameTable)
    const stillBot =
      fresh.state.currentTurn === turn &&
      isBotSeatId(turn) &&
      fresh.state.handRuntimePhase !== 'HAND_COMPLETE' &&
      fresh.state.phase !== 'SHOWDOWN'

    if (stillBot && sigAfter === sigBefore) {
      stallCount++
      if (stallCount >= PRACTICE_BOT_STALL_BEFORE_FORCE) {
        const ok = await runFallbackOnly('stall_no_progress')
        if (!ok) break
        stallCount = 0
        const afterStall = await activeGames.get(gameId)
        if (!afterStall) break
        await emitRoomAfterPracticeAction(io, gameId, afterStall)
        if (afterStall.state.phase === 'SHOWDOWN') break
        if (afterStall.state.handRuntimePhase === 'HAND_COMPLETE') break
        continue
      }
    } else {
      stallCount = 0
    }

    await emitRoomAfterPracticeAction(io, gameId, fresh)

    if (fresh.state.phase === 'SHOWDOWN') break
    if (fresh.state.handRuntimePhase === 'HAND_COMPLETE') break
  }

  await broadcastPracticeTableState(io, gameId)
}

/**
 * Enchaîne les actions bot côté serveur jusqu’à ce que ce soit au tour d’un humain
 * ou que la main soit terminée (showdown / relance auto).
 * Les appels sont sérialisés par `gameId` pour éviter blocages et états incohérents.
 */
export async function runPracticeBotTurnsChain(io: Server, gameId: string): Promise<void> {
  if (!isPracticeBotGameId(gameId)) return

  const prev = practiceBotChainTail.get(gameId) ?? Promise.resolve()
  const next = prev
    .catch(() => {
      /* continuer la file même si une étape a échoué */
    })
    .then(() => runPracticeBotTurnsChainBody(io, gameId))
  practiceBotChainTail.set(gameId, next)
  await next
}
