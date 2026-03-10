// server/src/sockets/game.gateway.ts
import { GameTable } from '../logic/GameTable';

const rooms = new Map<string, GameTable>();

socket.on('START_GAME', (roomId: string) => {
  const table = new GameTable(roomId, players);
  table.startHand();                    // ✅ Utilise Deck.ts
  rooms.set(roomId, table);
  
  io.to(roomId).emit('GAME_UPDATE', table.getSanitizedState());
});

