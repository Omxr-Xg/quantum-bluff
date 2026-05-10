import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client'

const isJest = Boolean(process.env.JEST_WORKER_ID)

export type HttpObserveArgs = {
  method: string
  routeGroup: string
  status: number
  durationMs: number
}

function statusClass(status: number): string {
  if (status >= 500) return '5xx'
  if (status >= 400) return '4xx'
  if (status >= 300) return '3xx'
  return '2xx'
}

type MetricsApi = {
  observeHttp: (args: HttpObserveArgs) => void
  incPokerAction: (code: string) => void
  incCasinoIdempotency: (reason: string) => void
  incRecoveryEvent: (game: string, phase: string) => void
  setComponentUp: (component: string, up: boolean) => void
  setDegraded: (reason: string, active: boolean) => void
  incRateLimitExceeded: (routeGroup: string) => void
  incSocketEvent: (event: string) => void
  setSocketIoConnectionsActive: (count: number) => void
  setRedisSocketIoAdapterUp: (up: boolean) => void
  setTournamentLeaderActive: (instanceId: string, active: boolean) => void
  setTournamentStalePendingCount: (count: number) => void
  /** Bracket / spectate tournoi (faible cardinalité sur `event`). */
  incTournamentBracket: (event: string) => void
  observeRedisCommandDurationMs: (command: string, durationMs: number) => void
  incDbError: (operation: string) => void
  observePrismaDurationMs: (operation: string, durationMs: number) => void
  getMetricsText: () => Promise<string>
  getMetricsContentType: () => string
}

