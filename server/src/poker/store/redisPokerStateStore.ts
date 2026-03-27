import redisClient from '../../config/redis.config.js'
import type { PokerRuntimeSnapshot, PokerStateStore } from './pokerStateStore.js'

const PREFIX = 'poker:runtime:'

export class RedisPokerStateStore implements PokerStateStore {
  async get(gameId: string): Promise<PokerRuntimeSnapshot | null> {
    const raw = await redisClient.get(`${PREFIX}${gameId}`)
    if (!raw) return null
    try {
      return JSON.parse(raw) as PokerRuntimeSnapshot
    } catch {
      return null
    }
  }

  async set(
    gameId: string,
    snapshot: PokerRuntimeSnapshot,
    opts?: { ttlSec?: number }
  ): Promise<void> {
    const raw = JSON.stringify(snapshot)
    const ttlSec = opts?.ttlSec
    if (ttlSec && ttlSec > 0) {
      await redisClient.setex(`${PREFIX}${gameId}`, ttlSec, raw)
      return
    }
    await redisClient.set(`${PREFIX}${gameId}`, raw)
  }

  async delete(gameId: string): Promise<void> {
    await redisClient.del(`${PREFIX}${gameId}`)
  }

  async listIds(): Promise<string[]> {
    const keys = await redisClient.keys(`${PREFIX}*`)
    return keys.map((k) => k.slice(PREFIX.length))
  }
}

