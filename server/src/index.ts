import './observability/otelEarly.js'

import express, { type Request } from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import cors, { type CorsOptions } from 'cors'
import helmet from 'helmet'
import swaggerUi from 'swagger-ui-express'
import { env } from './config/env.js'
import { swaggerSpec } from './config/swagger.config.js'
import { initCleanupJobs } from './utils/cleanup.job.js'
import { pruneInactiveBlackjackWaitingRooms } from './blackjack/recovery/blackjackRecovery.service.js'
import {
  requestIdMiddleware,
  httpAccessLogMiddleware,
  rateLimitWithMetrics,
  rootLogger,
  getReadyState,
  logDegradedStateAtBoot,
  metrics,
} from './observability/index.js'
import gameRoutes from './routes/game.routes.js'
import authRoutes from './routes/auth.routes.js'
import twofaRoutes from './routes/twofa.routes.js'
import friendsRoutes from './routes/friends.routes.js'
import friendLoanRoutes from './routes/friendLoan.routes.js'
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
import dailyChallengesRoutes from './dailyChallenges/dailyChallenge.routes.js'
import dailyLoginRoutes from './dailyLogin/dailyLogin.routes.js'
import freeRechargeRoutes from './freeRecharge/freeRecharge.routes.js'
import giftCodesRoutes from './giftCodes/giftCodes.routes.js'
import walletRoutes from './wallet/wallet.routes.js'
import hiddenBetsRoutes from './routes/hiddenBets.routes.js'
import feedbackRoutes from './routes/feedback.routes.js'
import playerReportRoutes from './routes/playerReport.routes.js'
import adminConsoleRoutes from './routes/adminConsole.routes.js'
import { antiCheatMiddleware } from './middleware/antiCheat.middleware.js'
import adminRoutes from './routes/admin.routes.js'
import { GameGateway } from './sockets/game.gateway.js'
import { setGameIo } from './sockets/gameIo.registry.js'
import { socketAuth } from './middleware/socketAuth.middleware.js'
import { connectDB } from './config/database.js'
import { createSocketIoRedisClients, disconnectSocketIoRedisClients } from './config/socketIoRedis.js'
import { shutdownOtel } from './observability/otel.js'
import { setDraining } from './observability/readinessDrain.js'
import { recoverBlackjackRuntimeAtBoot } from './blackjack/recovery/blackjackRecovery.service.js'
import adminPokerRuntimeRoutes from './routes/admin.poker.runtime.routes.js'
import tournamentRoutes from './routes/tournament.routes.js'
import tournamentWinnerBetsRoutes from './routes/tournamentWinnerBets.routes.js'
import { initTournamentScheduler } from './tournament/tournament.scheduler.js'
import { recoverTournamentsAtBoot } from './tournament/tournament.recovery.service.js'
import adminRouletteOverrideRoutes from './routes/admin.roulette.override.routes.js'
import { timeoutMiddleware } from './middleware/timeout.middleware.js';
import { idempotencyMiddleware } from './middleware/idempotency.middleware.js';

function logUnknownReason(reason: unknown): string {
  if (reason instanceof Error) return reason.stack ?? reason.message
  try {
    return JSON.stringify(reason)
  } catch {
    return String(reason)
  }
}

/** Aide au diagnostic des 502 : nginx sans upstream = souvent process Node arrêté (crash hors route). */
process.on('unhandledRejection', (reason, promise) => {
  rootLogger.error({
    msg: 'unhandled_rejection',
    detail: logUnknownReason(reason),
    promise: String(promise),
  })
})
process.on('uncaughtException', (err) => {
  rootLogger.fatal({
    msg: 'uncaught_exception',
    detail: err.stack ?? err.message,
  })
  process.exit(1)
})

const app = express()

app.disable('x-powered-by')
app.set('trust proxy', env.trustProxy)

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || env.corsOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    rootLogger.warn({
      msg: 'cors_origin_rejected',
      origin,
    })

    callback(new Error('Origin not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-idempotency-key'],
  optionsSuccessStatus: 200,
}

app.use(
  helmet({
    // Par défaut Helmet met CORP « same-origin » : le front Vite (:5175) ne peut pas
    // afficher des images servies par l’API (:3000). cross-origin est adapté à une API publique.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
  })
)

app.use(cors(corsOptions))
app.use(requestIdMiddleware)
app.use(httpAccessLogMiddleware)

