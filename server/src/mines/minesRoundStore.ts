export type MinesRoundStatus = 'running' | 'cashed_out' | 'busted'

export type MinesRound = {
  roundId: string
  userId: string
  bet: number
  mineCount: number
  minePositions: number[]
  revealedCells: number[]
  startedAtMs: number
  status: MinesRoundStatus
  currentMultiplier: number
  cashoutMultiplier?: number
  payout?: number
}

import { reconcileMinesRound } from './minesRoundReconcile.js'

const roundsById = new Map<string, MinesRound>()
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

function syncActiveAfterReconcile(roundId: string, round: MinesRound): MinesRound {
  roundsById.set(roundId, round)
  if (round.status !== 'running') {
    if (activeByUser.get(round.userId) === roundId) activeByUser.delete(round.userId)
  }
  return round
}

function reconcileUserActive(userId: string, now = Date.now()): void {
  const id = activeByUser.get(userId)
  if (!id) return
  const round = roundsById.get(id)
  if (!round) {
    activeByUser.delete(userId)
    return
  }
  syncActiveAfterReconcile(id, reconcileMinesRound(round, now))
}

export const minesRoundStore = {
  reconcileUser(userId: string, now = Date.now()): void {
    purgeStale(now)
    reconcileUserActive(userId, now)
  },

  getActiveRoundId(userId: string): string | undefined {
    purgeStale()
    reconcileUserActive(userId)
    const id = activeByUser.get(userId)
    if (!id) return undefined
    const round = roundsById.get(id)
    return round?.status === 'running' ? id : undefined
  },

  getActiveRound(userId: string): MinesRound | undefined {
    purgeStale()
    reconcileUserActive(userId)
    const id = activeByUser.get(userId)
    if (!id) return undefined
    const round = roundsById.get(id)
    return round?.status === 'running' ? round : undefined
  },

  getRound(roundId: string): MinesRound | undefined {
    purgeStale()
    const round = roundsById.get(roundId)
    if (!round) return undefined
    return syncActiveAfterReconcile(roundId, reconcileMinesRound(round))
  },

  _resetForTests(): void {
    roundsById.clear()
    activeByUser.clear()
  },

  createRound(round: MinesRound): void {
    purgeStale()
    const prev = activeByUser.get(round.userId)
    if (prev) {
      const old = roundsById.get(prev)
      if (old && old.status === 'running') {
        throw new Error('ACTIVE_MINES_ROUND')
      }
    }
    roundsById.set(round.roundId, round)
    activeByUser.set(round.userId, round.roundId)
  },

  updateRound(roundId: string, patch: Partial<MinesRound>): MinesRound | undefined {
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
