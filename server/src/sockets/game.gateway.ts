import { Server, Socket } from 'socket.io'
import { activeGames } from '../shared/activeGames.js'
import { activeBlackjackGames } from '../shared/activeBlackjackGames.js'
import { blackjackStateStore } from '../shared/blackjackStateStore.js'
import jwt from 'jsonwebtoken'
import { logSuspiciousAction } from '../utils/securityLogger.js'
import { AntiCheatMonitor } from '../utils/antiCheat.js'
import { prisma } from '../config/database.js'
import type { GameTable } from '../logic/GameTable.js'
import { CashGameController } from '../logic/CashGameController.js'
import { intChips } from '../utils/chips.js'
import {
  awardXpInTransaction,
  XP_POKER_SHOWDOWN_LOSS,
  XP_POKER_SHOWDOWN_WIN,
} from '../logic/gamification.js'
import { assessBlackjackRuntimeReadiness } from '../blackjack/services/blackjackRuntimeHealth.service.js'
import { applyPokerAction } from '../poker/services/pokerActionOrchestrator.service.js'
import { rootLogger } from '../observability/logger.js'
import { metrics as promMetrics } from '../observability/metrics.js'
import {
  incrementMultiplayerPlayCount,
  markWinWithPair,
} from '../dailyChallenges/dailyChallenge.service.js'

// 👇 B4 : IMPORT DU SERVICE ANTI-TRICHE 👇
import { AntiCheatService } from '../services/antiCheat.service.js'

interface AuthenticatedSocket extends Socket {
  userId?: string
  gameId?: string
}

export class GameGateway {
  private io: Server
  private timers: Map<string, NodeJS.Timeout> = new Map()
  
  // 👇 B4 : CHRONOMÈTRE ANTI-BOT 👇
  private turnStartTimes: Map<string, number> = new Map()

  /** Invalide les timers / callbacks obsolètes quand resetTimer/startTurnTimer se chevauchent (async gap). */
  private turnTimerEpoch: Map<string, number> = new Map()
  private socketToUser: Map<string, string> = new Map()
  private userToSocket: Map<string, string> = new Map()
  private antiCheat = new AntiCheatMonitor(8, 3000)
  private disconnectionTimeouts: Map<string, NodeJS.Timeout> = new Map()

  constructor(io: Server) {
    this.io = io
    this.setupMiddleware()
    this.setupHandlers()
    this.setupBlackjackStoreSubscription()
  }

  public notifyUser(userId: string, event: string, payload: unknown) {
    this.io.to(`user:${userId}`).emit(event, payload)
  }

