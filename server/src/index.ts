import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import gameRoutes from './routes/game.routes.js'
import authRoutes from './routes/auth.routes.js'
import friendsRoutes from './routes/friends.routes.js'

import { GameGateway } from './sockets/game.gateway.js'
import { socketAuth } from './middleware/socketAuth.middleware.js'

const app = express()

// sécurité HTTP
app.use(helmet())

// limiter les requêtes (anti spam / brute force)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
})

app.use(limiter)

app.use(cors())
app.use(express.json())

// routes API
app.use('/api', gameRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/friends', friendsRoutes)

app.get('/', (_req, res) => {
  res.send('🚀 Quantum Bluff API - Le serveur répond !')
})

// serveur HTTP
const httpServer = createServer(app)

// serveur websocket
const io = new Server(httpServer, {
  cors: { origin: '*' }
})

// sécurité websocket (JWT)
io.use(socketAuth)

// gateway poker
new GameGateway(io)

const PORT = 3000

httpServer.listen(PORT, () => {
  console.log(`[SERVER] Quantum Bluff tourne sur http://localhost:${PORT}`)
})