import type { Server, Socket } from 'socket.io'
import { prisma } from '../config/database.js'
import { beloteActionSchema } from '../logic/belote/beloteAction.validation.js'
import { activeBeloteGames } from '../shared/activeBeloteGames.js'
import { loadBeloteTable } from '../belote/recovery/beloteRecovery.service.js'
import {
  broadcastBeloteGame,
  syncBeloteAfterAction,
} from '../belote/services/beloteSettlement.service.js'
import { emitBeloteRoomUpdated } from '../belote/services/beloteRoomEvents.service.js'
import { scheduleBeloteTurnTimer } from '../belote/services/beloteTurnTimer.service.js'
import { scheduleBeloteBotTurns } from '../belote/services/beloteBotTurns.service.js'
import { recordBeloteHumanDecision } from '../belote/services/beloteAnalytics.service.js'
import { journalBeloteTrainingSample } from '../belote/services/beloteTrainingJournal.service.js'
import { getLegalActions } from '../belote/services/beloteLegalEngine.js'
import sanitizeHtml from 'sanitize-html'

interface BeloteSocket extends Socket {
  userId?: string
  beloteGameId?: string
  beloteRoomId?: string
}

const disconnectTimers = new Map<string, ReturnType<typeof setInterval>>()

function startDisconnectPoller(io: Server, gameId: string): void {
  if (disconnectTimers.has(gameId)) return
  const timer = setInterval(() => {
    const table = activeBeloteGames.getSync(gameId)
    if (!table) {
      clearInterval(timer)
      disconnectTimers.delete(gameId)
      return
    }
    const dc = table.processDisconnectTimeouts()
    if (dc.changed) {
      for (const r of dc.replacements) {
        io.to(`belote-game:${gameId}`).emit('BELOTE_PLAYER_REPLACED_BY_BOT', {
          gameId,
          oldUserId: r.oldUserId,
          botId: r.botId,
          username: r.username,
          position: r.position,
        })
      }
      void syncBeloteAfterAction(table, io)
    } else {
      void broadcastBeloteGame(io, gameId)
    }
  }, 1000)
  disconnectTimers.set(gameId, timer)
}

