import type {
  BlackjackTableState,
  BlackjackTableUpdateEvent,
} from '../domain/blackjackState.types.js'

export interface BlackjackStateStore {
  getTable(tableId: string): Promise<BlackjackTableState | null>
  setTable(
    tableId: string,
    state: BlackjackTableState,
    opts?: { ttlSec?: number }
  ): Promise<void>
  deleteTable(tableId: string): Promise<void>
  exists(tableId: string): Promise<boolean>
  listActiveTableIds(): Promise<string[]>

  acquireLock(tableId: string, owner: string, ttlMs: number): Promise<boolean>
  releaseLock(tableId: string, owner: string): Promise<void>

  publishUpdate(event: BlackjackTableUpdateEvent): Promise<void>
  subscribeUpdates(
    handler: (event: BlackjackTableUpdateEvent) => Promise<void> | void
  ): Promise<void>
}