function createRealMetrics(): MetricsApi {
  const register = new Registry()
  collectDefaultMetrics({ register })

  const httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Nombre de requêtes HTTP',
    labelNames: ['method', 'route_group', 'status_class'],
    registers: [register],
  })

  const httpRequestDurationSeconds = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Durée des requêtes HTTP',
    labelNames: ['method', 'route_group', 'status_class'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register],
  })

  const pokerActionsTotal = new Counter({
    name: 'poker_actions_total',
    help: 'Actions poker (issue dedup / validation)',
    labelNames: ['code'],
    registers: [register],
  })

  const casinoIdempotencyTotal = new Counter({
    name: 'casino_idempotency_outcomes_total',
    help: 'Sorties idempotence casino',
    labelNames: ['reason'],
    registers: [register],
  })

  const recoveryBootEventsTotal = new Counter({
    name: 'recovery_boot_events_total',
    help: 'Événements recovery au boot / cleanup',
    labelNames: ['game', 'phase'],
    registers: [register],
  })

  const appComponentUp = new Gauge({
    name: 'app_component_up',
    help: '1 si le composant est joignable (ex. Redis TCP)',
    labelNames: ['component'],
    registers: [register],
  })

  const appDegraded = new Gauge({
    name: 'app_degraded',
    help: '1 si un mode dégradé actif (faible cardinalité : raison)',
    labelNames: ['reason'],
    registers: [register],
  })

  const rateLimitExceededTotal = new Counter({
    name: 'rate_limit_exceeded_total',
    help: '429 émis par express-rate-limit',
    labelNames: ['route_group'],
    registers: [register],
  })

  const socketIoEventsTotal = new Counter({
    name: 'socket_io_events_total',
    help: 'Événements socket.io (agrégé)',
    labelNames: ['event'],
    registers: [register],
  })

  const dbErrorsTotal = new Counter({
    name: 'db_errors_total',
    help: 'Erreurs base / Prisma (agrégées)',
    labelNames: ['operation'],
    registers: [register],
  })

  const prismaQueryDurationSeconds = new Histogram({
    name: 'prisma_query_duration_seconds',
    help: 'Durée des requêtes Prisma (agrégat)',
    labelNames: ['operation'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [register],
  })

  const socketIoConnectionsActive = new Gauge({
    name: 'socket_io_connections_active',
    help: 'Connexions Socket.IO actives sur cette instance (engine)',
    registers: [register],
  })

  const redisAdapterUp = new Gauge({
    name: 'redis_adapter_up',
    help: '1 si adaptateur Redis Socket.IO actif sur cette instance',
    registers: [register],
  })

  const tournamentLeaderActive = new Gauge({
    name: 'tournament_leader_active',
    help: '1 si cette instance détient le verrou leader cron tournoi',
    labelNames: ['instance_id'],
    registers: [register],
  })

  const tournamentStalePendingCount = new Gauge({
    name: 'tournament_stale_pending_count',
    help:
      'Tournois PENDING dont l’heure de départ est dépassée (>30s) — alerte si Redis/leader bloque le démarrage auto',
    registers: [register],
  })

  const tournamentBracketEventsTotal = new Counter({
    name: 'tournament_bracket_events_total',
    help: 'Événements bracket tournoi (idempotence, Redis, attente)',
    labelNames: ['event'],
    registers: [register],
  })

  const redisCommandDurationSeconds = new Histogram({
    name: 'redis_command_duration_seconds',
    help: 'Durée des commandes Redis instrumentées (échantillon)',
    labelNames: ['command'],
    buckets: [0.0005, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    registers: [register],
  })

  return {
    observeHttp({ method, routeGroup, status, durationMs }) {
      const sc = statusClass(status)
      const labels = {
        method,
        route_group: routeGroup,
        status_class: sc,
      }
      httpRequestsTotal.inc(labels)
      httpRequestDurationSeconds.observe(labels, durationMs / 1000)
    },
    incPokerAction(code: string) {
      pokerActionsTotal.inc({ code })
    },
    incCasinoIdempotency(reason: string) {
      casinoIdempotencyTotal.inc({ reason })
    },
    incRecoveryEvent(game: string, phase: string) {
      recoveryBootEventsTotal.inc({ game, phase })
    },
    setComponentUp(component: string, up: boolean) {
      appComponentUp.set({ component }, up ? 1 : 0)
    },
    setDegraded(reason: string, active: boolean) {
      appDegraded.set({ reason }, active ? 1 : 0)
    },
    incRateLimitExceeded(routeGroup: string) {
      rateLimitExceededTotal.inc({ route_group: routeGroup })
    },
    incSocketEvent(event: string) {
      socketIoEventsTotal.inc({ event })
    },
    setSocketIoConnectionsActive(count: number) {
      socketIoConnectionsActive.set(count)
    },
    setRedisSocketIoAdapterUp(up: boolean) {
      redisAdapterUp.set(up ? 1 : 0)
    },
    setTournamentLeaderActive(instanceId: string, active: boolean) {
      tournamentLeaderActive.set({ instance_id: instanceId }, active ? 1 : 0)
    },
    setTournamentStalePendingCount(count: number) {
      tournamentStalePendingCount.set(count)
    },
    incTournamentBracket(event: string) {
      tournamentBracketEventsTotal.inc({ event })
    },
    observeRedisCommandDurationMs(command: string, durationMs: number) {
      redisCommandDurationSeconds.observe({ command }, durationMs / 1000)
    },
    incDbError(operation: string) {
      dbErrorsTotal.inc({ operation })
    },
    observePrismaDurationMs(operation: string, durationMs: number) {
      prismaQueryDurationSeconds.observe({ operation }, durationMs / 1000)
    },
    async getMetricsText() {
      return register.metrics()
    },
    getMetricsContentType() {
      return register.contentType
    },
  }
}

const noop: MetricsApi = {
  observeHttp: () => {},
  incPokerAction: () => {},
  incCasinoIdempotency: () => {},
  incRecoveryEvent: () => {},
  setComponentUp: () => {},
  setDegraded: () => {},
  incRateLimitExceeded: () => {},
  incSocketEvent: () => {},
  setSocketIoConnectionsActive: () => {},
  setRedisSocketIoAdapterUp: () => {},
  setTournamentLeaderActive: () => {},
  setTournamentStalePendingCount: () => {},
  incTournamentBracket: () => {},
  observeRedisCommandDurationMs: () => {},
  incDbError: () => {},
  observePrismaDurationMs: () => {},
  async getMetricsText() {
    return ''
  },
  getMetricsContentType() {
    return 'text/plain; charset=utf-8'
  },
}

export const metrics: MetricsApi = isJest ? noop : createRealMetrics()
