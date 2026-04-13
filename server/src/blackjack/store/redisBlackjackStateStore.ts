import { Redis } from 'ioredis'
import type { BlackjackStateStore } from './blackjackStateStore.js'
import type {
  BlackjackTableState,
  BlackjackTableUpdateEvent,
} from '../domain/blackjackState.types.js'

const TABLE_KEY = (tableId: string) => `bj:table:${tableId}`
const LOCK_KEY = (tableId: string) => `bj:lock:${tableId}`
const TABLE_SET_KEY = 'bj:tables:active'
const UPDATE_CHANNEL = 'bj:table:updates'

export class RedisBlackjackStateStore implements BlackjackStateStore {
  constructor(
    private readonly redis: Redis,
    private readonly subscriber: Redis
  ) {}

  async getTable(tableId: string): Promise<BlackjackTableState | null> {
    const raw = await this.redis.get(TABLE_KEY(tableId))
    if (!raw) return null
    try {
      return JSON.parse(raw) as BlackjackTableState
    } catch {
      return null
    }
  }

  async setTable(
    tableId: string,
    state: BlackjackTableState,
    opts?: { ttlSec?: number }
  ): Promise<void> {
    const multi = this.redis.multi()
    multi.set(TABLE_KEY(tableId), JSON.stringify(state))
    multi.sadd(TABLE_SET_KEY, tableId)
    if (opts?.ttlSec) {
      multi.expire(TABLE_KEY(tableId), opts.ttlSec)
    }
    await multi.exec()
  }

  async deleteTable(tableId: string): Promise<void> {
    const multi = this.redis.multi()
    multi.del(TABLE_KEY(tableId))
    multi.srem(TABLE_SET_KEY, tableId)
    multi.del(LOCK_KEY(tableId))
    await multi.exec()
  }

  async exists(tableId: string): Promise<boolean> {
    return (await this.redis.exists(TABLE_KEY(tableId))) === 1
  }

  async listActiveTableIds(): Promise<string[]> {
    return this.redis.smembers(TABLE_SET_KEY)
  }

  async acquireLock(tableId: string, owner: string, ttlMs: number): Promise<boolean> {
    const res = await this.redis.set(LOCK_KEY(tableId), owner, 'PX', ttlMs, 'NX')
    return res === 'OK'
  }

  async releaseLock(tableId: string, owner: string): Promise<void> {
    const lua = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `
    await this.redis.eval(lua, 1, LOCK_KEY(tableId), owner)
  }

  async publishUpdate(event: BlackjackTableUpdateEvent): Promise<void> {
    await this.redis.publish(UPDATE_CHANNEL, JSON.stringify(event))
  }

  async subscribeUpdates(
    handler: (event: BlackjackTableUpdateEvent) => Promise<void> | void
  ): Promise<void> {
    await this.subscriber.subscribe(UPDATE_CHANNEL)
    this.subscriber.on('message', async (channel: string, message: string) => {
      if (channel !== UPDATE_CHANNEL) return
      try {
        const evt = JSON.parse(message) as BlackjackTableUpdateEvent
        await handler(evt)
      } catch {
        // Ignore malformed messages
      }
    })
  }
}

