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
import slotRoutes from './routes/slot.routes.js'
import rouletteRoutes from './routes/roulette.routes.js'
import blackjackRoutes from './routes/blackjack.routes.js'
import blackjackMultiRoutes from './routes/blackjackMulti.routes.js'
import leaderboardRoutes from './routes/leaderboard.routes.js'
import adminBlackjackRuntimeRoutes from './routes/admin.blackjack.runtime.routes.js'

// ==========================================
// 🛡️ B4 : IMPORTS ANTI-TRICHE & ADMIN
// ==========================================
import { antiCheatMiddleware } from './middleware/antiCheat.middleware.js'
import adminRoutes from './routes/admin.routes.js'

import { GameGateway } from './sockets/game.gateway.js'
import { socketAuth } from './middleware/socketAuth.middleware.js'
import { connectDB } from './config/database.js'
import { recoverBlackjackRuntimeAtBoot } from './blackjack/recovery/blackjackRecovery.service.js'

const app = express()

app.set('trust proxy', 1) 

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
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
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

const botApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 240 : 2000,
  message: { error: 'Trop de requêtes vers l’API bot, réessaie dans une minute' },
  standardHeaders: true,
  legacyHeaders: false,
})

const slotApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 120 : 2000,
  message: { error: 'Trop de requêtes slot, réessaie dans une minute' },
  standardHeaders: true,
  legacyHeaders: false,
})

const rouletteApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 90 : 2000,
  message: { error: 'Trop de requêtes roulette, réessaie dans une minute' },
  standardHeaders: true,
  legacyHeaders: false,
})

const blackjackApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 120 : 2000,
  message: { error: 'Trop de requêtes blackjack, réessaie dans une minute' },
  standardHeaders: true,
  legacyHeaders: false,
})

const blackjackMultiApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 180 : 3000,
  message: { error: 'Trop de requêtes tables blackjack, réessaie dans une minute' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use(express.json({ limit: '10kb' }))

app.use((req, _res, next) => {
  console.log(`📡 ${req.method} ${req.url}`)
  next()
})

// ==========================================
// 🛡️ B4 : ACTIVATION DU BOUCLIER ANTI-TRICHE
// ==========================================
app.use(antiCheatMiddleware)

// routes API
app.use('/api', gameRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/auth/2fa', twofaRoutes)
app.use('/api/friends', friendsRoutes)
app.use('/api/friends', invitationRoutes)
app.use('/api/waiting-room', waitingRoomRoutes)
app.use('/api/game', gameApiRoutes)
app.use('/api/bot', botApiLimiter, botRoutes)
app.use('/api/slot', slotApiLimiter, slotRoutes)
app.use('/api/roulette', rouletteApiLimiter, rouletteRoutes)
app.use('/api/blackjack', blackjackApiLimiter, blackjackRoutes)
app.use(
  '/api/blackjack-tables',
  blackjackMultiApiLimiter,
  blackjackMultiRoutes
)
app.use('/api/leaderboard', leaderboardRoutes)
app.use('/api/invitations', invitationRoutes)
app.use('/api/admin/blackjack/runtime', adminBlackjackRuntimeRoutes)

// ==========================================
// 🛡️ B4 : ROUTE ADMIN POUR VOIR LES TRICHEURS
// ==========================================
app.use('/api/admin', adminRoutes)

// Serveur de mises à jour client
app.use('/', updatesRouter)

app.get('/', (_req, res) => {
  res.send('🚀 Quantum Bluff API - Le serveur répond !')
})

app.get('/api/health', (_req, res) => {
  res.status(200).send('OK')
})

// Swagger / OpenAPI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customCss: '.swagger-ui .topbar { display: none }' }))

// Middleware de gestion des erreurs non capturées
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
  await recoverBlackjackRuntimeAtBoot()
  httpServer.listen(PORT, () => {
    console.log(`[SERVER] Quantum Bluff tourne sur http://localhost:${PORT}`)
  })
})()