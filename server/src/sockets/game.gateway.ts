import { Server, Socket } from 'socket.io'
import { activeGames } from '../shared/activeGames.js'
import jwt from 'jsonwebtoken'
import { logSuspiciousAction } from '../utils/securityLogger.js'
import { AntiCheatMonitor } from '../utils/antiCheat.js'

interface AuthenticatedSocket extends Socket {
  userId?: string
  gameId?: string
}

export class GameGateway {
  private io: Server
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private socketToUser: Map<string, string> = new Map()
  private userToSocket: Map<string, string> = new Map()
  private antiCheat = new AntiCheatMonitor(8, 3000)

  constructor(io: Server) {
    this.io = io
    this.setupMiddleware()
    this.setupHandlers()
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
        console.log('❌ Socket: token manquant')
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
        console.log('✅ Socket authentifié:', socket.userId)
        next()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Token invalide'
        console.log('❌ Socket token invalide:', msg)
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
      console.log('🎮 Nouvelle connexion socket:', socket.id, 'User:', socket.userId)

      socket.on('disconnect', (reason) => {
        console.log('👋 Socket déconnecté:', socket.id, 'Raison:', reason)
        this.socketToUser.delete(socket.id)
        if (socket.userId) this.userToSocket.delete(socket.userId)
      })

      if (socket.userId) {
        this.socketToUser.set(socket.id, socket.userId)
        this.userToSocket.set(socket.userId, socket.id)
        socket.join(`user:${socket.userId}`)
        console.log(`🔐 ${socket.userId} joined room user:${socket.userId}`)
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

      socket.on('JOIN_GAME', async (data: { gameId: string; playerId: string }) => {
        try {
          const { gameId, playerId } = data

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

      socket.on('PLAYER_ACTION', async (data: { 
        gameId: string; 
        playerId: string; 
        action: 'FOLD' | 'CALL' | 'RAISE' | 'CHECK'; 
        amount?: number;
      }) => {
        try {
          const { gameId, playerId, action, amount } = data

          if (!socket.userId) {
            socket.emit('ERROR', {
              code: 'UNAUTHORIZED',
              message: 'Utilisateur non authentifié'
            })
            return
          }

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

          if (game.state.currentTurn !== playerId) {
            logSuspiciousAction('NOT_YOUR_TURN', {
              userId: socket.userId,
              socketId: socket.id,
              gameId,
              action,
              details: {
                currentTurn: game.state.currentTurn,
                providedPlayerId: playerId
              }
            })

            socket.emit('ERROR', {
              code: 'NOT_YOUR_TURN',
              message: 'Ce n\'est pas votre tour'
            })
            return
          }

          if (action === 'RAISE' && (!amount || amount < 20)) {
            logSuspiciousAction('INVALID_RAISE', {
              userId: socket.userId,
              socketId: socket.id,
              gameId,
              action,
              details: { amount }
            })

            socket.emit('ERROR', {
              code: 'INVALID_RAISE',
              message: 'La relance minimum est de 20'
            })
            return
          }

          game.handlePlayerAction(playerId, action, amount)

          this.resetTimer(gameId)
          const socketsInRoom = await this.io.in(gameId).fetchSockets()
          for (const s of socketsInRoom) {
            const uid = (s as AuthenticatedSocket).userId
            s.emit('GAME_UPDATE', game.getSanitizedState(uid))
          }
          this.startTurnTimer(gameId)
        } catch (error) {
          logSuspiciousAction('ACTION_ERROR', {
            userId: socket.userId,
            socketId: socket.id,
            gameId: data.gameId,
            action: data.action,
            details: (error as Error).message
          })

          console.error('Erreur PLAYER_ACTION:', error)
          socket.emit('ERROR', {
            code: 'ACTION_ERROR',
            message: (error as Error).message
          })
        }
      })

      socket.on('RECONNECT_GAME', async (data: { gameId: string }) => {
        try {
          const { gameId } = data

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

      socket.on('disconnect', async () => {
        console.log('👋 Joueur déconnecté:', socket.id)

        const userId = socket.userId
        if (userId) {
          this.socketToUser.delete(socket.id)
          this.userToSocket.delete(userId)
          this.antiCheat.clearUser(userId)

          this.io.emit('FRIEND_STATUS_CHANGED', {
            userId,
            status: 'offline'
          })
        }

        if (socket.gameId && userId) {
          const gameId = socket.gameId
          const game = await activeGames.get(gameId)
          if (game) {
            const player = game.getPlayerState(userId)
            if (player) {
              player.isConnected = false
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
              }
            }
          }
        }
      })
    })
  }

  private startTurnTimer(gameId: string) {
    if (this.timers.has(gameId)) {
      clearTimeout(this.timers.get(gameId)!)
    }

    const TURN_TIMEOUT_MS = 20000

    const timer = setTimeout(async () => {
      this.resetTimer(gameId)
      const game = await activeGames.get(gameId)
      if (!game) return

      const currentPlayerId = game.state.currentTurn
      if (currentPlayerId) {
        try {
          const player = game.getPlayerState(currentPlayerId)
          if (!player) return

          const callAmount = game.calculateCallAmount(currentPlayerId)

          if (callAmount === 0) {
            console.log(`⏱️ Timeout - ${player.name} CHECK auto`)
            game.handlePlayerAction(currentPlayerId, 'CHECK')
          } else {
            console.log(
              `⏱️ Timeout - ${player.name} FOLD auto (callAmount: ${callAmount})`
            )
            game.handlePlayerAction(currentPlayerId, 'FOLD')
          }

          const socketsInRoom = await this.io.in(gameId).fetchSockets()
          for (const s of socketsInRoom) {
            const uid = (s as AuthenticatedSocket).userId
            s.emit('GAME_UPDATE', game.getSanitizedState(uid))
          }
          if (game.state.currentTurn) {
            this.startTurnTimer(gameId)
          }
        } catch (error) {
          console.error('Erreur timeout:', error)
        }
      }
    }, TURN_TIMEOUT_MS)

    this.timers.set(gameId, timer)
    this.io.to(gameId).emit('TURN_TIMER', { gameId, timeLeft: 20 })
  }

  private resetTimer(gameId: string) {
    if (this.timers.has(gameId)) {
      clearTimeout(this.timers.get(gameId)!)
      this.timers.delete(gameId)
    }
  }
}