const limiter = rateLimitWithMetrics({
  windowMs: 15 * 60 * 1000,
  /**
   * Comptage surtout des réponses non-2xx (skipSuccessfulRequests) ; marge pour clients qui retry après erreurs.
   * Les lectures de solde sont exclues : avec skipSuccessfulRequests, les rafales concurrentes peuvent quand même
   * dépasser le plafond avant les décrémentations « finish » — le client poll /balance pendant une partie cash.
   */
  limit: env.isProduction ? 400 : 1000,
  message: { error: 'Trop de requêtes, réessaie plus tard' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: (req: Request) => {
    const p = req.path
    if (req.method === 'GET' && (p === '/api/auth/balance' || p === '/api/auth/balance-history')) {
      return true
    }
    /** Console / outils admin : beaucoup de GET successifs ; le JWT admin est vérifié sur chaque route. */
    if (p.startsWith('/api/admin')) {
      return true
    }
    return false
  },
})

app.use(limiter)

const botApiLimiter = rateLimitWithMetrics({
  windowMs: 60 * 1000,
  limit: env.isProduction ? 240 : 2000,
  message: { error: 'Trop de requêtes vers l’API bot, réessaie dans une minute' },
  standardHeaders: true,
  legacyHeaders: false,
})

const slotApiLimiter = rateLimitWithMetrics({
  windowMs: 60 * 1000,
  limit: env.isProduction ? 120 : 2000,
  message: { error: 'Trop de requêtes slot, réessaie dans une minute' },
  standardHeaders: true,
  legacyHeaders: false,
})

const rouletteApiLimiter = rateLimitWithMetrics({
  windowMs: 60 * 1000,
  limit: env.isProduction ? 90 : 2000,
  message: { error: 'Trop de requêtes roulette, réessaie dans une minute' },
  standardHeaders: true,
  legacyHeaders: false,
})

const blackjackApiLimiter = rateLimitWithMetrics({
  windowMs: 60 * 1000,
  limit: env.isProduction ? 120 : 2000,
  message: { error: 'Trop de requêtes blackjack, réessaie dans une minute' },
  standardHeaders: true,
  legacyHeaders: false,
})

const blackjackMultiApiLimiter = rateLimitWithMetrics({
  windowMs: 60 * 1000,
  limit: env.isProduction ? 180 : 3000,
  message: { error: 'Trop de requêtes tables blackjack, réessaie dans une minute' },
  standardHeaders: true,
  legacyHeaders: false,
})

const hiddenBetsApiLimiter = rateLimitWithMetrics({
  windowMs: 60 * 1000,
  limit: env.isProduction ? 180 : 3000,
  message: { error: 'Trop de requêtes hidden-bets, réessaie dans une minute' },
  standardHeaders: true,
  legacyHeaders: false,
})

/** 2.5mb : avatars profil en data URL (JPEG compressé) + marge ; le reste des routes reste léger. */
app.use(express.json({ limit: '2.5mb' }))
app.use(antiCheatMiddleware)

app.use(timeoutMiddleware)

app.use(idempotencyMiddleware)

app.use('/api', gameRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/auth/2fa', twofaRoutes)
app.use('/api/friends', friendsRoutes)
app.use('/api/friends', friendLoanRoutes)
app.use('/api/friends', invitationRoutes)
app.use('/api/waiting-room', waitingRoomRoutes)
app.use('/api/tournaments', tournamentRoutes)
app.use('/api/tournaments', tournamentWinnerBetsRoutes)
app.use('/api/game', gameApiRoutes)
app.use('/api/bot', botApiLimiter, botRoutes)
app.use('/api/slot', slotApiLimiter, slotRoutes)
app.use('/api/roulette', rouletteApiLimiter, rouletteRoutes)
app.use('/api/blackjack', blackjackApiLimiter, blackjackRoutes)
app.use('/api/hidden-bets', hiddenBetsApiLimiter, hiddenBetsRoutes)
app.use('/api/feedback', feedbackRoutes)
app.use('/api/reports', playerReportRoutes)
/** Console admin web (JWT role admin, identifiants ADMIN_CONSOLE_*). */
app.use('/api/admin/console', adminConsoleRoutes)
app.use('/api/blackjack-tables', blackjackMultiApiLimiter, blackjackMultiRoutes)
app.use('/api/leaderboard', leaderboardRoutes)
app.use('/api/invitations', invitationRoutes)
app.use('/api/daily-challenges', dailyChallengesRoutes)
app.use('/api/daily-login', dailyLoginRoutes)
app.use('/api/free-recharge', freeRechargeRoutes)
app.use('/api/gift-codes', giftCodesRoutes)
app.use('/api/wallet', walletRoutes)
// PROD HARDENING : On ne charge les routes sensibles qu'en mode développement
if (!env.isProduction) {
  app.use('/api/admin/blackjack/runtime', adminBlackjackRuntimeRoutes)
  app.use('/api/admin/poker/runtime', adminPokerRuntimeRoutes)
  app.use('/api/admin/roulette/override', adminRouletteOverrideRoutes)
  app.use('/api/admin', adminRoutes)
  console.log(' [DEV] Routes Admin et Overrides ACTIVÉES');
} else {
  console.log(' [PROD] Routes Admin désactivées pour la sécurité.');
}

app.use('/', updatesRouter)

app.get('/', (_req, res) => {
  res.send(' Quantum Bluff API - Le serveur répond !')
})

app.get('/api/health/live', (_req, res) => {
  res.status(200).json({ live: true })
})

app.get('/api/health/ready', async (_req, res) => {
  try {
    const state = await getReadyState()
    res.status(state.ready ? 200 : 503).json(state)
  } catch {
    res.status(503).json({
      ready: false,
      degraded: false,
      components: { database: 'down', redis: 'fallback_memory' },
    })
  }
})

app.get('/api/health', async (_req, res) => {
  try {
    const state = await getReadyState()
    const text =
      state.ready && !state.degraded
        ? 'OK'
        : state.ready && state.degraded
          ? 'OK (degraded)'
          : 'NOT_READY'

    res.status(state.ready ? 200 : 503).type('text/plain').send(text)
  } catch {
    res.status(503).type('text/plain').send('NOT_READY')
  }
})

app.get('/metrics', async (req, res) => {
  if (env.metricsBearerToken) {
    const auth = req.headers.authorization
    if (auth !== `Bearer ${env.metricsBearerToken}`) {
      res.status(401).end()
      return
    }
  }

  res.setHeader('Content-Type', metrics.getMetricsContentType())
  res.end(await metrics.getMetricsText())
})

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
  })
)

