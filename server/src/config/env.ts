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

type NodeEnv = 'development' | 'test' | 'production'

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

function parseCorsOrigins(raw?: string): string[] {
  if (!raw?.trim()) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.map((value) => String(value).trim()).filter(Boolean)
    }
  } catch {
    /* JSON invalide : on retombe sur le split par virgules ci-dessous */
  }

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

const nodeEnvRaw = (process.env.NODE_ENV?.trim().toLowerCase() ?? 'development') as NodeEnv

const nodeEnv: NodeEnv =
  nodeEnvRaw === 'production' || nodeEnvRaw === 'test' || nodeEnvRaw === 'development'
    ? nodeEnvRaw
    : 'development'

const isDevelopment = nodeEnv === 'development'
const isProduction = nodeEnv === 'production'
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

export const env = {
  nodeEnv,
  isDevelopment,
  isProduction,
  isTest,
  isCi,
  isJest,
  instanceId,
  port: getPositiveIntegerEnv('PORT', 3000),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  databaseUrl,
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
    if (raw === undefined || raw.trim() === '') return isProduction ? '' : 'QUANTUM'
    return raw.trim().toUpperCase()
  })(),
} as const
