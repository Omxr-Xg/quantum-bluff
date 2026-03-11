import { Server, Socket } from 'socket.io';
import { GameTable } from '../logic/GameTable.js';

export class GameGateway {
  private gameTables: Map<string, GameTable> = new Map();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.setupHandlers();
  }

  private setupHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log('Joueur connecté:', socket.id);
      
      socket.on('joinGame', (gameId: string, playerId: string) => {
        let gameTable = this.gameTables.get(gameId);
        if (!gameTable) {
          gameTable = new GameTable();
          this.gameTables.set(gameId, gameTable);
        }
        socket.join(gameId);
      });

      socket.on('playerAction', (gameId: string, action: string, amount?: number) => {
        const gameTable = this.gameTables.get(gameId);
        if (gameTable) {
          this.io.to(gameId).emit('gameUpdate', gameTable.getState());
        }
      });
    });
  }
}
