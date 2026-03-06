import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" } // On autorise tout pour le moment
});

io.on('connection', (socket) => {
  console.log('Un joueur est connecté:', socket.id);
});

const PORT = 3000;
// Route de test pour vérifier que le serveur répond au navigateur
app.get('/', (req, res) => {
  res.send('🚀 Le serveur Quantum Bluff répond bien !');
});
httpServer.listen(PORT, () => {
  console.log(`[SERVER] Le moteur de Quantum Bluff tourne sur http://localhost:${PORT}`);
});