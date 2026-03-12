import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import gameRoutes from './routes/game.routes.js'
import { GameGateway } from './sockets/game.gateway.js'
import authRoutes from './routes/auth.routes.js';

const app = express()

app.use(cors())
app.use(express.json())
app.use('/api', gameRoutes)
app.use('/api/auth', authRoutes);

app.get('/', (_req, res) => {
  res.send('🚀 Quantum Bluff API - Le serveur répond !')
})

const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: { origin: '*' }
})

new GameGateway(io)

const PORT = 3000

httpServer.listen(PORT, () => {
  console.log(`[SERVER] Quantum Bluff tourne sur http://localhost:${PORT}`)
})