import { Request, Response, NextFunction } from 'express'
import redisClient from '../config/redis.config.js'
import { env } from '../config/env.js'
import { rootLogger } from '../observability/logger.js'
import { withRedisFeature } from '../observability/redisInstrumentation.js'

/** Fenêtre de déduplication distribuée (secondes) — rejouer la même clé avant expiration → 409 */
const IDEMPOTENCY_TTL_SEC = Math.max(
  60,
  Number.parseInt(process.env.IDEMPOTENCY_TTL_SEC ?? '3600', 10) || 3600,
)

const memoryCache = new Map<string, number>()

setInterval(() => {
  const now = Date.now()
  for (const [key, expiry] of memoryCache.entries()) {
    if (now > expiry) memoryCache.delete(key)
  }
}, 60000)

const KEY_PREFIX = 'idemp:'

async function tryRedisClaim(key: string): Promise<'ok' | 'duplicate' | 'fallback'> {
  if (env.isJest) return 'fallback'
  try {
    const redisKey = `${KEY_PREFIX}${key}`
    const r = await withRedisFeature('http_idempotency', () =>
      redisClient.set(redisKey, '1', 'EX', IDEMPOTENCY_TTL_SEC, 'NX'),
    )
    if (r === 'OK') return 'ok'
    return 'duplicate'
  } catch (err) {
    rootLogger.warn({
      msg: 'idempotency_redis_fallback',
      detail: err instanceof Error ? err.message : String(err),
    })
    return 'fallback'
  }
}

export const idempotencyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (['GET', 'OPTIONS', 'HEAD'].includes(req.method)) {
    return next()
  }

  const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined
  if (!idempotencyKey) {
    return next()
  }

  void (async () => {
    const outcome = await tryRedisClaim(idempotencyKey)
    if (outcome === 'duplicate') {
      rootLogger.warn({ msg: 'idempotency_duplicate_blocked', keyPrefix: idempotencyKey.slice(0, 8) })
      return res.status(409).json({
        error: 'Cette action est déjà en cours de traitement.',
        code: 'DUPLICATE_REQUEST',
      })
    }

    if (outcome === 'fallback') {
      const now = Date.now()
      if (memoryCache.has(idempotencyKey) && now < memoryCache.get(idempotencyKey)!) {
        return res.status(409).json({
          error: 'Cette action est déjà en cours de traitement.',
          code: 'DUPLICATE_REQUEST',
        })
      }
      memoryCache.set(idempotencyKey, now + 5000)
    }

    next()
  })()
}
