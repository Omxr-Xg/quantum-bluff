import { Redis } from 'ioredis'
import { env } from './env.js'
import { rootLogger } from '../observability/logger.js'
import { attachRedisInstrumentation } from '../observability/redisInstrumentation.js'

let pubClient: Redis | null = null
let subClient: Redis | null = null

const sharedRedisOptions = {
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: env.isJest ? 1 : 20,
  connectTimeout: env.isJest ? 1000 : 5000,
  username: env.redisUsername,
  password: env.redisPassword,
}

/**
 * Clients Redis dédiés à l’adaptateur Socket.IO (pub/sub).
 * Ne pas réutiliser le client générique : évite les conflits de mode subscriber.
 */
export function createSocketIoRedisClients(): { pubClient: Redis; subClient: Redis } {
  if (pubClient && subClient) {
    return { pubClient, subClient }
  }

  if (env.redisUrl) {
    pubClient = new Redis(env.redisUrl, sharedRedisOptions)
  } else {
    pubClient = new Redis({
      host: env.redisHost,
      port: env.redisPort,
      ...sharedRedisOptions,
    })
  }

  subClient = pubClient.duplicate()

  attachRedisInstrumentation(pubClient, 'socket_io_adapter')
  attachRedisInstrumentation(subClient, 'socket_io_adapter')

  for (const [name, c] of [
    ['socketio_redis_pub', pubClient],
    ['socketio_redis_sub', subClient],
  ] as const) {
    c.on('error', (err: Error) => {
      rootLogger.error({
        msg: `${name}_error`,
        detail: err.message,
      })
    })
  }

  return { pubClient, subClient }
}

export async function disconnectSocketIoRedisClients(): Promise<void> {
  await Promise.all([pubClient?.quit().catch(() => {}), subClient?.quit().catch(() => {})])
  pubClient = null
  subClient = null
}
