import { randomUUID } from 'node:crypto'
import type { BlackjackStateStore } from '../store/blackjackStateStore.js'

export class BlackjackTableLockedError extends Error {
  constructor(message: string = 'TABLE_LOCKED') {
    super(message)
    this.name = 'BlackjackTableLockedError'
  }
}

export async function withBlackjackTableLock<T>(
  store: BlackjackStateStore,
  lockKey: string,
  fn: () => Promise<T>,
  ttlMs: number = 5000
): Promise<T> {
  const owner = randomUUID()
  const acquired = await store.acquireLock(lockKey, owner, ttlMs)
  if (!acquired) {
    throw new BlackjackTableLockedError()
  }

  try {
    return await fn()
  } finally {
    await store.releaseLock(lockKey, owner)
  }
}

