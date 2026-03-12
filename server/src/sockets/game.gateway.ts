import { Server, Socket } from 'socket.io'
import { gameService } from '../services/game.service.js'
import type { Player } from '../types/poker.js'

export class GameGateway {
  private io: Server

  constructor(io: Server) {
    this.io = io
    this.setupHandlers()
  }

  private setupHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log('🎮 Joueur connecté:', socket.id)

      socket.on('JOIN_GAME', (data: { gameId: string; playerName?: string; player?: Player }) => {
        const { gameId, playerName, player } = data

        try {
          let joined

          if (playerName) {
            joined = gameService.joinGame(gameId, playerName)
          } else if (player) {
            const game = gameService.getGame(gameId)
            if (!game) {
              socket.emit('ERROR', { message: 'Partie introuvable' })
              return
            }
            game.addPlayer(player)
            joined = {
              gameId,
              playerId: player.id,
              player,
              gameState: game.getSanitizedState(player.id)
            }
          } else {
            socket.emit('ERROR', { message: 'Nom du joueur invalide' })
            return
          }

          socket.join(gameId)
          socket.data.gameId = gameId
          socket.data.playerId = joined.playerId

          socket.emit('GAME_JOINED', {
            gameId: joined.gameId,
            playerId: joined.playerId,
            gameState: joined.gameState
          })

          this.io.to(gameId).emit('GAME_UPDATE', joined.gameState)
        } catch (error) {
          socket.emit('ERROR', { message: (error as Error).message })
        }
      })

      socket.on('CREATE_GAME', (data: { playerName: string }) => {
        try {
          const created = gameService.createGame(data.playerName)

          socket.join(created.gameId)
          socket.data.gameId = created.gameId
          socket.data.playerId = created.playerId

          socket.emit('GAME_CREATED', created)
          this.io.to(created.gameId).emit('GAME_UPDATE', created.gameState)
        } catch (error) {
          socket.emit('ERROR', { message: (error as Error).message })
        }
      })

      socket.on('START_GAME', (gameId: string) => {
        const game = gameService.getGame(gameId)

        if (!game) {
          socket.emit('ERROR', { message: 'Partie introuvable' })
          return
        }

        try {
          game.startHand()
          this.io.to(gameId).emit('GAME_STARTED')
          this.io.to(gameId).emit('GAME_UPDATE', game.getSanitizedState())
        } catch (error) {
          socket.emit('ERROR', { message: (error as Error).message })
        }
      })

      socket.on(
        'PLAYER_ACTION',
        (data: {
          gameId: string
          playerId: string
          action: 'FOLD' | 'CALL' | 'RAISE' | 'CHECK'
          amount?: number
        }) => {
          const { gameId, playerId, action, amount } = data
          const game = gameService.getGame(gameId)

          if (!game) {
            socket.emit('ERROR', { message: 'Partie introuvable' })
            return
          }

          try {
            game.handlePlayerAction(playerId, action, amount)
            this.io.to(gameId).emit('GAME_UPDATE', game.getSanitizedState(playerId))
          } catch (error) {
            socket.emit('ERROR', { message: (error as Error).message })
          }
        }
      )

      socket.on('GET_GAME_STATE', (gameId: string) => {
        const game = gameService.getGame(gameId)

        if (!game) {
          socket.emit('ERROR', { message: 'Partie introuvable' })
          return
        }

        socket.emit('GAME_UPDATE', game.getSanitizedState(socket.data.playerId))
      })

      socket.on('disconnect', () => {
        console.log('👋 Joueur déconnecté:', socket.id)
      })
      // Dans setupHandlers(), après les événements existants

      // Rejoindre une salle d'attente
      socket.on('JOIN_WAITING_ROOM', (roomId: string, userId: string) => {
        socket.join(`waiting:${roomId}`);
        console.log(`👤 Joueur ${userId} a rejoint la salle ${roomId}`);
      });

      // Quitter une salle d'attente
      socket.on('LEAVE_WAITING_ROOM', (roomId: string, userId: string) => {
        socket.leave(`waiting:${roomId}`);
        console.log(`👤 Joueur ${userId} a quitté la salle ${roomId}`);
      });

      // Mise à jour du statut prêt
      socket.on('PLAYER_READY', (data: { roomId: string; userId: string; isReady: boolean }) => {
        this.io.to(`waiting:${data.roomId}`).emit('PLAYER_READY_UPDATE', data);
      });

      // Démarrage de partie
      socket.on('GAME_STARTING', (roomId: string) => {
        this.io.to(`waiting:${roomId}`).emit('GAME_STARTED');
      });
    })
  }
}