export function registerBeloteGatewayHandlers(io: Server, socket: BeloteSocket): void {
  socket.on('JOIN_BELOTE_ROOM', async (data: { roomId?: string }) => {
    try {
      const roomId = data?.roomId
      if (!roomId || !socket.userId) return
      socket.join(`belote-room:${roomId}`)
      socket.beloteRoomId = roomId
      await emitBeloteRoomUpdated(roomId, io)
    } catch (err) {
      console.error('[belote] JOIN_BELOTE_ROOM', err)
    }
  })

  socket.on('LEAVE_BELOTE_ROOM', async (data: { roomId?: string }) => {
    const roomId = data?.roomId ?? socket.beloteRoomId
    if (!roomId) return
    socket.leave(`belote-room:${roomId}`)
    if (socket.beloteRoomId === roomId) socket.beloteRoomId = undefined
    await emitBeloteRoomUpdated(roomId, io)
  })

  socket.on('JOIN_BELOTE_GAME', async (data: { gameId?: string }) => {
    try {
      const gameId = data?.gameId
      if (!gameId || !socket.userId) return

      const seat = await prisma.beloteRoomSeat.findFirst({
        where: {
          userId: socket.userId,
          room: { gameId },
        },
      })
      if (!seat) {
        socket.emit('ERROR', { code: 'NOT_IN_GAME', message: 'Pas dans cette partie' })
        return
      }

      socket.join(`belote-game:${gameId}`)
      socket.beloteGameId = gameId

      const table = await loadBeloteTable(gameId)
      if (!table) {
        socket.emit('ERROR', { code: 'GAME_NOT_FOUND', message: 'Partie introuvable' })
        return
      }
      table.markReconnected(socket.userId)
      await broadcastBeloteGame(io, gameId)
      startDisconnectPoller(io, gameId)
      scheduleBeloteTurnTimer(io, gameId, table)
      scheduleBeloteBotTurns(io, gameId)
    } catch (err) {
      console.error('[belote] JOIN_BELOTE_GAME', err)
    }
  })

  socket.on('JOIN_BELOTE_SPECTATE', async (data: { gameId?: string }) => {
    try {
      const gameId = data?.gameId
      if (!gameId || !socket.userId) return

      const room = await prisma.beloteRoom.findFirst({
        where: { gameId, status: 'IN_GAME' },
        select: { id: true },
      })
      if (!room) {
        socket.emit('ERROR', { code: 'GAME_NOT_FOUND', message: 'Partie introuvable' })
        return
      }

      const table = await loadBeloteTable(gameId)
      if (!table) {
        socket.emit('ERROR', { code: 'GAME_NOT_FOUND', message: 'Partie introuvable' })
        return
      }

      socket.join(`belote-game:${gameId}`)
      socket.beloteGameId = gameId

      await broadcastBeloteGame(io, gameId)
      scheduleBeloteTurnTimer(io, gameId, table)
    } catch (err) {
      console.error('[belote] JOIN_BELOTE_SPECTATE', err)
      socket.emit('ERROR', { code: 'SPECTATE_ERROR', message: 'Erreur spectateur' })
    }
  })

  socket.on('LEAVE_BELOTE_GAME', async (data: { gameId?: string }) => {
    const gameId = data?.gameId ?? socket.beloteGameId
    if (!gameId) return
    socket.leave(`belote-game:${gameId}`)
    if (socket.beloteGameId === gameId) socket.beloteGameId = undefined
    await broadcastBeloteGame(io, gameId)
  })

  socket.on('BELOTE_ACTION', async (data: { gameId?: string; action?: unknown }) => {
    try {
      const gameId = data?.gameId
      if (!gameId || !socket.userId) return

      const parsed = beloteActionSchema.safeParse(data?.action)
      if (!parsed.success) {
        socket.emit('ERROR', { code: 'INVALID_ACTION', message: 'Action invalide' })
        return
      }

      const table = activeBeloteGames.getSync(gameId)
      if (!table) {
        socket.emit('ERROR', { code: 'GAME_NOT_FOUND', message: 'Partie introuvable' })
        return
      }

      if (!table.getState().players.some((p) => p.userId === socket.userId)) {
        socket.emit('ERROR', { code: 'SPECTATOR', message: 'Action réservée aux joueurs' })
        return
      }

      const legalBefore = getLegalActions(table, socket.userId)
      const actionStart = Date.now()
      const result = table.applyAction(socket.userId, parsed.data)
      if (!result.ok) {
        socket.emit('ERROR', { code: result.error, message: result.error })
        return
      }

      void recordBeloteHumanDecision(table, socket.userId, Date.now() - actionStart)
      void journalBeloteTrainingSample({
        table,
        playerId: socket.userId,
        legalActions: legalBefore,
        decision: {
          action: parsed.data as import('../belote/services/beloteLegalEngine.js').BeloteLegalAction,
          reason: 'human',
        },
        source: 'HUMAN',
      })

      await syncBeloteAfterAction(table, io)
    } catch (err) {
      console.error('[belote] BELOTE_ACTION', err)
    }
  })

  socket.on('disconnect', () => {
    const gameId = socket.beloteGameId
    const roomId = socket.beloteRoomId
    if (gameId && socket.userId) {
      const t = activeBeloteGames.getSync(gameId)
      if (t) {
        t.markDisconnected(socket.userId)
        void syncBeloteAfterAction(t, io).catch(() => {})
      }
    }
    if (roomId) {
      void emitBeloteRoomUpdated(roomId, io).catch(() => {})
    }
  })

  socket.on('BELOTE_CHAT', async (data: { gameId?: string; message?: string }) => {
    try {
      const gameId = data?.gameId
      const raw = typeof data?.message === 'string' ? data.message.trim() : ''
      if (!gameId || !raw || !socket.userId) return
      const message = sanitizeHtml(raw, { allowedTags: [], allowedAttributes: {} }).slice(0, 280)
      if (!message) return

      const user = await prisma.user.findUnique({
        where: { id: socket.userId },
        select: { username: true },
      })

      io.to(`belote-game:${gameId}`).emit('BELOTE_CHAT', {
        gameId,
        userId: socket.userId,
        username: user?.username ?? 'Joueur',
        message,
        at: new Date().toISOString(),
      })
    } catch (err) {
      console.error('[belote] BELOTE_CHAT', err)
    }
  })
}

export async function forceCloseBeloteGame(
  gameId: string,
  io?: Server,
): Promise<boolean> {
  const table = activeBeloteGames.getSync(gameId)
  if (!table) return false
  const state = table.getState()
  const lead =
    state.teamScoreA >= state.teamScoreB ? ('A' as const) : ('B' as const)
  table.forceEnd(lead)
  const { settleBeloteGame } = await import('../belote/services/beloteSettlement.service.js')
  await settleBeloteGame(table, io)
  return true
}
