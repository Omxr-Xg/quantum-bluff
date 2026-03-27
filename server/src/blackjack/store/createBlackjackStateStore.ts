import Redis from 'ioredis'
import type { BlackjackStateStore } from './blackjackStateStore.js'
import { InMemoryBlackjackStateStore } from './inMemoryBlackjackStateStore.js'
import { RedisBlackjackStateStore } from './redisBlackjackStateStore.js'

type StoreMode = 'memory' | 'redis'

function resolveStoreMode(): StoreMode {
  const raw = (process.env.BLACKJACK_STATE_STORE ?? 'memory').trim().toLowerCase()
  return raw === 'redis' ? 'redis' : 'memory'
}

function createRedisClient(): Redis {
  if (process.env.REDIS_URL) {
    return new Redis(process.env.REDIS_URL)
  }
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  })
}

export function createBlackjackStateStore(): BlackjackStateStore {
  const mode = resolveStoreMode()
  if (mode === 'memory') {
    return new InMemoryBlackjackStateStore()
  }

  const redis = createRedisClient()
  const subscriber = createRedisClient()
  return new RedisBlackjackStateStore(redis, subscriber)
}

