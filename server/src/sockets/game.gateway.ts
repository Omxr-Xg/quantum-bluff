import { Server, Socket } from 'socket.io';
import { GameTable } from '../logic/GameTable.js';
import { Player } from '../types/poker.js';
import { activeGames } from '../shared/activeGames.js';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  gameId?: string;
}

export class GameGateway {
  private io: Server;
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private socketToUser: Map<string, string> = new Map(); // socketId -> userId
  private userToSocket: Map<string, string> = new Map(); // userId -> socketId

  constructor(io: Server) {
    this.io = io;
    this.setupMiddleware();
    this.setupHandlers();
  }

  private setupMiddleware() {
    this.io.use((socket: AuthenticatedSocket, next) => {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Token manquant'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'quantum_bluff_secret') as { userId: string };
        socket.userId = decoded.userId;
        next();
      } catch (err) {
        next(new Error('Token invalide'));
      }
    });
  }

  private setupHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log('🎮 Joueur connecté:', socket.id, 'User:', socket.userId);

      // Stocker la correspondance socket <-> user
      if (socket.userId) {
        this.socketToUser.set(socket.id, socket.userId);
        this.userToSocket.set(socket.userId, socket.id);
      }

      // Rejoindre une partie
      socket.on('JOIN_GAME', (data: { gameId: string; playerId: string }) => {
        try {
          const { gameId, playerId } = data;
          
          // Vérifier que le joueur correspond au socket
          if (socket.userId !== playerId) {
            socket.emit('ERROR', { 
              code: 'UNAUTHORIZED',
              message: 'Vous n\'êtes pas autorisé à rejoindre cette partie' 
            });
            return;
          }

          socket.join(gameId);
          socket.gameId = gameId;
          
          const game = activeGames.get(gameId);
          if (game) {
            socket.emit('GAME_UPDATE', game.getSanitizedState(playerId));
            console.log(`✅ Joueur ${playerId} a rejoint la partie ${gameId}`);
          } else {
            socket.emit('ERROR', { 
              code: 'GAME_NOT_FOUND',
              message: 'Partie introuvable' 
            });
          }
        } catch (error) {
          socket.emit('ERROR', { 
            code: 'JOIN_ERROR',
            message: 'Erreur lors de la connexion à la partie' 
          });
        }
      });

      // Action en jeu
      socket.on('PLAYER_ACTION', (data: { 
        gameId: string; 
        playerId: string; 
        action: 'FOLD' | 'CALL' | 'RAISE' | 'CHECK'; 
        amount?: number;
      }) => {
        try {
          const { gameId, playerId, action, amount } = data;
          
          // Vérifier que le joueur correspond au socket
          if (socket.userId !== playerId) {
            socket.emit('ERROR', { 
              code: 'UNAUTHORIZED',
              message: 'Action non autorisée' 
            });
            return;
          }

          const game = activeGames.get(gameId);
          if (!game) {
            socket.emit('ERROR', { 
              code: 'GAME_NOT_FOUND',
              message: 'Partie introuvable' 
            });
            return;
          }

          // Vérifier que c'est bien le tour du joueur
          if (game.state.currentTurn !== playerId) {
            socket.emit('ERROR', { 
              code: 'NOT_YOUR_TURN',
              message: 'Ce n\'est pas votre tour' 
            });
            return;
          }

          // Valider l'action
          if (action === 'RAISE' && (!amount || amount < game['bigBlindAmount'])) {
            socket.emit('ERROR', { 
              code: 'INVALID_RAISE',
              message: `La relance minimum est de ${game['bigBlindAmount']}` 
            });
            return;
          }

          game.handlePlayerAction(playerId, action, amount);
          
          // Réinitialiser le timer
          this.resetTimer(gameId);
          
          // Envoyer la mise à jour à tous les joueurs
          this.io.to(gameId).emit('GAME_UPDATE', game.getSanitizedState());
          
          // Démarrer le timer pour le prochain tour
          this.startTurnTimer(gameId);

        } catch (error) {
          socket.emit('ERROR', { 
            code: 'ACTION_ERROR',
            message: (error as Error).message 
          });
        }
      });

      // Reconnexion à une partie existante
      socket.on('RECONNECT_GAME', (data: { gameId: string }) => {
        try {
          const { gameId } = data;
          
          // Vérifier que le joueur était dans cette partie
          if (socket.gameId && socket.gameId !== gameId) {
            socket.leave(socket.gameId);
          }

          socket.join(gameId);
          socket.gameId = gameId;

          const game = activeGames.get(gameId);
          if (game && socket.userId) {
            // Mettre à jour le statut de connexion du joueur
            const player = game.getPlayerState(socket.userId);
            if (player) {
              player.isConnected = true;
            }
            
            socket.emit('GAME_UPDATE', game.getSanitizedState(socket.userId));
            this.io.to(gameId).emit('PLAYER_RECONNECTED', { 
              playerId: socket.userId,
              gameId 
            });
            
            console.log(`🔄 Joueur ${socket.userId} reconnecté à la partie ${gameId}`);
          } else {
            socket.emit('ERROR', { 
              code: 'RECONNECT_ERROR',
              message: 'Impossible de se reconnecter à la partie' 
            });
          }
        } catch (error) {
          socket.emit('ERROR', { 
            code: 'RECONNECT_ERROR',
            message: 'Erreur lors de la reconnexion' 
          });
        }
      });

      // Déconnexion
      socket.on('disconnect', () => {
        console.log('👋 Joueur déconnecté:', socket.id);
        
        const userId = socket.userId;
        if (userId) {
          this.socketToUser.delete(socket.id);
          this.userToSocket.delete(userId);
        }

        if (socket.gameId) {
          const game = activeGames.get(socket.gameId);
          if (game && userId) {
            const player = game.getPlayerState(userId);
            if (player) {
              player.isConnected = false;
              this.io.to(socket.gameId).emit('PLAYER_DISCONNECTED', { 
                playerId: userId,
                gameId: socket.gameId 
              });
            }
          }
        }
      });
    });
  }

  private startTurnTimer(gameId: string) {
    // Nettoyer l'ancien timer
    if (this.timers.has(gameId)) {
      clearTimeout(this.timers.get(gameId)!);
    }

    // Timer de 30 secondes
    const timer = setTimeout(() => {
      const game = activeGames.get(gameId);
      if (!game) return;

      const currentPlayerId = game.state.currentTurn;
      if (currentPlayerId) {
        try {
          game.handlePlayerAction(currentPlayerId, 'FOLD');
          this.io.to(gameId).emit('GAME_UPDATE', game.getSanitizedState());
          this.startTurnTimer(gameId);
        } catch (error) {
          console.error('Erreur timeout:', error);
        }
      }
    }, 30000);

    this.timers.set(gameId, timer);
    this.io.to(gameId).emit('TURN_TIMER', { gameId, timeLeft: 30 });
  }

  private resetTimer(gameId: string) {
    if (this.timers.has(gameId)) {
      clearTimeout(this.timers.get(gameId)!);
      this.timers.delete(gameId);
    }
  }
}