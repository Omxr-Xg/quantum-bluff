import { prisma } from '../config/database.js'
import { isRedisHealthy } from '../config/redis.config.js'
import { metrics } from './metrics.js'
import { rootLogger } from './logger.js'
import { isDraining } from './readinessDrain.js'

export type ReadyPayload = {
  ready: boolean
  degraded: boolean
  draining?: boolean
  components: {
    database: 'up' | 'down'
    redis: 'up' | 'fallback_memory'
  }
}

export async function getReadyState(): Promise<ReadyPayload> {
  let dbOk: boolean
  try {
    await prisma.$queryRaw`SELECT 1`
    dbOk = true
  } catch {
    dbOk = false
  }

  const redisOk = await isRedisHealthy()
  metrics.setComponentUp('database', dbOk)
  metrics.setComponentUp('redis', redisOk)
  const degraded = dbOk && !redisOk
  metrics.setDegraded('redis_unavailable', degraded)

  const drain = isDraining()

  return {
    ready: dbOk && !drain,
    degraded,
    draining: drain,
    components: {
      database: dbOk ? 'up' : 'down',
      redis: redisOk ? 'up' : 'fallback_memory',
    },
  }
}

/** Appel une fois après `connectDB` pour exposer l’état dégradé (logs + gauges). */
export async function logDegradedStateAtBoot(): Promise<void> {
  const state = await getReadyState()
  if (state.degraded) {
    rootLogger.warn({
      msg: 'degraded_mode_entered',
      component: 'redis',
      fallback: 'memory',
      detail: 'idempotence et stores utilisent le fallback mémoire',
    })
  }
}
