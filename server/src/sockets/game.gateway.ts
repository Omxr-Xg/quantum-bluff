import { Server, Socket } from 'socket.io';
import { GameTable } from '../logic/GameTable.js';
import { Player } from '../types/poker.js';
import { activeGames } from '../shared/activeGames.js';

export class GameGateway {
  private gameTables: Map<string, GameTable> = new Map();
  private io: Server;
  private timers: Map<string, NodeJS.Timeout> = new Map(); // Pour gérer les timeouts

  constructor(io: Server) {
    this.io = io;
    this.setupHandlers();
  }

  private setupHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log('🎮 Joueur connecté:', socket.id);

      // Rejoindre une partie (salle d'attente ou jeu)
      socket.on('JOIN_GAME', (data: { gameId: string; playerId: string }) => {
        const { gameId, playerId } = data;
        socket.join(gameId);
        console.log(`✅ Joueur ${playerId} a rejoint la room ${gameId}`);
        
        // Si c'est une partie en cours, envoyer l'état
        const game = activeGames.get(gameId);
        if (game) {
          socket.emit('GAME_UPDATE', game.getSanitizedState(playerId));
        }
      });

      // Action en jeu
      socket.on('PLAYER_ACTION', (data: { 
        gameId: string; 
        playerId: string; 
        action: 'FOLD' | 'CALL' | 'RAISE' | 'CHECK'; 
        amount?: number;
      }) => {
        const { gameId, playerId, action, amount } = data;
        const game = activeGames.get(gameId);

        if (!game) {
          socket.emit('ERROR', { message: 'Partie introuvable' });
          return;
        }

        try {
          game.handlePlayerAction(playerId, action, amount);
          
          // Réinitialiser le timer après une action
          this.resetTimer(gameId);
          
          // Envoyer la mise à jour à TOUS les joueurs de la room
          this.io.to(gameId).emit('GAME_UPDATE', game.getSanitizedState());
          
          // Vérifier si le tour a changé pour démarrer le timer
          this.startTurnTimer(gameId);

        } catch (error) {
          socket.emit('ERROR', { message: (error as Error).message });
        }
      });

      // Démarrage d'une partie
      socket.on('GAME_STARTED', (gameId: string) => {
        const game = activeGames.get(gameId);
        if (game) {
          this.io.to(gameId).emit('GAME_STARTED', { gameId });
          this.startTurnTimer(gameId);
        }
      });

      // Déconnexion
      socket.on('disconnect', () => {
        console.log('👋 Joueur déconnecté:', socket.id);
        this.handleDisconnect(socket);
      });
    });
  }

  private startTurnTimer(gameId: string) {
    // Nettoyer l'ancien timer s'il existe
    if (this.timers.has(gameId)) {
      clearTimeout(this.timers.get(gameId)!);
    }

    // Timer de 30 secondes pour le tour
    const timer = setTimeout(() => {
      const game = activeGames.get(gameId);
      if (!game) return;

      // Timeout : le joueur actif est considéré comme FOLD
      const currentPlayerId = game.state.currentTurn;
      if (currentPlayerId) {
        try {
          game.handlePlayerAction(currentPlayerId, 'FOLD');
          this.io.to(gameId).emit('GAME_UPDATE', game.getSanitizedState());
          this.startTurnTimer(gameId); // Redémarrer le timer pour le nouveau tour
        } catch (error) {
          console.error('Erreur timeout:', error);
        }
      }
    }, 30000); // 30 secondes

    this.timers.set(gameId, timer);
    
    // Informer les joueurs du temps restant (optionnel)
    this.io.to(gameId).emit('TURN_TIMER', { gameId, timeLeft: 30 });
  }

  private resetTimer(gameId: string) {
    if (this.timers.has(gameId)) {
      clearTimeout(this.timers.get(gameId)!);
      this.timers.delete(gameId);
    }
  }

  private handleDisconnect(socket: Socket) {
    // Chercher si le joueur était dans une partie
    // et le marquer comme déconnecté
    const rooms = Array.from(socket.rooms);
    rooms.forEach(roomId => {
      if (roomId !== socket.id) { // Ignorer la room par défaut
        const game = activeGames.get(roomId);
        if (game) {
          // Marquer le joueur comme déconnecté
          // (à implémenter selon besoin)
          this.io.to(roomId).emit('PLAYER_DISCONNECTED', { 
            playerId: 'à trouver', // Il faudrait stocker la correspondance socketId ↔ playerId
            gameId: roomId 
          });
        }
      }
    });
  }
}