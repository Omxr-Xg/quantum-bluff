import { Server, Socket } from 'socket.io'
import { activeGames } from '../shared/activeGames.js'
import jwt from 'jsonwebtoken'
import { logSuspiciousAction } from '../utils/securityLogger.js'
import { AntiCheatMonitor } from '../utils/antiCheat.js'
import { prisma } from '../config/database.js'
import type { GameTable } from '../logic/GameTable.js'
import { CashGameController } from '../logic/CashGameController.js'

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
  private disconnectionTimeouts: Map<string, NodeJS.Timeout> = new Map()

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
      const clientsCount = (this.io as unknown as { engine: { clientsCount: number } }).engine.clientsCount
      console.log(`[Monitoring Réseau] 🌐 Nouvelle connexion socket: ${socket.id} (User: ${socket.userId}). Total simultanées: ${clientsCount}`)

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

      socket.on('JOIN_GAME', async (data: { gameId: string; playerId: string }) => {
        try {
          const { gameId, playerId } = data

          // Désamorcer le timeout de déconnexion si le joueur revient via JOIN_GAME (ex: F5)
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
      }) => {
        const startActionTime = Date.now()
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

          const minRaise = 'getMinRaise' in game && typeof game.getMinRaise === 'function' ? game.getMinRaise() : (game instanceof CashGameController ? 2 : 20)
          if (action === 'RAISE' && (!amount || amount < minRaise)) {
            logSuspiciousAction('INVALID_RAISE', {
              userId: socket.userId,
              socketId: socket.id,
              gameId,
              action,
              details: { amount }
            })

            socket.emit('ERROR', {
              code: 'INVALID_RAISE',
              message: `La relance minimum est de ${minRaise}`
            })
            return
          }

          game.handlePlayerAction(playerId, action, amount)

          this.resetTimer(gameId)
          const socketsInRoom = await this.io.in(gameId).fetchSockets()
          for (const s of socketsInRoom) {
            const uid = (s as unknown as AuthenticatedSocket).userId
            const isSpectator = !game.getPlayerState(uid ?? '')
            s.emit('GAME_UPDATE', game.getSanitizedState(isSpectator ? undefined : uid))
          }

          if (game.state.phase === 'SHOWDOWN') {
            const innerGame = game instanceof CashGameController ? game.getGameTable() : game
            if (innerGame && game.state.showdownWinnerId) {
              this.recordMultiPlayerStats(innerGame as GameTable).catch((err) =>
                console.error('[Stats] Erreur enregistrement stats multi:', err)
              )
            }
            if (game instanceof CashGameController) {
              const cashGame = game as CashGameController
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
                s.emit('GAME_UPDATE', game.getSanitizedState(uid))
              }
            }
            // Pas de startTurnTimer en SHOWDOWN (partie terminée pour one-shot, ou countdown pour cash game)
          } else {
            this.startTurnTimer(gameId)
          }
          
          const duration = Date.now() - startActionTime
          console.log(`[Réseau] ⚡ Action ${action} traitée et diffusée en ${duration}ms pour ${playerId}`)
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
            s.emit('GAME_UPDATE', game.getSanitizedState(uid))
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
          const result = game.leave(socket.userId)
          if (!result.ok) {
            socket.emit('ERROR', { code: 'CASH_LEAVE_FAILED', message: result.error })
            return
          }
          const socketsInRoom = await this.io.in(gameId).fetchSockets()
          for (const s of socketsInRoom) {
            const uid = (s as unknown as AuthenticatedSocket).userId
            s.emit('GAME_UPDATE', game.getSanitizedState(uid))
          }
          // Si plus aucun joueur : supprimer la partie et remettre la salle en WAITING
          if (game.getOccupiedCount() === 0) {
            await activeGames.delete(gameId)
            await prisma.waitingRoom.update({
              where: { id: game.roomId },
              data: { status: 'WAITING', gameId: null }
            })
            this.io.to(gameId).emit('GAME_ENDED', { gameId, reason: 'all_players_left' })
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
          const result = game.rebuy(socket.userId, amount ?? 100)
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
        console.log(`[Monitoring Réseau] 🔌 Déconnexion socket: ${socket.id}, Raison: ${reason}. Total: ${currentCount}`)

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

        if (socket.gameId && userId) {
          const gameId = socket.gameId
          console.log(`[Réseau] Joueur ${userId} déconnecté. Lancement du délai de 10s...`)

          const timeout = setTimeout(async () => {
            console.log(`[Réseau] Timeout expiré pour ${userId}. Le joueur est officiellement hors ligne.`)
            const game = await activeGames.get(gameId)
            if (game) {
              const player = game.getPlayerState(userId)
              if (player) {
                player.isConnected = false
                // Ne pas set isActive ici quand c'est son tour: handlePlayerAction('FOLD') le fera

                if (game.state.currentTurn === userId) {
                  try {
                    console.log(`[Réseau] Auto-FOLD pour le joueur déconnecté ${userId}`)
                    game.handlePlayerAction(userId, 'FOLD') // gère avancement turn + award si 1 seul reste
                    const socketsInRoom = await this.io.in(gameId).fetchSockets()
                    for (const s of socketsInRoom) {
                      const uid = (s as unknown as AuthenticatedSocket).userId
                      s.emit('GAME_UPDATE', game.getSanitizedState(uid))
                    }
                    this.startTurnTimer(gameId)
                  } catch (error) {
                    console.error('[Réseau] Erreur auto-fold timeout:', error)
                  }
                } else {
                  // Pas son tour : fold manuel (handlePlayerAction exigerait que ce soit son tour)
                  player.isActive = false
                  game.forceFoldForDisconnect(userId)
                  const socketsInRoom = await this.io.in(gameId).fetchSockets()
                  for (const s of socketsInRoom) {
                    const uid = (s as unknown as AuthenticatedSocket).userId
                    s.emit('GAME_UPDATE', game.getSanitizedState(uid))
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
                }
              } else if (game instanceof CashGameController) {
                // Entre les mains : retirer le joueur déconnecté du siège
                const removed = game.removeDisconnectedPlayer(userId)
                if (removed) {
                  const socketsInRoom = await this.io.in(gameId).fetchSockets()
                  for (const s of socketsInRoom) {
                    const uid = (s as unknown as AuthenticatedSocket).userId
                    s.emit('GAME_UPDATE', game.getSanitizedState(uid))
                  }
                  if (game.getOccupiedCount() === 0) {
                    await activeGames.delete(gameId)
                    await prisma.waitingRoom.update({
                      where: { id: game.roomId },
                      data: { status: 'WAITING', gameId: null }
                    })
                    this.io.to(gameId).emit('GAME_ENDED', { gameId, reason: 'all_players_left' })
                  }
                }
              }
            }
            this.disconnectionTimeouts.delete(userId)
          }, 10000)
          
          this.disconnectionTimeouts.set(userId, timeout)
        }
      })
    })
  }

  private async recordMultiPlayerStats(game: GameTable): Promise<void> {
    const winnerId = game.state.showdownWinnerId
    const pot = game.state.showdownPot ?? 0
    if (!winnerId) return

    for (const player of game.state.players) {
      const isWinner = player.id === winnerId
      const chipsWon = isWinner ? pot : 0
      const chipsLost = !isWinner ? (player.totalPutInThisHand ?? player.currentBet ?? 0) : 0

      try {
        await prisma.playerStats.upsert({
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
      } catch (err) {
        console.error('[Stats] Erreur upsert pour', player.id, err)
      }
    }
    console.log(`[Stats] Stats multi enregistrées pour la partie ${game.id} (gagnant: ${winnerId})`)
  }

  private startTurnTimer(gameId: string) {
    if (this.timers.has(gameId)) {
      clearTimeout(this.timers.get(gameId)!)
    }

    const TURN_TIMEOUT_MS = 30000

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
            const uid = (s as unknown as AuthenticatedSocket).userId
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
    this.io.to(gameId).emit('TURN_TIMER', { gameId, timeLeft: 30 })
  }

  private resetTimer(gameId: string) {
    if (this.timers.has(gameId)) {
      clearTimeout(this.timers.get(gameId)!)
      this.timers.delete(gameId)
    }
  }
}