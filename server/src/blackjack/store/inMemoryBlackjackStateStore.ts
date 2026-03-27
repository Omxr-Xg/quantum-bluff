import type { BlackjackStateStore } from './blackjackStateStore.js'
import type {
  BlackjackTableState,
  BlackjackTableUpdateEvent,
} from '../domain/blackjackState.types.js'

type LockEntry = {
  owner: string
  expiresAt: number
}

export class InMemoryBlackjackStateStore implements BlackjackStateStore {
  private readonly tables = new Map<string, BlackjackTableState>()
  private readonly locks = new Map<string, LockEntry>()
  private readonly subscribers: Array<
    (event: BlackjackTableUpdateEvent) => Promise<void> | void
  > = []

  async getTable(tableId: string): Promise<BlackjackTableState | null> {
    return this.tables.get(tableId) ?? null
  }

  async setTable(
    tableId: string,
    state: BlackjackTableState,
    _opts?: { ttlSec?: number }
  ): Promise<void> {
    this.tables.set(tableId, state)
  }

  async deleteTable(tableId: string): Promise<void> {
    this.tables.delete(tableId)
    this.locks.delete(`lock:${tableId}`)
  }

  async exists(tableId: string): Promise<boolean> {
    return this.tables.has(tableId)
  }

  async listActiveTableIds(): Promise<string[]> {
    return [...this.tables.keys()]
  }

  async acquireLock(tableId: string, owner: string, ttlMs: number): Promise<boolean> {
    const key = `lock:${tableId}`
    const now = Date.now()
    const current = this.locks.get(key)
    if (current && current.expiresAt > now) {
      return false
    }
    this.locks.set(key, { owner, expiresAt: now + Math.max(1, ttlMs) })
    return true
  }

  async releaseLock(tableId: string, owner: string): Promise<void> {
    const key = `lock:${tableId}`
    const current = this.locks.get(key)
    if (current?.owner === owner) {
      this.locks.delete(key)
    }
  }

  async publishUpdate(event: BlackjackTableUpdateEvent): Promise<void> {
    await Promise.all(this.subscribers.map((fn) => Promise.resolve(fn(event))))
  }

  async subscribeUpdates(
    handler: (event: BlackjackTableUpdateEvent) => Promise<void> | void
  ): Promise<void> {
    this.subscribers.push(handler)
  }
}