app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const msg = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined

  rootLogger.error({
    msg: 'http_unhandled_error',
    requestId: req.requestId,
    detail: msg,
    stack: env.isDevelopment ? stack : undefined,
  })

  res.status(500).json({
    error: 'Erreur serveur',
    ...(env.isDevelopment ? { details: msg, stack } : {}),
  })
})

const httpServer = createServer(app)

const io = new Server(httpServer, {
  // Le backend écoute strictement sur /socket.io (Nginx se charge de retirer le préfixe VM)
  path: '/socket.io',
  cors: {
    origin: env.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Authorization', 'Content-Type', 'x-request-id', 'x-idempotency-key'],
  },
})

if (!env.isJest) {
  try {
    const { pubClient, subClient } = createSocketIoRedisClients()
    io.adapter(createAdapter(pubClient, subClient))
    metrics.setRedisSocketIoAdapterUp(true)
    const onDown = () => metrics.setRedisSocketIoAdapterUp(false)
    pubClient.on('error', onDown)
    subClient.on('error', onDown)
    pubClient.on('end', onDown)
    subClient.on('end', onDown)
  } catch (err) {
    rootLogger.warn({
      msg: 'socket_io_redis_adapter_failed',
      detail: err instanceof Error ? err.message : String(err),
    })
    metrics.setRedisSocketIoAdapterUp(false)
  }
} else {
  metrics.setRedisSocketIoAdapterUp(false)
}

io.use(socketAuth)
app.set('io', io)

initCleanupJobs()
void pruneInactiveBlackjackWaitingRooms()
  .then((deleted) => {
    if (deleted > 0) {
      rootLogger.info({ msg: 'bj_waiting_prune_at_boot', deleted })
    }
  })
  .catch((err) => {
    rootLogger.warn({
      msg: 'bj_waiting_prune_at_boot_failed',
      detail: err instanceof Error ? err.message : String(err),
    })
  })
new GameGateway(io)
setGameIo(io)
initTournamentScheduler(app)

const PORT = env.port

let shuttingDown = false
function registerGracefulShutdown(): void {
  const drain = async (signal: string) => {
    if (shuttingDown) return
    shuttingDown = true
    rootLogger.info({ msg: 'shutdown_begin', signal, instanceId: env.instanceId })
    setDraining(true)
    const drainMs = Number.parseInt(process.env.SHUTDOWN_DRAIN_MS ?? '30000', 10) || 30000
    await new Promise((r) => setTimeout(r, Math.min(2000, drainMs)))

    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve())
    })

    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, drainMs)
      io.close(() => {
        clearTimeout(t)
        resolve()
      })
    })

    metrics.setRedisSocketIoAdapterUp(false)
    await shutdownOtel()
    await disconnectSocketIoRedisClients()
    rootLogger.info({ msg: 'shutdown_complete', instanceId: env.instanceId })
    process.exit(0)
  }

  process.on('SIGTERM', () => void drain('SIGTERM'))
  process.on('SIGINT', () => void drain('SIGINT'))
}

registerGracefulShutdown()

;(async () => {
  try {
    rootLogger.info({ msg: 'server_boot_step', step: 'connect_db_start' })
    await connectDB()
    rootLogger.info({ msg: 'server_boot_step', step: 'connect_db_done' })
    rootLogger.info({ msg: 'server_boot_step', step: 'readiness_state_start' })
    await logDegradedStateAtBoot()
    rootLogger.info({ msg: 'server_boot_step', step: 'readiness_state_done' })
    rootLogger.info({ msg: 'server_boot_step', step: 'blackjack_recovery_start' })
    await recoverBlackjackRuntimeAtBoot()
    rootLogger.info({ msg: 'server_boot_step', step: 'blackjack_recovery_done' })
    rootLogger.info({ msg: 'server_boot_step', step: 'tournament_recovery_start' })
    await recoverTournamentsAtBoot(io)
    rootLogger.info({ msg: 'server_boot_step', step: 'tournament_recovery_done' })

    httpServer.listen(PORT, () => {
      rootLogger.info({
        msg: 'server_listen',
        port: PORT,
        instanceId: env.instanceId,
        detail: 'Quantum Bluff API démarrée',
      })

    })
  } catch (error) {
    rootLogger.error({
      msg: 'server_boot_failed',
      detail: error instanceof Error ? error.message : String(error),
    })
    process.exit(1)
  }
})()
