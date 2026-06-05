const playingUsers = new Map<string, number>()
const LOCK_TTL_MS = 30_000

function purgeStale(now = Date.now()): void {
  for (const [userId, until] of playingUsers) {
    if (until <= now) playingUsers.delete(userId)
  }
}

export const luckyNumberPlayLock = {
  tryAcquire(userId: string): boolean {
    purgeStale()
    if (playingUsers.has(userId)) return false
    playingUsers.set(userId, Date.now() + LOCK_TTL_MS)
    return true
  },

  release(userId: string): void {
    playingUsers.delete(userId)
  },
}
