import redisClient from '../config/redis.config.js'
import { env } from '../config/env.js'
import { rootLogger } from '../observability/logger.js'

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
    const key = `${KEY_PREFIX}${userId}`
    await redisClient.sadd(key, socketId)
    await redisClient.expire(key, PRESENCE_TTL_SEC)
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
    const key = `${KEY_PREFIX}${userId}`
    await redisClient.srem(key, socketId)
    const n = await redisClient.scard(key)
    if (n === 0) {
      await redisClient.del(key)
      await redisClient.del(`${ACTIVITY_PREFIX}${userId}`)
    }
  } catch (err) {
    rootLogger.warn({
      msg: 'presence_mark_offline_redis_failed',
      detail: err instanceof Error ? err.message : String(err),
    })
  }
}

export async function isUserOnline(userId: string): Promise<boolean> {
  if (env.isJest) {
    const set = memorySockets.get(memKey(userId))
    return Boolean(set && set.size > 0)
  }

  try {
    const key = `${KEY_PREFIX}${userId}`
    const n = await redisClient.scard(key)
    return n > 0
  } catch {
    const set = memorySockets.get(memKey(userId))
    return Boolean(set && set.size > 0)
  }
}

export async function setUserActivity(userId: string, activity: string): Promise<void> {
  const safeActivity = activity.trim().slice(0, 48) || 'Salon poker'
  memoryActivity.set(memKey(userId), safeActivity)

  if (env.isJest) return

  try {
    const key = `${ACTIVITY_PREFIX}${userId}`
    await redisClient.set(key, safeActivity, 'EX', PRESENCE_TTL_SEC)
  } catch {
    // La mémoire locale garde l'activité en dev si Redis n'est pas disponible.
  }
}

export async function getUserActivity(userId: string): Promise<string | null> {
  if (env.isJest) {
    return memoryActivity.get(memKey(userId)) ?? null
  }

  try {
    const activity = await redisClient.get(`${ACTIVITY_PREFIX}${userId}`)
    return activity || memoryActivity.get(memKey(userId)) || null
  } catch {
    return memoryActivity.get(memKey(userId)) ?? null
  }
}
