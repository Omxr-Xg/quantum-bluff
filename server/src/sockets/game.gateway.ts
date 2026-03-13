import { Server, Socket } from 'socket.io'
import { activeGames } from '../shared/activeGames.js'
import jwt from 'jsonwebtoken'

interface AuthenticatedSocket extends Socket {
  userId?: string
  gameId?: string
}

export class GameGateway {
  private io: Server
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private socketToUser: Map<string, string> = new Map()
  private userToSocket: Map<string, string> = new Map()

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
      const token = socket.handshake.auth?.token

      if (!token) {
        return next(new Error('Token manquant'))
      }

      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'quantum_bluff_secret'
        ) as { userId: string }

        socket.userId = decoded.userId
        next()
      } catch {
        next(new Error('Token invalide'))
      }
    })
  }

  private setupHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log('🎮 Joueur connecté:', socket.id, 'User:', socket.userId)

      if (socket.userId) {
        this.socketToUser.set(socket.id, socket.userId)
        this.userToSocket.set(socket.userId, socket.id)
        socket.join(`user:${socket.userId}`)
        console.log(`🔐 ${socket.userId} joined room user:${socket.userId}`)
      }

      socket.on('JOIN_GAME', (data: { gameId: string; playerId: string }) => {
        try {
          const { gameId, playerId } = data

          if (socket.userId !== playerId) {
            socket.emit('ERROR', {
              code: 'UNAUTHORIZED',
              message: 'Vous n\'êtes pas autorisé à rejoindre cette partie'
            })
            return
          }

          socket.join(gameId)
          socket.gameId = gameId

          const game = activeGames.get(gameId)
          if (game) {
            socket.emit('GAME_UPDATE', game.getSanitizedState(playerId))
            console.log(`✅ Joueur ${playerId} a rejoint la partie ${gameId}`)
          } else {
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

      socket.on('PLAYER_ACTION', (data: {
        gameId: string
        playerId: string
        action: 'FOLD' | 'CALL' | 'RAISE' | 'CHECK'
        amount?: number
      }) => {
        try {
          const { gameId, playerId, action, amount } = data

          if (socket.userId !== playerId) {
            socket.emit('ERROR', {
              code: 'UNAUTHORIZED',
              message: 'Action non autorisée'
            })
            return
          }

          const game = activeGames.get(gameId)
          if (!game) {
            socket.emit('ERROR', {
              code: 'GAME_NOT_FOUND',
              message: 'Partie introuvable'
            })
            return
          }

          if (game.state.currentTurn !== playerId) {
            socket.emit('ERROR', {
              code: 'NOT_YOUR_TURN',
              message: 'Ce n\'est pas votre tour'
            })
            return
          }

          if (action === 'RAISE' && (!amount || amount < game['bigBlindAmount'])) {
            socket.emit('ERROR', {
              code: 'INVALID_RAISE',
              message: `La relance minimum est de ${game['bigBlindAmount']}`
            })
            return
          }

          game.handlePlayerAction(playerId, action, amount)

          this.resetTimer(gameId)
          this.io.to(gameId).emit('GAME_UPDATE', game.getSanitizedState())
          this.startTurnTimer(gameId)
        } catch (error) {
          console.error('Erreur PLAYER_ACTION:', error)
          socket.emit('ERROR', {
            code: 'ACTION_ERROR',
            message: (error as Error).message
          })
        }
      })

      socket.on('RECONNECT_GAME', (data: { gameId: string }) => {
        try {
          const { gameId } = data

          if (socket.gameId && socket.gameId !== gameId) {
            socket.leave(socket.gameId)
          }

          socket.join(gameId)
          socket.gameId = gameId

          const game = activeGames.get(gameId)
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

      socket.on('disconnect', () => {
        console.log('👋 Joueur déconnecté:', socket.id)

        const userId = socket.userId
        if (userId) {
          this.socketToUser.delete(socket.id)
          this.userToSocket.delete(userId)
        }

        if (socket.gameId && userId) {
          const game = activeGames.get(socket.gameId)
          if (game) {
            const player = game.getPlayerState(userId)
            if (player) {
              player.isConnected = false
              this.io.to(socket.gameId).emit('PLAYER_DISCONNECTED', {
                playerId: userId,
                gameId: socket.gameId
              })
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

    const timer = setTimeout(() => {
      const game = activeGames.get(gameId)
      if (!game) return

      const currentPlayerId = game.state.currentTurn
      if (currentPlayerId) {
        try {
          game.handlePlayerAction(currentPlayerId, 'FOLD')
          this.io.to(gameId).emit('GAME_UPDATE', game.getSanitizedState())
          this.startTurnTimer(gameId)
        } catch (error) {
          console.error('Erreur timeout:', error)
        }
      }
    }, 30000)

    this.timers.set(gameId, timer)
    this.io.to(gameId).emit('TURN_TIMER', { gameId, timeLeft: 30 })
  }

  private resetTimer(gameId: string) {
    if (this.timers.has(gameId)) {
      clearTimeout(this.timers.get(gameId)!)
      this.timers.delete(gameId)
    }
  }
}