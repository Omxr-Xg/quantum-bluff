export type CrashRoundStatus = 'running' | 'cashed_out' | 'crashed'

export type CrashRound = {
  roundId: string
  userId: string
  bet: number
  crashPoint: number
  startedAtMs: number
  status: CrashRoundStatus
  cashoutMultiplier?: number
  payout?: number
}

const roundsById = new Map<string, CrashRound>()
const activeByUser = new Map<string, string>()

const ROUND_TTL_MS = 15 * 60 * 1000

function purgeStale(now = Date.now()): void {
  for (const [id, round] of roundsById) {
    if (now - round.startedAtMs > ROUND_TTL_MS) {
      roundsById.delete(id)
      if (activeByUser.get(round.userId) === id) activeByUser.delete(round.userId)
    }
  }
}

export const crashRoundStore = {
  getActiveRoundId(userId: string): string | undefined {
    purgeStale()
    return activeByUser.get(userId)
  },

  getRound(roundId: string): CrashRound | undefined {
    purgeStale()
    return roundsById.get(roundId)
  },

  createRound(round: CrashRound): void {
    purgeStale()
    const prev = activeByUser.get(round.userId)
    if (prev) {
      const old = roundsById.get(prev)
      if (old && old.status === 'running') {
        throw new Error('ACTIVE_CRASH_ROUND')
      }
    }
    roundsById.set(round.roundId, round)
    activeByUser.set(round.userId, round.roundId)
  },

  updateRound(roundId: string, patch: Partial<CrashRound>): CrashRound | undefined {
    const current = roundsById.get(roundId)
    if (!current) return undefined
    const next = { ...current, ...patch }
    roundsById.set(roundId, next)
    if (next.status !== 'running') {
      if (activeByUser.get(next.userId) === roundId) activeByUser.delete(next.userId)
    }
    return next
  },
}
