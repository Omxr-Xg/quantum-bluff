import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import gameRoutes from './routes/game.routes.js';
import { GameGateway } from './sockets/game.gateway.js';

const app = express();
app.use(cors());
app.use(express.json());        // ← NOUVEAU
app.use('/api', gameRoutes);    // ← NOUVEAU

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// Initialiser le gateway socket
new GameGateway(io);

const PORT = 3000;

app.get('/', (req, res) => {
  res.send('🚀 Quantum Bluff API - Le serveur répond !');
});

httpServer.listen(PORT, () => {
  console.log(`[SERVER] Quantum Bluff tourne sur http://localhost:${PORT}`);
});
