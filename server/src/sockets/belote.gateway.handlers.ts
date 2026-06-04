import type { Server, Socket } from 'socket.io'
import { prisma } from '../config/database.js'
import { beloteActionSchema } from '../logic/belote/beloteAction.validation.js'
import { activeBeloteGames } from '../shared/activeBeloteGames.js'
import { syncBeloteAfterAction } from '../belote/services/beloteSettlement.service.js'
import { emitBeloteRoomUpdated } from '../routes/beloteRoom.routes.js'
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
    if (table.processDisconnectTimeouts()) {
      void syncBeloteAfterAction(table, io)
    }
  }, 5000)
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

  socket.on('LEAVE_BELOTE_ROOM', (data: { roomId?: string }) => {
    const roomId = data?.roomId ?? socket.beloteRoomId
    if (!roomId) return
    socket.leave(`belote-room:${roomId}`)
    if (socket.beloteRoomId === roomId) socket.beloteRoomId = undefined
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

      const table = activeBeloteGames.getSync(gameId)
      if (table) {
        table.markReconnected(socket.userId)
        socket.emit('BELOTE_GAME_UPDATE', {
          gameId,
          state: table.getSanitizedState(socket.userId),
        })
        startDisconnectPoller(io, gameId)
      } else {
        const snap = await prisma.beloteGameSnapshot.findFirst({ where: { gameId } })
        if (!snap) {
          socket.emit('ERROR', { code: 'GAME_NOT_FOUND', message: 'Partie introuvable' })
          return
        }
        const { BeloteTableController } = await import('../logic/belote/BeloteTableController.js')
        const ctrl = BeloteTableController.fromSnapshot(
          snap.snapshot as import('../logic/belote/types.js').BeloteGameState,
        )
        activeBeloteGames.set(gameId, ctrl)
        ctrl.markReconnected(socket.userId)
        socket.emit('BELOTE_GAME_UPDATE', {
          gameId,
          state: ctrl.getSanitizedState(socket.userId),
        })
        startDisconnectPoller(io, gameId)
      }
    } catch (err) {
      console.error('[belote] JOIN_BELOTE_GAME', err)
    }
  })

  socket.on('LEAVE_BELOTE_GAME', (data: { gameId?: string }) => {
    const gameId = data?.gameId ?? socket.beloteGameId
    if (!gameId) return
    if (socket.userId) {
      const table = activeBeloteGames.getSync(gameId)
      table?.markDisconnected(socket.userId)
    }
    socket.leave(`belote-game:${gameId}`)
    if (socket.beloteGameId === gameId) socket.beloteGameId = undefined
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

      const result = table.applyAction(socket.userId, parsed.data)
      if (!result.ok) {
        socket.emit('ERROR', { code: result.error, message: result.error })
        return
      }

      await syncBeloteAfterAction(table, io)
    } catch (err) {
      console.error('[belote] BELOTE_ACTION', err)
    }
  })

  socket.on('disconnect', () => {
    const gameId = socket.beloteGameId
    if (gameId && socket.userId) {
      const table = activeBeloteGames.getSync(gameId)
      const t = activeBeloteGames.getSync(gameId)
      if (t) {
        t.markDisconnected(socket.userId)
        void syncBeloteAfterAction(t, io).catch(() => {})
      }
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
