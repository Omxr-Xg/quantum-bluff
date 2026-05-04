import redisClient from '../config/redis.config.js'
import { env } from '../config/env.js'
import { rootLogger } from '../observability/logger.js'
import { metrics } from '../observability/metrics.js'

const KEY = 'quantum:tournament:cron:leader'
const TTL_SEC = 30

/**
 * Une seule instance doit exécuter le cron tournoi / le watcher (évite doubles `startTournament`).
 */
export async function renewTournamentLeaderLock(): Promise<boolean> {
  if (env.isJest) {
    metrics.setTournamentLeaderActive(env.instanceId, true)
    return true
  }

  try {
    const acquired = await redisClient.set(KEY, env.instanceId, 'EX', TTL_SEC, 'NX')
    if (acquired === 'OK') {
      metrics.setTournamentLeaderActive(env.instanceId, true)
      return true
    }

    const current = await redisClient.get(KEY)
    if (current === env.instanceId) {
      await redisClient.expire(KEY, TTL_SEC)
      metrics.setTournamentLeaderActive(env.instanceId, true)
      return true
    }

    metrics.setTournamentLeaderActive(env.instanceId, false)
    return false
  } catch (err) {
    rootLogger.warn({
      msg: 'tournament_leader_lock_redis_error',
      detail: err instanceof Error ? err.message : String(err),
    })
    metrics.setTournamentLeaderActive(env.instanceId, false)
    // Sans Redis, on ne lance pas le cron sur toutes les instances : risque de double start.
    return false
  }
}

export async function releaseTournamentLeaderLock(): Promise<void> {
  if (env.isJest) {
    metrics.setTournamentLeaderActive(env.instanceId, false)
    return
  }
  try {
    const current = await redisClient.get(KEY)
    if (current === env.instanceId) {
      await redisClient.del(KEY)
    }
  } catch {
    /* ignore */
  }
  metrics.setTournamentLeaderActive(env.instanceId, false)
}
