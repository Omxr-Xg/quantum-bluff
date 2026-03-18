import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from './config/swagger.config.js'
import { initCleanupJobs } from './utils/cleanup.job.js';

import gameRoutes from './routes/game.routes.js'
import authRoutes from './routes/auth.routes.js'
import twofaRoutes from './routes/twofa.routes.js'
import friendsRoutes from './routes/friends.routes.js'
import waitingRoomRoutes from './routes/waitingRoom.routes.js'
import gameApiRoutes from './routes/game.api.routes.js'
import botRoutes from './routes/bot.routes.js'
import invitationRoutes from './routes/invitation.routes.js'
import updatesRouter from './routes/updates.routes.js'

import { GameGateway } from './sockets/game.gateway.js'
import { socketAuth } from './middleware/socketAuth.middleware.js'
import { connectDB } from './config/database.js'

const app = express()

const FRONTEND_ORIGINS: string[] = process.env.CORS_ORIGIN
  ? JSON.parse(process.env.CORS_ORIGIN)
  : [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    'https://mai-projet-integrateur.u-strasbg.fr',
    'capacitor://localhost',
    'http://localhost',
    'http://185.155.93.105',
    'http://185.155.93.105:5173',
    'http://185.155.93.105:3000',
  ]

// sécurité HTTP (CSP adapté pour API + Swagger UI)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // Swagger UI inline scripts
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'self'"],
    },
  },
}))

// CORS
app.use(cors({
  origin: FRONTEND_ORIGINS,
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  optionsSuccessStatus: 200
}))

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Trop de requêtes, réessaie plus tard' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
})

app.use(limiter)

app.use(express.json({ limit: '10kb' }))

app.use((req, _res, next) => {
  console.log(`📡 ${req.method} ${req.url}`)
  next()
})

// routes API
app.use('/api', gameRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/auth/2fa', twofaRoutes)
app.use('/api/friends', friendsRoutes)
app.use('/api/waiting-room', waitingRoomRoutes)
app.use('/api/game', gameApiRoutes)
app.use('/api/bot', botRoutes)
app.use('/api/invitations', invitationRoutes)

// Serveur de mises à jour client
app.use('/', updatesRouter)

app.get('/', (_req, res) => {
  res.send('🚀 Quantum Bluff API - Le serveur répond !')
})

// Swagger / OpenAPI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customCss: '.swagger-ui .topbar { display: none }' }))

// Middleware de gestion des erreurs non capturées (pour déboguer les 500)
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const msg = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined
  console.error('❌ Erreur non capturée:', msg, stack)
  res.status(500).json({
    error: 'Erreur serveur',
    ...(process.env.NODE_ENV === 'development' && { details: msg, stack })
  })
})

// serveur HTTP
const httpServer = createServer(app)

// websocket
const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_ORIGINS,
    credentials: true
  }
})

// sécurité websocket (JWT)
io.use(socketAuth)
app.set('io', io)

initCleanupJobs();
// gateway poker
new GameGateway(io)

const PORT = parseInt(process.env.PORT || '3000', 10)

;(async () => {
  await connectDB()
  httpServer.listen(PORT, () => {
    console.log(`[SERVER] Quantum Bluff tourne sur http://localhost:${PORT}`)
  })
})()