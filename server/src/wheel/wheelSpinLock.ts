const spinningUsers = new Map<string, number>()
const LOCK_TTL_MS = 30_000

function purgeStale(now = Date.now()): void {
  for (const [userId, until] of spinningUsers) {
    if (until <= now) spinningUsers.delete(userId)
  }
}

export const wheelSpinLock = {
  tryAcquire(userId: string): boolean {
    purgeStale()
    if (spinningUsers.has(userId)) return false
    spinningUsers.set(userId, Date.now() + LOCK_TTL_MS)
    return true
  },

  release(userId: string): void {
    spinningUsers.delete(userId)
  },
}
