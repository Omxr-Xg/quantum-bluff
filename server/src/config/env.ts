import dotenv from 'dotenv'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Éviter `const __filename = …` : le plugin Babel de test injecte aussi `__filename` (TDZ).
const envModuleFile = fileURLToPath(import.meta.url)
const envModuleDir = path.dirname(envModuleFile)

const serverEnvPath = path.resolve(envModuleDir, '../../.env')
const rootEnvPath = path.resolve(envModuleDir, '../../../.env')

dotenv.config({
  path: [serverEnvPath, rootEnvPath],
  override: process.env.NODE_ENV !== 'production',
})

type NodeEnv = 'development' | 'test' | 'production' | 'staging'

function parseBooleanEnv(name: string, fallback = false): boolean {
  const raw = process.env[name]?.trim().toLowerCase()

  if (!raw) {
    return fallback
  }

  if (raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on') {
    return true
  }

  if (raw === 'false' || raw === '0' || raw === 'no' || raw === 'off') {
    return false
  }

  throw new Error(`${name} must be a boolean`)
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

function getOptionalEnv(name: string, fallback?: string): string | undefined {
  const value = process.env[name]?.trim()
  if (value) {
    return value
  }
  return fallback
}

function getPositiveIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim()
  if (!raw) {
    return fallback
  }

  const value = Number.parseInt(raw, 10)

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }

  return value
}

function getNonNegativeIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim()
  if (!raw) {
    return fallback
  }

  const value = Number.parseInt(raw, 10)

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`)
  }

  return value
}

function parseTrustProxy(value?: string): boolean | number | string {
  const raw = value?.trim()
  if (!raw) {
    return 1
  }

  if (raw === 'true') {
    return true
  }

  if (raw === 'false') {
    return false
  }

  const asNumber = Number.parseInt(raw, 10)
  if (Number.isInteger(asNumber) && asNumber >= 0) {
    return asNumber
  }

  return raw
}

/** Retire guillemets accidentels (ex. Render : `"https://quantum-bluff.com"`). */
function normalizeCorsOrigin(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

function parseCorsOrigins(raw?: string): string[] {
  if (!raw?.trim()) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed
        .map((value) => normalizeCorsOrigin(String(value)))
        .filter(Boolean)
    }
  } catch {
    /* JSON invalide : on retombe sur le split par virgules ci-dessous */
  }

  return raw
    .split(',')
    .map((value) => normalizeCorsOrigin(value))
    .filter(Boolean)
}

const nodeEnvRaw = (process.env.NODE_ENV?.trim().toLowerCase() ?? 'development') as NodeEnv

const nodeEnv: NodeEnv =
  nodeEnvRaw === 'production' ||
  nodeEnvRaw === 'test' ||
  nodeEnvRaw === 'development' ||
  nodeEnvRaw === 'staging'
    ? nodeEnvRaw
    : 'development'

const isDevelopment = nodeEnv === 'development'
const isStaging = nodeEnv === 'staging'
const isProduction = nodeEnv === 'production' || isStaging
const isTest = nodeEnv === 'test'
const isCi = process.env.CI === 'true'
const isJest = Boolean(process.env.JEST_WORKER_ID)

const defaultDevCorsOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
  'http://127.0.0.1:5177',
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
]

/**
 * Schémas fixes des apps natives (Capacitor / Ionic) : l’en-tête Origin n’est jamais l’URL HTTPS du déploiement.
 * Android (WebView récent) peut envoyer https://localhost au lieu de capacitor://localhost.
 * Sans ces entrées, le login depuis iOS/Android échoue en prod si CORS_ORIGIN ne liste que le site web.
 */
const nativeWebViewOrigins = [
  'capacitor://localhost',
  'ionic://localhost',
  'https://localhost',
] as const

function mergeCorsOrigins(list: string[]): string[] {
  return [...new Set([...list, ...nativeWebViewOrigins])]
}

const corsOrigins = (() => {
  const parsed = parseCorsOrigins(process.env.CORS_ORIGIN)
  const extra = parseCorsOrigins(process.env.CORS_EXTRA_ORIGIN)
  const publicApp = process.env.PUBLIC_APP_URL?.trim()
  const merged = [
    ...parsed,
    ...extra,
    ...(publicApp ? [publicApp] : []),
  ]

  if (merged.length > 0) {
    return mergeCorsOrigins(merged)
  }

  if (isProduction) {
    throw new Error('CORS_ORIGIN is required in production')
  }

  return mergeCorsOrigins(defaultDevCorsOrigins)
})()

const jwtSecret = getRequiredEnv('JWT_SECRET')

if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long')
}

const databaseUrl = getRequiredEnv('DATABASE_URL')
/** Limite connexions pg (Supabase pooler : garder bas, ex. 5–8 par instance Render). */
const databasePoolMax = getPositiveIntegerEnv('DATABASE_POOL_MAX', isProduction ? 8 : 10)
const databaseConnectTimeoutMs = getPositiveIntegerEnv('DATABASE_CONNECT_TIMEOUT_MS', 30_000)
const redisUrl = getOptionalEnv('REDIS_URL')
const redisHost = getOptionalEnv('REDIS_HOST', isProduction ? undefined : 'localhost')

if (!redisUrl && !redisHost) {
  throw new Error('REDIS_URL or REDIS_HOST is required')
}

const adminApiToken =
  getOptionalEnv('ADMIN_API_TOKEN') ?? getOptionalEnv('ADMIN_SECRET_TOKEN')

if (adminApiToken && adminApiToken.length < 16) {
  throw new Error('ADMIN_API_TOKEN must be at least 16 characters long')
}

const aiServiceUrl = getOptionalEnv('AI_SERVICE_URL')
const aiServiceEnabled = parseBooleanEnv('AI_SERVICE_ENABLED', Boolean(aiServiceUrl))

/** Console web admin (JWT dédié) : identifiant + hash bcrypt du mot de passe. Les deux ou aucun. */
const adminConsoleUsername = getOptionalEnv('ADMIN_CONSOLE_USERNAME')
const adminConsolePasswordHash = getOptionalEnv('ADMIN_CONSOLE_PASSWORD_HASH')
const adminConsoleJwtUserId =
  getOptionalEnv('ADMIN_CONSOLE_JWT_USER_ID') ?? '00000000-0000-4000-8000-000000000001'

if (
  (adminConsoleUsername && !adminConsolePasswordHash) ||
  (!adminConsoleUsername && adminConsolePasswordHash)
) {
  throw new Error(
    'ADMIN_CONSOLE_USERNAME and ADMIN_CONSOLE_PASSWORD_HASH must both be set, or both omitted (admin web console disabled).'
  )
}

if (adminConsolePasswordHash && adminConsolePasswordHash.length < 20) {
  throw new Error('ADMIN_CONSOLE_PASSWORD_HASH is too short or invalid')
}

/** Identifiant d’instance pour logs / locks (horizontal scaling). */
const instanceId =
  getOptionalEnv('INSTANCE_ID')?.trim() ||
  (typeof os.hostname === 'function' ? os.hostname() : 'unknown') ||
  'unknown'

/**
 * Nombre d’instances backend déployées (Render : vérifier Dashboard → Service → Scaling).
 * Utilisé pour activer l’adaptateur Redis Socket.IO uniquement si > 1.
 */
const instanceCount = getPositiveIntegerEnv('INSTANCE_COUNT', 1)

/** Adaptateur @socket.io/redis-adapter — désactivé par défaut sur mono-instance (gros gain Upstash). */
const socketIoRedisAdapter = (() => {
  const raw = process.env.SOCKET_IO_REDIS_ADAPTER?.trim()
  if (raw !== undefined && raw !== '') {
    return parseBooleanEnv('SOCKET_IO_REDIS_ADAPTER', false)
  }
  return instanceCount > 1
})()

/** Locks distribués, rate-limit Redis, pub/sub poker : utiles seulement si plusieurs instances. */
const distributedRedis = instanceCount > 1

function parseSampleRate(name: string, fallback: number): number {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback
  const n = Number.parseFloat(raw)
  if (!Number.isFinite(n) || n < 0 || n > 1) {
    throw new Error(`${name} must be a number between 0 and 1`)
  }
  return n
}

export const env = {
  nodeEnv,
  isDevelopment,
  isStaging,
  isProduction,
  isTest,
  isCi,
  isJest,
  instanceId,
  instanceCount,
  socketIoRedisAdapter,
  distributedRedis,
  /** Legacy `game:*` — désactivé par défaut (poker:runtime:* suffit). */
  persistLegacyGameKeys: parseBooleanEnv('PERSIST_LEGACY_GAME_KEYS', false),
  pokerStateWriteDebounceMs: getNonNegativeIntegerEnv('POKER_STATE_REDIS_DEBOUNCE_MS', 800),
  voiceSocialCacheTtlMs: getNonNegativeIntegerEnv('VOICE_SOCIAL_CACHE_TTL_MS', 5 * 60 * 1000),
  jwtBlacklistMissCacheSec: getNonNegativeIntegerEnv('JWT_BLACKLIST_MISS_CACHE_SEC', 60),
  userProfileCacheTtlMs: getNonNegativeIntegerEnv('USER_PROFILE_CACHE_TTL_MS', 5 * 60 * 1000),
  port: getPositiveIntegerEnv('PORT', 3000),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  databaseUrl,
  databasePoolMax,
  databaseConnectTimeoutMs,
  redisUrl,
  redisHost: redisHost ?? 'localhost',
  redisPort: getPositiveIntegerEnv('REDIS_PORT', 6379),
  redisUsername: getOptionalEnv('REDIS_USERNAME'),
  redisPassword: getOptionalEnv('REDIS_PASSWORD'),
  jwtSecret,
  jwtExpiresIn: getOptionalEnv('JWT_EXPIRES_IN', '7d') ?? '7d',
  jwtIssuer: getOptionalEnv('JWT_ISSUER', 'quantum-bluff-api') ?? 'quantum-bluff-api',
  jwtAudience: getOptionalEnv('JWT_AUDIENCE', 'quantum-bluff-client') ?? 'quantum-bluff-client',
  corsOrigins,
  metricsBearerToken: getOptionalEnv('METRICS_BEARER_TOKEN'),
  adminApiToken,
  aiServiceUrl,
  aiServiceTimeoutMs: getNonNegativeIntegerEnv('AI_SERVICE_TIMEOUT_MS', 450),
  aiServiceEnabled,
  rateLimitGlobalMax: getNonNegativeIntegerEnv('RATE_LIMIT_GLOBAL_MAX', 1200),
  adminConsoleUsername,
  adminConsolePasswordHash,
  adminConsoleJwtUserId,
  enableAdminRouletteOverride: parseBooleanEnv('ENABLE_ADMIN_ROULETTE_OVERRIDE', false),
  /**
   * Code promo secret (faux checkout) : montant à payer simulé = 0 €, les jetons achetés sont crédités.
   * Variable d’env : `BALANCE_RESET_PROMO_CODE` (nom historique) ou `FREE_TOPUP_PROMO_CODE`.
   */
  freeTopupPromoCode: (() => {
    const raw =
      process.env.FREE_TOPUP_PROMO_CODE ?? process.env.BALANCE_RESET_PROMO_CODE
    if (raw === undefined || raw.trim() === '') return 'QUANTUM'
    return raw.trim().toUpperCase()
  })(),
  googleClientId: getOptionalEnv('GOOGLE_CLIENT_ID'),
  googleClientSecret: getOptionalEnv('GOOGLE_CLIENT_SECRET'),
  googleCallbackUrl: (() => {
    const explicit = getOptionalEnv('GOOGLE_CALLBACK_URL')
    if (explicit) return explicit.replace(/\/$/, '')
    const port = getPositiveIntegerEnv('PORT', 3000)
    return isProduction
      ? 'https://api.quantum-bluff.com/auth/google/callback'
      : `http://localhost:${port}/auth/google/callback`
  })(),
  clientUrl: (() => {
    const direct = getOptionalEnv('CLIENT_URL') ?? getOptionalEnv('PUBLIC_APP_URL')
    if (direct) return direct.replace(/\/$/, '')
    const webOrigin = corsOrigins.find(
      (o) => o.startsWith('http') && !o.includes('localhost:3000') && !o.startsWith('capacitor'),
    )
    if (webOrigin) return webOrigin.replace(/\/$/, '')
    return isProduction ? 'https://www.quantum-bluff.com' : 'http://localhost:5173'
  })(),
  googleOAuthEnabled: Boolean(
    getOptionalEnv('GOOGLE_CLIENT_ID') && getOptionalEnv('GOOGLE_CLIENT_SECRET'),
  ),
  sentryDsn: getOptionalEnv('SENTRY_DSN'),
  sentryEnvironment: getOptionalEnv('SENTRY_ENVIRONMENT', nodeEnv) ?? nodeEnv,
  sentryRelease:
    getOptionalEnv('SENTRY_RELEASE') ??
    getOptionalEnv('RENDER_GIT_COMMIT') ??
    getOptionalEnv('GIT_COMMIT'),
  sentryTracesSampleRate: parseSampleRate('SENTRY_TRACES_SAMPLE_RATE', isProduction ? 0.1 : 0),
} as const