  private setupMiddleware() {
    this.io.use((socket: AuthenticatedSocket, next) => {
      const authToken = socket.handshake.auth?.token
      const headerAuth = socket.handshake.headers?.authorization
      const token = authToken || (typeof headerAuth === 'string' ? headerAuth.split(' ')[1] : undefined)

      if (!token) {
        rootLogger.warn({ msg: 'socket_auth_missing_token', socketId: socket.id })
        logSuspiciousAction('MISSING_TOKEN', {
          socketId: socket.id,
          details: 'Connexion socket sans token'
        })
        return next(new Error('Token manquant'))
      }

      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'quantum_bluff_secret'
        ) as { userId: string }

        socket.userId = decoded.userId
        rootLogger.debug({ msg: 'socket_auth_ok', userId: socket.userId, socketId: socket.id })
        next()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Token invalide'
        rootLogger.warn({ msg: 'socket_auth_invalid_token', socketId: socket.id, detail: msg })
        logSuspiciousAction('INVALID_TOKEN', {
          socketId: socket.id,
          details: 'Token socket invalide'
        })
        next(new Error('Token invalide'))
      }
    })
  }

  private setupHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      const clientsCount = (this.io as unknown as { engine: { clientsCount: number } }).engine.clientsCount
      promMetrics.incSocketEvent('connection')
      rootLogger.debug({
        msg: 'socket_client_connected',
        socketId: socket.id,
        userId: socket.userId,
        clientsCount,
      })

      if (socket.userId) {
        this.socketToUser.set(socket.id, socket.userId)
        this.userToSocket.set(socket.userId, socket.id)
        socket.join(`user:${socket.userId}`)
        rootLogger.debug({
          msg: 'socket_user_room_joined',
          userId: socket.userId,
          socketId: socket.id,
        })
      }

      socket.on('JOIN_USER_ROOM', ({ userId }: { userId?: string }) => {
        if (!userId) return

        Array.from(socket.rooms).forEach((room) => {
          if (room.startsWith('user:')) {
            socket.leave(room)
          }
        })

        socket.join(`user:${userId}`)
        console.log(`✅ Utilisateur ${userId} a rejoint sa room personnelle`)
      })

      socket.on('join-room', ({ roomId }: { roomId?: string; userId?: string }) => {
        if (!roomId) return
        socket.join(roomId)
        console.log(`🚪 Socket ${socket.id} joined waiting room ${roomId}`)
      })

      socket.on('leave-room', ({ roomId }: { roomId?: string }) => {
        if (!roomId) return
        socket.leave(roomId)
      })

      socket.on('invite-to-room', async (data: { roomId: string; invitedUserId: string; inviterId: string }) => {
        const { roomId, invitedUserId, inviterId } = data
        if (!roomId || !invitedUserId || !inviterId) return
        if (socket.userId !== inviterId) return

        try {
          const room = await prisma.waitingRoom.findUnique({ where: { id: roomId } })
          if (!room || room.status !== 'WAITING' || room.hostId !== inviterId) return

          const invitation = await prisma.gameInvitation.upsert({
            where: { roomId_receiverId: { roomId, receiverId: invitedUserId } },
            create: { roomId, senderId: inviterId, receiverId: invitedUserId, status: 'PENDING' },
            update: { status: 'PENDING', senderId: inviterId },
          })

          const sender = await prisma.user.findUnique({
            where: { id: inviterId },
            select: { username: true },
          })

          this.io.to(`user:${invitedUserId}`).emit('GAME_INVITATION_RECEIVED', {
            invitationId: invitation.id,
            roomId,
            roomName: room.name,
            sender: { id: inviterId, username: sender?.username ?? 'Joueur' },
          })
          console.log(`📨 Invitation envoyée: ${inviterId} → ${invitedUserId} (salle ${roomId})`)
        } catch (err) {
          console.error('Erreur invite-to-room:', err)
        }
      })

      socket.on(
        'invite-to-blackjack-room',
        async (data: { blackjackRoomId: string; invitedUserId: string; inviterId: string }) => {
          const { blackjackRoomId, invitedUserId, inviterId } = data
          if (!blackjackRoomId || !invitedUserId || !inviterId) return
          if (socket.userId !== inviterId) return
          if (invitedUserId === inviterId) return

          try {
            const room = await prisma.blackjackRoom.findUnique({
              where: { id: blackjackRoomId },
              include: { seats: true },
            })
            if (!room || room.status !== 'WAITING' || room.hostId !== inviterId) return

            const friendship = await prisma.friendship.findFirst({
              where: {
                OR: [
                  { user1Id: inviterId, user2Id: invitedUserId },
                  { user1Id: invitedUserId, user2Id: inviterId },
                ],
              },
            })
            if (!friendship) return

            if (room.seats.some((s) => s.userId === invitedUserId)) return
            if (room.seats.length >= room.maxSeats) return

            const invitation = await prisma.blackjackRoomInvitation.upsert({
              where: {
                blackjackRoomId_receiverId: {
                  blackjackRoomId,
                  receiverId: invitedUserId,
                },
              },
              create: {
                blackjackRoomId,
                senderId: inviterId,
                receiverId: invitedUserId,
                status: 'PENDING',
              },
              update: { status: 'PENDING', senderId: inviterId },
            })

            const sender = await prisma.user.findUnique({
              where: { id: inviterId },
              select: { username: true },
            })

            this.io.to(`user:${invitedUserId}`).emit('GAME_INVITATION_RECEIVED', {
              invitationId: invitation.id,
              roomId: blackjackRoomId,
              roomName: room.name,
              sender: { id: inviterId, username: sender?.username ?? 'Joueur' },
              game: 'blackjack',
            })
            console.log(`📨 Invitation blackjack: ${inviterId} → ${invitedUserId} (${blackjackRoomId})`)
          } catch (err) {
            console.error('Erreur invite-to-blackjack-room:', err)
          }
        }
      )

      socket.on('JOIN_GAME', async (data: { gameId: string; playerId: string }) => {
        try {
          const { gameId, playerId } = data

          if (socket.userId && this.disconnectionTimeouts.has(socket.userId)) {
            clearTimeout(this.disconnectionTimeouts.get(socket.userId)!)
            this.disconnectionTimeouts.delete(socket.userId)
            console.log(`[Réseau] Joueur ${socket.userId} de retour avant la fin du timeout !`)
          }

          if (socket.userId !== playerId) {
            logSuspiciousAction('UNAUTHORIZED_JOIN', {
              userId: socket.userId,
              socketId: socket.id,
              gameId,
              action: 'JOIN_GAME',
              details: { requestedPlayerId: playerId }
            })

            socket.emit('ERROR', {
              code: 'UNAUTHORIZED',
              message: 'Vous n\'êtes pas autorisé à rejoindre cette partie'
            })
            return
          }

          socket.join(gameId);
          socket.gameId = gameId;
          
          const game = await activeGames.get(gameId);
          if (game) {
            socket.emit('GAME_UPDATE', game.getSanitizedState(playerId))
            console.log(`✅ Joueur ${playerId} a rejoint la partie ${gameId}`)
          } else {
            logSuspiciousAction('GAME_NOT_FOUND', {
              userId: socket.userId,
              socketId: socket.id,
              gameId,
              action: 'JOIN_GAME'
            })

            socket.emit('ERROR', {
              code: 'GAME_NOT_FOUND',
              message: 'Partie introuvable'
            })
          }
        } catch (error) {
          console.error('Erreur JOIN_GAME:', error)
          socket.emit('ERROR', {
            code: 'JOIN_ERROR',
            message: 'Erreur lors de la connexion à la partie'
          })
        }
      })

      socket.on('JOIN_SPECTATE', async (data: { gameId: string }) => {
        try {
          const { gameId } = data
          socket.join(gameId)
          socket.gameId = gameId

          const game = await activeGames.get(gameId)
          if (game) {
            socket.emit('GAME_UPDATE', game.getSanitizedState())
            console.log(`👁️ Spectateur a rejoint la partie ${gameId}`)
          } else {
            socket.emit('ERROR', {
              code: 'GAME_NOT_FOUND',
              message: 'Partie introuvable'
            })
          }
        } catch (error) {
          console.error('Erreur JOIN_SPECTATE:', error)
          socket.emit('ERROR', {
            code: 'SPECTATE_ERROR',
            message: 'Erreur lors de la connexion en spectateur'
          })
        }
      })

      socket.on('JOIN_BLACKJACK_TABLE', (data: { gameId?: string }) => {
        void (async () => {
          try {
          const gameId = data?.gameId
          if (!gameId || !socket.userId) return

          const room = await prisma.blackjackRoom.findFirst({
            where: { gameId },
            select: { id: true, status: true, gameId: true },
          })
          const runtimeState = await blackjackStateStore.getTable(gameId)
          const runtimeAssessment = assessBlackjackRuntimeReadiness({
            requestedGameId: gameId,
            room,
            runtimeState,
            snapshot: {
              exists: false,
            },
          })
          if (!runtimeAssessment.canServeState) {
            socket.emit('ERROR', {
              code: runtimeAssessment.status,
              message: runtimeAssessment.reason ?? 'Table indisponible',
            })
            return
          }

          socket.join(gameId)
          socket.join(`blackjack:${gameId}`)
          socket.gameId = gameId
          const table = activeBlackjackGames.getSync(gameId)
          if (table) {
            socket.emit('BLACKJACK_TABLE_UPDATE', {
              gameId,
              state: table.toPublicState(socket.userId),
            })
            console.log(`🃏 Socket ${socket.id} joined blackjack table ${gameId}`)
          } else {
            const stored = await blackjackStateStore.getTable(gameId)
            const storedPublicState = stored?.runtime?.publicState
            if (storedPublicState && typeof storedPublicState === 'object') {
              socket.emit('BLACKJACK_TABLE_UPDATE', {
                gameId,
                state: storedPublicState,
              })
              console.log(`🃏 Socket ${socket.id} joined blackjack table ${gameId} (store hydrate)`)
            } else {
              socket.emit('ERROR', {
                code: 'GAME_NOT_FOUND',
                message: 'Table blackjack introuvable',
              })
            }
          }
          } catch (err) {
            console.error('Erreur JOIN_BLACKJACK_TABLE:', err)
          }
        })()
      })

      socket.on('SPECTATOR_QUEUE_JOIN', async (data: { gameId: string }) => {
        try {
          const { gameId } = data
          if (!socket.userId || !gameId || socket.gameId !== gameId) return
          const game = await activeGames.get(gameId)
          if (!(game instanceof CashGameController)) return
          game.addSpectatorToRejoinQueue(socket.userId)
          socket.emit('SPECTATOR_QUEUE_STATUS', { queued: true })
        } catch (err) {
          console.error('Erreur SPECTATOR_QUEUE_JOIN:', err)
        }
      })

      socket.on('SPECTATOR_QUEUE_LEAVE', async (data: { gameId: string }) => {
        try {
          const { gameId } = data
          if (!socket.userId || !gameId || socket.gameId !== gameId) return
          const game = await activeGames.get(gameId)
          if (!(game instanceof CashGameController)) return
          game.removeSpectatorFromRejoinQueue(socket.userId)
          socket.emit('SPECTATOR_QUEUE_STATUS', { queued: false })
        } catch (err) {
          console.error('Erreur SPECTATOR_QUEUE_LEAVE:', err)
        }
      })

      socket.on('PLAYER_ACTION', async (data: { 
        gameId: string; 
        playerId: string; 
        action: 'FOLD' | 'CALL' | 'RAISE' | 'CHECK'; 
        amount?: number;
        actionId?: string;
        handId?: string;
        expectedStreet?: string;
      }) => {
        const startActionTime = Date.now()
        try {
          const { gameId, playerId, action, amount: rawAmount } = data
          const amount = rawAmount !== undefined ? intChips(rawAmount) : undefined

          if (!socket.userId) {
            socket.emit('ERROR', {
              code: 'UNAUTHORIZED',
              message: 'Utilisateur non authentifié'
            })
            return
          }

          // 👇 B4 : ANTI-BOT : VÉRIFICATION DU TEMPS DE RÉACTION 👇
          const turnStart = this.turnStartTimes.get(gameId);
          if (turnStart) {
            const reactionTimeMs = Date.now() - turnStart;
            this.turnStartTimes.delete(gameId); // On le supprime pour éviter de recompter

            // Appel non-bloquant au service anti-triche
            AntiCheatService.checkBotAction(socket.userId, reactionTimeMs).catch(err => {
              rootLogger.error({ msg: 'anticheat_bot_check_error', detail: err });
            });
          }
          // 👆 B4 : FIN ANTI-BOT 👆

          const antiCheatResult = this.antiCheat.registerAction(socket.userId)

          if (antiCheatResult.suspicious) {
            logSuspiciousAction('TOO_MANY_ACTIONS', {
              userId: socket.userId,
              socketId: socket.id,
              gameId,
              action,
              details: {
                countInWindow: antiCheatResult.count,
                windowMs: 3000
              }
            })

            socket.emit('ERROR', {
              code: 'TOO_MANY_ACTIONS',
              message: 'Trop d’actions en peu de temps'
            })
            return
          }

          if (socket.userId !== playerId) {
            logSuspiciousAction('PLAYER_ID_MISMATCH', {
              userId: socket.userId,
              socketId: socket.id,
              gameId,
              action,
              details: { providedPlayerId: playerId, amount }
            })

            socket.emit('ERROR', {
              code: 'UNAUTHORIZED',
              message: 'Action non autorisée'
            })
            return
          }

          const game = await activeGames.get(gameId)
          if (!game) {
            logSuspiciousAction('GAME_NOT_FOUND', {
              userId: socket.userId,
              socketId: socket.id,
              gameId,
              action
            })

            socket.emit('ERROR', {
              code: 'GAME_NOT_FOUND',
              message: 'Partie introuvable'
            })
            return
          }

          await applyPokerAction({
            gameId,
            playerId,
            actionType: action,
            amount,
            actionId: data.actionId,
            handId: data.handId,
            expectedStreet: data.expectedStreet,
          })

          this.resetTimer(gameId)
          const freshGame = await activeGames.get(gameId)
          if (!freshGame) {
            socket.emit('ERROR', {
              code: 'GAME_NOT_FOUND',
              message: 'Partie introuvable',
            })
            return
          }
          const socketsInRoom = await this.io.in(gameId).fetchSockets()
          for (const s of socketsInRoom) {
            const uid = (s as unknown as AuthenticatedSocket).userId
            const isSpectator = !freshGame.getPlayerState(uid ?? '')
            const snapshot = freshGame.getSanitizedState(isSpectator ? undefined : uid)
            s.emit('GAME_UPDATE', snapshot)
            s.emit('GAME_STATE_UPDATED', snapshot)
          }
          this.io.to(gameId).emit('HAND_STATE_CHANGED', {
            gameId,
            phase: freshGame.state.phase,
            handRuntimePhase: freshGame.state.handRuntimePhase,
            handEndReason: freshGame.state.handEndReason,
            handId: freshGame.state.handId,
          })

          if (freshGame.state.phase === 'SHOWDOWN') {
            this.io.to(gameId).emit('SHOWDOWN_REVEAL', {
              gameId,
              handId: freshGame.state.handId,
              handEndReason: freshGame.state.handEndReason,
            })
            const innerGame = freshGame instanceof CashGameController ? freshGame.getGameTable() : freshGame
            if (innerGame && freshGame.state.showdownWinnerId) {
              this.recordMultiPlayerStats(innerGame as GameTable).catch((err) =>
                console.error('[Stats] Erreur enregistrement stats multi:', err)
              )
            }
            if (freshGame instanceof CashGameController) {
              const cashGame = freshGame as CashGameController
              cashGame.onHandComplete()
              await cashGame.processRejoinQueue(async (uid) => {
                const u = await prisma.user.findUnique({
                  where: { id: uid },
                  select: { username: true, chips: true }
                })
                return u ? { username: u.username, chips: Math.max(100, u.chips ?? 1000) } : null
              })
              const socketsInRoom2 = await this.io.in(gameId).fetchSockets()
              for (const s of socketsInRoom2) {
                const uid = (s as unknown as AuthenticatedSocket).userId
                s.emit('GAME_UPDATE', freshGame.getSanitizedState(uid))
              }
              this.io.to(gameId).emit('SHOWDOWN_RESULT', {
                gameId,
                handId: freshGame.state.handId,
                winnerId: freshGame.state.showdownWinnerId,
                winnerIds: freshGame.state.showdownWinnerIds ?? [],
                handEndReason: freshGame.state.handEndReason,
              })
              this.io.to(gameId).emit('POT_DISTRIBUTED', {
                gameId,
                handId: freshGame.state.handId,
                pot: freshGame.state.showdownPot ?? 0,
              })
              this.io.to(gameId).emit('NEXT_HAND_COUNTDOWN', {
                gameId,
                countdownEndsAt: freshGame.state.cashCountdownEndsAt,
              })
            }
          } else {
            this.startTurnTimer(gameId)
          }
          
          const duration = Date.now() - startActionTime
          console.log(`[Réseau] ⚡ Action ${action} traitée et diffusée en ${duration}ms pour ${playerId}`)
        } catch (error) {
          const e = error as { code?: string; message?: string }
          logSuspiciousAction('ACTION_ERROR', {
            userId: socket.userId,
            socketId: socket.id,
            gameId: data.gameId,
            action: data.action,
            details: e?.message ?? (error as Error).message
          })

          console.error('Erreur PLAYER_ACTION:', error)
          socket.emit('ERROR', {
            code: e?.code ?? 'ACTION_ERROR',
            message: e?.message ?? (error as Error).message
          })
        }
      })

      socket.on('GAME_CHAT', (data: { gameId: string; playerId: string; playerName: string; content: string; type: 'emoji' | 'text' }) => {
        const { gameId, playerId, playerName, content, type } = data
        if (!gameId || !playerId || !content || !socket.gameId || socket.gameId !== gameId) return
        if (socket.userId !== playerId) return
        socket.broadcast.to(gameId).emit('GAME_CHAT', { playerId, playerName, content, type })
      })

      socket.on('CASH_SIT', async (data: { gameId: string; seatIndex: number; buyIn: number }) => {
        try {
          const { gameId, seatIndex, buyIn } = data
          if (!socket.userId || !gameId || socket.gameId !== gameId) return
          const game = await activeGames.get(gameId)
          if (!(game instanceof CashGameController)) return
          const user = await prisma.user.findUnique({
            where: { id: socket.userId },
            select: { username: true }
          })
          const result = game.sit(socket.userId, user?.username ?? 'Joueur', seatIndex, buyIn ?? 100)
          if (!result.ok) {
            socket.emit('ERROR', { code: 'CASH_SIT_FAILED', message: result.error })
            return
          }
          const socketsInRoom = await this.io.in(gameId).fetchSockets()
          for (const s of socketsInRoom) {
            const uid = (s as unknown as AuthenticatedSocket).userId
            const snapshot = game.getSanitizedState(uid)
            s.emit('GAME_UPDATE', snapshot)
            s.emit('GAME_STATE_UPDATED', snapshot)
          }
        } catch (err) {
          console.error('Erreur CASH_SIT:', err)
        }
      })

      socket.on('CASH_LEAVE', async (data: { gameId: string }) => {
        try {
          const { gameId } = data
          if (!socket.userId || !gameId || socket.gameId !== gameId) return
          const game = await activeGames.get(gameId)
          if (!(game instanceof CashGameController)) return
          const roomId = game.roomId
          const result = game.leave(socket.userId)
          if (!result.ok) {
            socket.emit('ERROR', { code: 'CASH_LEAVE_FAILED', message: result.error })
            return
          }

          const leaverId = socket.userId
          let dissolveReason: 'all_players_left' | 'heads_up_peer_left' | null = null

          this.io.to(gameId).emit('PLAYER_LEFT', { gameId, playerId: leaverId, scope: 'GAME' })

          // Heads-up : s’il ne reste qu’un joueur entre deux mains, on dissout la table (retour salle d’attente).
          // 3+ joueurs : la partie continue avec les sièges restants.
          if (game.getOccupiedCount() === 1) {
            const remaining = game.getOccupiedSeats()[0]?.userId
            if (remaining) {
              game.cancelInterHandCountdown()
              game.leave(remaining)
              dissolveReason = 'heads_up_peer_left'
            }
          }

          if (game.getOccupiedCount() > 0) {
            const socketsInRoom = await this.io.in(gameId).fetchSockets()
            for (const s of socketsInRoom) {
              const uid = (s as unknown as AuthenticatedSocket).userId
              const snapshot = game.getSanitizedState(uid)
              s.emit('GAME_UPDATE', snapshot)
              s.emit('GAME_STATE_UPDATED', snapshot)
            }
          }

          if (game.getOccupiedCount() === 0) {
            if (!dissolveReason) dissolveReason = 'all_players_left'
            await activeGames.delete(gameId)
            await prisma.waitingRoom.updateMany({
              where: { id: roomId },
              data: { status: 'WAITING', gameId: null },
            })
            this.io.to(gameId).emit('GAME_ENDED', {
              gameId,
              reason: dissolveReason,
              roomId,
            })
          }
        } catch (err) {
          console.error('Erreur CASH_LEAVE:', err)
        }
      })

      socket.on('CASH_REBUY', async (data: { gameId: string; amount: number }) => {
        try {
          const { gameId, amount } = data
          if (!socket.userId || !gameId || socket.gameId !== gameId) return
          const game = await activeGames.get(gameId)
          if (!(game instanceof CashGameController)) return
          const result = game.rebuy(socket.userId, intChips(amount ?? 100))
          if (!result.ok) {
            socket.emit('ERROR', { code: 'CASH_REBUY_FAILED', message: result.error })
            return
          }
          const socketsInRoom = await this.io.in(gameId).fetchSockets()
          for (const s of socketsInRoom) {
            const uid = (s as unknown as AuthenticatedSocket).userId
            s.emit('GAME_UPDATE', game.getSanitizedState(uid))
          }
        } catch (err) {
          console.error('Erreur CASH_REBUY:', err)
        }
      })

      socket.on('RECONNECT_GAME', async (data: { gameId: string }) => {
        try {
          const { gameId } = data

          if (socket.userId && this.disconnectionTimeouts.has(socket.userId)) {
            clearTimeout(this.disconnectionTimeouts.get(socket.userId)!)
            this.disconnectionTimeouts.delete(socket.userId)
            console.log(`[Réseau] Joueur ${socket.userId} de retour avant la fin du timeout !`)
          }

          if (socket.gameId && socket.gameId !== gameId) {
            socket.leave(socket.gameId)
          }

          socket.join(gameId)
          socket.gameId = gameId

          const game = await activeGames.get(gameId);
          if (game && socket.userId) {
            const player = game.getPlayerState(socket.userId)
            if (player) {
              player.isConnected = true
            }

            socket.emit('GAME_UPDATE', game.getSanitizedState(socket.userId))
            this.io.to(gameId).emit('PLAYER_RECONNECTED', {
              playerId: socket.userId,
              gameId
            })

            console.log(`🔄 Joueur ${socket.userId} reconnecté à la partie ${gameId}`)
          } else {
            logSuspiciousAction('RECONNECT_ERROR', {
              userId: socket.userId,
              socketId: socket.id,
              gameId,
              action: 'RECONNECT_GAME'
            })

            socket.emit('ERROR', {
              code: 'RECONNECT_ERROR',
              message: 'Impossible de se reconnecter à la partie'
            })
          }
        } catch (error) {
          console.error('Erreur RECONNECT_GAME:', error)
          socket.emit('ERROR', {
            code: 'RECONNECT_ERROR',
            message: 'Erreur lors de la reconnexion'
          })
        }
      })

      socket.on('disconnect', async (reason) => {
        const currentCount = (this.io as unknown as { engine: { clientsCount: number } }).engine.clientsCount
        promMetrics.incSocketEvent('disconnect')
        rootLogger.debug({
          msg: 'socket_client_disconnected',
          socketId: socket.id,
          reason,
          clientsCount: currentCount,
        })

        const userId = socket.userId
        if (userId) {
          this.socketToUser.delete(socket.id)
          this.userToSocket.delete(userId)
          this.antiCheat.clearUser(userId)

          this.io.emit('FRIEND_STATUS_CHANGED', {
            userId,
            status: 'offline'
          })
        } else {
          this.socketToUser.delete(socket.id)
        }

        if (socket.gameId && userId && !process.env.JEST_WORKER_ID) {
          const gameId = socket.gameId
          console.log(`[Réseau] Joueur ${userId} déconnecté. Lancement du délai de 10s...`)

          const timeout = setTimeout(async () => {
            console.log(`[Réseau] Timeout expiré pour ${userId}. Le joueur est officiellement hors ligne.`)
            const game = await activeGames.get(gameId)
            if (game) {
              const player = game.getPlayerState(userId)
              if (player) {
                player.isConnected = false

                if (game.state.currentTurn === userId) {
                  try {
                    console.log(`[Réseau] Auto-FOLD pour le joueur déconnecté ${userId}`)
                    game.handlePlayerAction(userId, 'FOLD') 
                    const socketsInRoom = await this.io.in(gameId).fetchSockets()
                    for (const s of socketsInRoom) {
                      const uid = (s as unknown as AuthenticatedSocket).userId
                      const snapshot = game.getSanitizedState(uid)
                      s.emit('GAME_UPDATE', snapshot)
                      s.emit('GAME_STATE_UPDATED', snapshot)
                    }
                    this.startTurnTimer(gameId)
                  } catch (error) {
                    console.error('[Réseau] Erreur auto-fold timeout:', error)
                  }
                } else {
                  player.isActive = false
                  game.forceFoldForDisconnect(userId)
                  const socketsInRoom = await this.io.in(gameId).fetchSockets()
                  for (const s of socketsInRoom) {
                    const uid = (s as unknown as AuthenticatedSocket).userId
                    const snapshot = game.getSanitizedState(uid)
                    s.emit('GAME_UPDATE', snapshot)
                    s.emit('GAME_STATE_UPDATED', snapshot)
                  }
                  if (game.state.phase === 'SHOWDOWN') {
                    this.startTurnTimer(gameId)
                  }
                }

                const result = game.endGameDueToDisconnect()
                if (result) {
                  this.resetTimer(gameId)
                  await activeGames.delete(gameId)
                  this.io.to(gameId).emit('GAME_ENDED', {
                    gameId,
                    winnerId: result.winnerId,
                    reason: 'opponent_left',
                    pot: result.pot
                  })
                } else {
                  this.io.to(gameId).emit('PLAYER_DISCONNECTED', {
                    playerId: userId,
                    gameId
                  })
                  this.io.to(gameId).emit('PLAYER_LEFT', { gameId, playerId: userId, scope: 'GAME' })
                }
              } else if (game instanceof CashGameController) {
                const removed = game.removeDisconnectedPlayer(userId)
                if (removed) {
                  const socketsInRoom = await this.io.in(gameId).fetchSockets()
                  for (const s of socketsInRoom) {
                    const uid = (s as unknown as AuthenticatedSocket).userId
                    s.emit('GAME_UPDATE', game.getSanitizedState(uid))
                  }
                  if (game.getOccupiedCount() === 0) {
                    await activeGames.delete(gameId)
                    await prisma.waitingRoom.updateMany({
                      where: { id: game.roomId },
                      data: { status: 'WAITING', gameId: null },
                    })
                    this.io.to(gameId).emit('GAME_ENDED', {
                      gameId,
                      reason: 'all_players_left',
                      roomId: game.roomId,
                    })
                  }
                }
              }
            }
            this.disconnectionTimeouts.delete(userId)
          }, 10000)

          ;(timeout as NodeJS.Timeout).unref?.()

          this.disconnectionTimeouts.set(userId, timeout)
        }
      })
    })
  }

  private setupBlackjackStoreSubscription() {
    void blackjackStateStore.subscribeUpdates(async (event) => {
      if (event.type !== 'BLACKJACK_TABLE_UPDATE') return
      const state = await blackjackStateStore.getTable(event.tableId)
      const storedPublicState = state?.runtime?.publicState
      if (!storedPublicState || typeof storedPublicState !== 'object') return

      this.io.to(`blackjack:${event.tableId}`).emit('BLACKJACK_TABLE_UPDATE', {
        gameId: event.tableId,
        state: storedPublicState,
      })
    })
  }

  private async recordMultiPlayerStats(game: GameTable): Promise<void> {
    const winnerId = game.state.showdownWinnerId
    const winnerIds = game.state.showdownWinnerIds ?? (winnerId ? [winnerId] : [])
    const pot = game.state.showdownPot ?? 0
    if (!winnerId) return

    for (const player of game.state.players) {
      const isWinner = player.id === winnerId
      const isWinningPlayer = winnerIds.includes(player.id)
      const chipsWon = isWinner ? pot : 0
      const chipsLost = !isWinner ? (player.totalPutInThisHand ?? player.currentBet ?? 0) : 0
      const participatedInHand =
        (player.totalPutInThisHand ?? 0) > 0 ||
        (player.currentBet ?? 0) > 0 ||
        isWinningPlayer

      try {
        const xpAmount = isWinner ? XP_POKER_SHOWDOWN_WIN : XP_POKER_SHOWDOWN_LOSS
        await prisma.$transaction(async (tx) => {
          await tx.playerStats.upsert({
            where: { playerId: player.id },
            create: {
              playerId: player.id,
              totalGames: 1,
              totalWins: isWinner ? 1 : 0,
              totalLosses: isWinner ? 0 : 1,
              totalChipsWon: chipsWon,
              totalChipsLost: chipsLost,
              biggestWin: chipsWon,
              biggestPot: pot,
            },
            update: {
              totalGames: { increment: 1 },
              ...(isWinner
                ? { totalWins: { increment: 1 }, totalChipsWon: { increment: chipsWon } }
                : { totalLosses: { increment: 1 }, totalChipsLost: { increment: chipsLost } }),
            },
          })
          await awardXpInTransaction(tx, player.id, xpAmount)
          if (participatedInHand) {
            await incrementMultiplayerPlayCount(player.id, tx)
          }
          if (isWinningPlayer) {
            await markWinWithPair(player.id, game.state.showdownHandName, true, tx)
          }
        })
      } catch (err) {
        console.error('[Stats] Erreur upsert pour', player.id, err)
      }
    }
    console.log(`[Stats] Stats multi enregistrées pour la partie ${game.id} (gagnant: ${winnerId})`)
  }

  private bumpTurnTimerEpoch(gameId: string): number {
    const next = (this.turnTimerEpoch.get(gameId) ?? 0) + 1
    this.turnTimerEpoch.set(gameId, next)
    return next
  }

  private startTurnTimer(gameId: string) {
    const existing = this.timers.get(gameId)
    if (existing) {
      clearTimeout(existing)
      this.timers.delete(gameId)
    }
    const epoch = this.bumpTurnTimerEpoch(gameId)

    void (async () => {
      const game = await activeGames.get(gameId)
      if (!game) return
      if (this.turnTimerEpoch.get(gameId) !== epoch) return

      const turnMs =
        game instanceof CashGameController ? game.getTurnTimeoutMs() : 30_000
      const timeLeftSec = Math.round(turnMs / 1000)

      const timer = setTimeout(async () => {
        if (this.turnTimerEpoch.get(gameId) !== epoch) return
        this.resetTimer(gameId)
        const g = await activeGames.get(gameId)
        if (!g) return

        const currentPlayerId = g.state.currentTurn
        if (currentPlayerId) {
          try {
            const player = g.getPlayerState(currentPlayerId)
            if (!player) return

            const callAmount = g.calculateCallAmount(currentPlayerId)

            if (callAmount === 0) {
              console.log(`⏱️ Timeout - ${player.name} CHECK auto`)
              g.handlePlayerAction(currentPlayerId, 'CHECK')
            } else {
              console.log(
                `⏱️ Timeout - ${player.name} FOLD auto (callAmount: ${callAmount})`
              )
              g.handlePlayerAction(currentPlayerId, 'FOLD')
            }

            const socketsInRoom = await this.io.in(gameId).fetchSockets()
            for (const s of socketsInRoom) {
              const uid = (s as unknown as AuthenticatedSocket).userId
              s.emit('GAME_UPDATE', g.getSanitizedState(uid))
            }
            if (g.state.currentTurn) {
              this.startTurnTimer(gameId)
            }
          } catch (error) {
            console.error('Erreur timeout:', error)
          }
        }
      }, turnMs)

      if (this.turnTimerEpoch.get(gameId) !== epoch) {
        clearTimeout(timer)
        return
      }
      this.timers.set(gameId, timer)
      
      // 👇 B4 : ANTI-BOT : ON DÉMARRE LE CHRONO ICI 👇
      this.turnStartTimes.set(gameId, Date.now())
      
      this.io.to(gameId).emit('TURN_TIMER', { gameId, timeLeft: timeLeftSec })
    })()
  }

  private resetTimer(gameId: string) {
    if (this.timers.has(gameId)) {
      clearTimeout(this.timers.get(gameId)!)
      this.timers.delete(gameId)
    }
    // 👇 B4 : ANTI-BOT : ON VIDE LE CHRONO 👇
    this.turnStartTimes.delete(gameId)
    
    this.bumpTurnTimerEpoch(gameId)
  }
}
