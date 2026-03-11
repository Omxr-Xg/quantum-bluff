// server/src/sockets/game.gateway.ts
import { Server, Socket } from 'socket.io';
import { GameTable } from '../logic/GameTable.js';
import { Player } from '../types/poker.js';

export class GameGateway {
  private gameTables: Map<string, GameTable> = new Map();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.setupHandlers();
  }

  private setupHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log('🎮 Joueur connecté:', socket.id);

      // Rejoindre une partie
      socket.on('JOIN_GAME', (data: { gameId: string; player: Player }) => {
        const { gameId, player } = data;
        
        let gameTable = this.gameTables.get(gameId);
        if (!gameTable) {
          // Créer une nouvelle table avec le joueur
          gameTable = new GameTable(gameId, [player]);
          this.gameTables.set(gameId, gameTable);
        } else {
          // Ajouter le joueur à la table existante
          gameTable.addPlayer(player);
        }

        socket.join(gameId);
        socket.emit('GAME_JOINED', { gameId, playerId: player.id });
        
        // Envoyer l'état actuel à tous les joueurs de la room
        this.io.to(gameId).emit('GAME_UPDATE', gameTable.getSanitizedState());
      });

      // Démarrer une partie
      socket.on('START_GAME', (gameId: string) => {
        const gameTable = this.gameTables.get(gameId);
        if (!gameTable) {
          socket.emit('ERROR', { message: 'Partie introuvable' });
          return;
        }

        gameTable.startHand();
        this.io.to(gameId).emit('GAME_UPDATE', gameTable.getSanitizedState());
        this.io.to(gameId).emit('GAME_STARTED');
      });

      // Action d'un joueur
      socket.on('PLAYER_ACTION', (data: { 
        gameId: string; 
        playerId: string; 
        action: 'FOLD' | 'CALL' | 'RAISE' | 'CHECK'; 
        amount?: number;
      }) => {
        const { gameId, playerId, action, amount } = data;
        const gameTable = this.gameTables.get(gameId);

        if (!gameTable) {
          socket.emit('ERROR', { message: 'Partie introuvable' });
          return;
        }

        try {
          gameTable.handlePlayerAction(playerId, action, amount);
          
          // Vérifier si la phase doit avancer
          // (logique simplifiée - à améliorer selon vos règles)
          this.io.to(gameId).emit('GAME_UPDATE', gameTable.getSanitizedState(playerId));
        } catch (error) {
          socket.emit('ERROR', { message: (error as Error).message });
        }
      });

      // Avancer à la phase suivante (pour le dealer/automatique)
      socket.on('ADVANCE_PHASE', (gameId: string) => {
        const gameTable = this.gameTables.get(gameId);
        if (!gameTable) {
          socket.emit('ERROR', { message: 'Partie introuvable' });
          return;
        }

        gameTable.advancePhase();
        this.io.to(gameId).emit('GAME_UPDATE', gameTable.getSanitizedState());
      });

      // Déconnexion
      socket.on('disconnect', () => {
        console.log('👋 Joueur déconnecté:', socket.id);
        // Gérer la déconnexion (retirer le joueur des parties, etc.)
      });
    });
  }

  // Obtenir une table par son ID
  getTable(gameId: string): GameTable | undefined {
    return this.gameTables.get(gameId);
  }

  // Supprimer une table
  removeTable(gameId: string): void {
    this.gameTables.delete(gameId);
  }
}