import {
  CRASH_ABANDON_RUNNING_SEC,
  reconcileCrashRound,
  elapsedCrashSec,
} from '../crash/crashRoundReconcile.js'
import type { CrashRound } from '../crash/crashRoundStore.js'
import { crashRoundStore } from '../crash/crashRoundStore.js'

function runningRound(overrides: Partial<CrashRound> = {}): CrashRound {
  return {
    roundId: 'r1',
    userId: 'u1',
    bet: 100,
    crashPoint: 2,
    startedAtMs: Date.now() - 5000,
    status: 'running',
    ...overrides,
  }
}

describe('reconcileCrashRound', () => {
  it('laisse une manche running récente intacte', () => {
    const round = runningRound({ crashPoint: 50, startedAtMs: Date.now() - 1000 })
    expect(reconcileCrashRound(round).status).toBe('running')
  })

  it('clôture une manche dont le crash point est dépassé', () => {
    const now = Date.now()
    const round = runningRound({
      crashPoint: 1.05,
      startedAtMs: now - 10_000,
    })
    expect(reconcileCrashRound(round, now).status).toBe('crashed')
  })

  it('clôture une manche abandonnée au-delà du délai max', () => {
    const now = Date.now()
    const round = runningRound({
      crashPoint: 50,
      startedAtMs: now - (CRASH_ABANDON_RUNNING_SEC + 5) * 1000,
    })
    expect(reconcileCrashRound(round, now).status).toBe('crashed')
  })

  it('ne modifie pas une manche déjà terminée', () => {
    const round = runningRound({ status: 'cashed_out', cashoutMultiplier: 1.5, payout: 150 })
    expect(reconcileCrashRound(round).status).toBe('cashed_out')
  })
})

describe('crashRoundStore — réconciliation active', () => {
  beforeEach(() => {
    crashRoundStore._resetForTests()
  })

  it('libère le slot actif après réconciliation crash', () => {
    const now = Date.now()
    crashRoundStore.createRound(
      runningRound({
        crashPoint: 1.02,
        startedAtMs: now - 30_000,
      }),
    )
    expect(crashRoundStore.getActiveRoundId('u1')).toBeUndefined()
  })

  it('conserve une manche running légitime', () => {
    crashRoundStore.createRound(
      runningRound({
        crashPoint: 40,
        startedAtMs: Date.now() - 2000,
      }),
    )
    expect(crashRoundStore.getActiveRoundId('u1')).toBe('r1')
  })

  it('calcule elapsedCrashSec', () => {
    const start = Date.now() - 2500
    expect(elapsedCrashSec(start)).toBeGreaterThanOrEqual(2)
  })
})
