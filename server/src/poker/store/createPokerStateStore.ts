import type { PokerStateStore } from './pokerStateStore.js'
import { InMemoryPokerStateStore } from './inMemoryPokerStateStore.js'
import { RedisPokerStateStore } from './redisPokerStateStore.js'

export function createPokerStateStore(): PokerStateStore {
  const mode = String(process.env.POKER_STATE_STORE ?? 'redis').toLowerCase()
  if (mode === 'memory' || mode === 'inmemory') {
    return new InMemoryPokerStateStore()
  }
  return new RedisPokerStateStore()
}

