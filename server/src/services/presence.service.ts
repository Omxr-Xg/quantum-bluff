import redisClient from '../config/redis.config.js'
import { env } from '../config/env.js'
import { rootLogger } from '../observability/logger.js'
import { withRedisFeature } from '../observability/redisInstrumentation.js'

const KEY_PREFIX = 'quantum:presence:user:'
const ACTIVITY_PREFIX = 'quantum:presence:activity:'
/** TTL Redis sur l’ensemble des sockets d’un user (rafraîchi à chaque connexion). */
const PRESENCE_TTL_SEC = Math.max(
  60,
  Number.parseInt(process.env.PRESENCE_REDIS_TTL_SEC ?? '900', 10) || 900,
)

const memorySockets = new Map<string, Set<string>>()
const memoryActivity = new Map<string, string>()

function memKey(userId: string) {
  return userId
}

function isOnlineInMemory(userId: string): boolean {
  const set = memorySockets.get(memKey(userId))
  return Boolean(set && set.size > 0)
}

function activityInMemory(userId: string): string | null {
  return memoryActivity.get(memKey(userId)) ?? null
}

export type PresenceSnapshot = {
  online: boolean
  activity: string | null
}

/**
 * Présence batch pour listes d’amis : 2 round-trips Redis (pipeline) au lieu de 2×N.
 * Mémoire locale prioritaire (connexions sur cette instance).
 */
export async function getPresenceBatch(userIds: string[]): Promise<Map<string, PresenceSnapshot>> {
  const out = new Map<string, PresenceSnapshot>()
  const unique = [...new Set(userIds.filter(Boolean))]
  if (unique.length === 0) return out

  for (const uid of unique) {
    out.set(uid, {
      online: isOnlineInMemory(uid),
      activity: activityInMemory(uid),
    })
  }

  if (env.isJest) return out

  const needRedisOnline: string[] = []
  const needRedisActivity: string[] = []
  for (const uid of unique) {
    const row = out.get(uid)!
    if (!row.online) needRedisOnline.push(uid)
    if (!row.activity) needRedisActivity.push(uid)
  }

  if (needRedisOnline.length === 0 && needRedisActivity.length === 0) {
    return out
  }

  try {
    await withRedisFeature('presence', async () => {
      const pipeline = redisClient.pipeline()
      for (const uid of needRedisOnline) {
        pipeline.scard(`${KEY_PREFIX}${uid}`)
      }
      for (const uid of needRedisActivity) {
        pipeline.get(`${ACTIVITY_PREFIX}${uid}`)
      }
      const results = await pipeline.exec()
      if (!results) return

      let idx = 0
      for (const uid of needRedisOnline) {
        const [err, count] = results[idx] ?? []
        idx += 1
        if (!err && typeof count === 'number' && count > 0) {
          out.get(uid)!.online = true
        }
      }
      for (const uid of needRedisActivity) {
        const [err, activity] = results[idx] ?? []
        idx += 1
        if (!err && typeof activity === 'string' && activity) {
          out.get(uid)!.activity = activity
        }
      }
    })
  } catch (err) {
    rootLogger.warn({
      msg: 'presence_batch_redis_failed',
      detail: err instanceof Error ? err.message : String(err),
    })
  }

  return out
}

/**
 * Marque un socket comme connecté pour cet utilisateur (multi-instances / multi-onglets).
 */
export async function markUserOnline(userId: string, socketId: string): Promise<void> {
  let set = memorySockets.get(memKey(userId))
  if (!set) {
    set = new Set()
    memorySockets.set(memKey(userId), set)
  }
  set.add(socketId)

  if (env.isJest) {
    return
  }

  try {
    await withRedisFeature('presence', async () => {
      const key = `${KEY_PREFIX}${userId}`
      await redisClient.sadd(key, socketId)
      await redisClient.expire(key, PRESENCE_TTL_SEC)
    })
  } catch (err) {
    rootLogger.warn({
      msg: 'presence_mark_online_redis_failed',
      detail: err instanceof Error ? err.message : String(err),
    })
  }
}

export async function markUserOffline(userId: string, socketId: string): Promise<void> {
  const set = memorySockets.get(memKey(userId))
  if (set) {
    set.delete(socketId)
    if (set.size === 0) {
      memorySockets.delete(memKey(userId))
      memoryActivity.delete(memKey(userId))
    }
  }

  if (env.isJest) {
    return
  }

  try {
    await withRedisFeature('presence', async () => {
      const key = `${KEY_PREFIX}${userId}`
      await redisClient.srem(key, socketId)
      const n = await redisClient.scard(key)
      if (n === 0) {
        await redisClient.del(key)
        await redisClient.del(`${ACTIVITY_PREFIX}${userId}`)
      }
    })
  } catch (err) {
    rootLogger.warn({
      msg: 'presence_mark_offline_redis_failed',
      detail: err instanceof Error ? err.message : String(err),
    })
  }
}

export async function isUserOnline(userId: string): Promise<boolean> {
  if (isOnlineInMemory(userId)) return true

  if (env.isJest) {
    return false
  }

  try {
    return await withRedisFeature('presence', async () => {
      const key = `${KEY_PREFIX}${userId}`
      const n = await redisClient.scard(key)
      return n > 0
    })
  } catch {
    return isOnlineInMemory(userId)
  }
}

export async function setUserActivity(userId: string, activity: string): Promise<void> {
  const safeActivity = activity.trim().slice(0, 48) || 'Salon poker'
  memoryActivity.set(memKey(userId), safeActivity)

  if (env.isJest) return

  try {
    await withRedisFeature('presence', async () => {
      const key = `${ACTIVITY_PREFIX}${userId}`
      await redisClient.set(key, safeActivity, 'EX', PRESENCE_TTL_SEC)
    })
  } catch {
    // La mémoire locale garde l'activité en dev si Redis n'est pas disponible.
  }
}

export async function getUserActivity(userId: string): Promise<string | null> {
  const local = activityInMemory(userId)
  if (local) return local

  if (env.isJest) {
    return null
  }

  try {
    const activity = await withRedisFeature('presence', async () =>
      redisClient.get(`${ACTIVITY_PREFIX}${userId}`),
    )
    return activity || null
  } catch {
    return activityInMemory(userId)
  }
}
