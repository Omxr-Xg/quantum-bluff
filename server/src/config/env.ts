import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const serverEnvPath = path.resolve(__dirname, '../../.env')
const rootEnvPath = path.resolve(__dirname, '../../../.env')

dotenv.config({
  path: [serverEnvPath, rootEnvPath],
  override: true,
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
  } catch {}

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
]

const corsOrigins = (() => {
  const parsed = parseCorsOrigins(process.env.CORS_ORIGIN)

  if (parsed.length > 0) {
    return parsed
  }

  if (isProduction) {
    throw new Error('CORS_ORIGIN is required in production')
  }

  return defaultDevCorsOrigins
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

export const env = {
  nodeEnv,
  isDevelopment,
  isProduction,
  isTest,
  isCi,
  isJest,
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
enableAdminRouletteOverride: parseBooleanEnv('ENABLE_ADMIN_ROULETTE_OVERRIDE', false),
} as const