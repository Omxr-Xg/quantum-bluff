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
import { getPracticeBotDifficulty } from '../../shared/practiceBotGames.js'
const QB_BOT_PREFIX = 'qb-bot-'

const runningChains = new Set<string>()

function isBotSeatId(playerId: string): boolean {
  return playerId.startsWith(QB_BOT_PREFIX)
}

function tableHighestCurrentBet(state: { players: { currentBet?: number }[] }): number {
  return Math.max(0, ...state.players.map((p) => p.currentBet ?? 0))
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

async function emitRoomAfterPracticeAction(
  io: Server,
  gameId: string,
  game: ActiveGame,
): Promise<void> {
  const socketsInRoom = await io.in(gameId).fetchSockets()
  for (const s of socketsInRoom) {
    const uid = (s as unknown as { userId?: string }).userId
    const isSpectator = !game.getPlayerState(uid ?? '')
    const snapshot = game.getSanitizedState(isSpectator ? undefined : uid)
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

/**
 * Enchaîne les actions bot côté serveur jusqu’à ce que ce soit au tour d’un humain
 * ou que la main soit terminée (showdown / relance auto).
 */
export async function runPracticeBotTurnsChain(io: Server, gameId: string): Promise<void> {
  if (!isPracticeBotGameId(gameId)) return
  if (runningChains.has(gameId)) return
  runningChains.add(gameId)

  try {
    for (let step = 0; step < 48; step++) {
      const game = await activeGames.get(gameId)
      if (!game || game instanceof CashGameController) break

      const turn = game.state.currentTurn
      if (!turn || !isBotSeatId(turn)) break

      if (game.state.handRuntimePhase === 'HAND_COMPLETE') break

      const inner = game as GameTable
      const difficulty = getPracticeBotDifficulty(gameId)
      const req = buildBotRequest(inner, turn, difficulty)
      if (!req) break

      const raw = decideBotAction(req)
      const decision = sanitizeBotDecision(raw, req)

      const actionType = decision.action
      const amount =
        actionType === 'CALL' || actionType === 'RAISE' ? decision.amount : undefined

      try {
        await applyPokerAction({
          gameId,
          playerId: turn,
          actionType,
          amount,
          actionId: `bot-${randomUUID()}`,
          handId: game.state.handId,
          expectedStreet: game.state.phase,
        })
      } catch (err) {
        console.error('[practice-bot] applyPokerAction bot failed', { gameId, turn, err })
        break
      }

      const fresh = await activeGames.get(gameId)
      if (!fresh) break
      await emitRoomAfterPracticeAction(io, gameId, fresh)

      if (fresh.state.phase === 'SHOWDOWN') break
      if (fresh.state.handRuntimePhase === 'HAND_COMPLETE') break
    }
  } finally {
    runningChains.delete(gameId)
  }
}
