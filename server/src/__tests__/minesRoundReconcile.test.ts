import {
  MINES_ABANDON_RUNNING_MS,
  reconcileMinesRound,
} from '../mines/minesRoundReconcile.js'
import type { MinesRound } from '../mines/minesRoundStore.js'
import { minesRoundStore } from '../mines/minesRoundStore.js'

function runningRound(overrides: Partial<MinesRound> = {}): MinesRound {
  return {
    roundId: 'm1',
    userId: 'u1',
    bet: 50,
    mineCount: 5,
    minePositions: [0, 1, 2, 3, 4],
    revealedCells: [],
    startedAtMs: Date.now() - 60_000,
    status: 'running',
    currentMultiplier: 1,
    ...overrides,
  }
}

describe('reconcileMinesRound', () => {
  it('laisse une manche récente intacte', () => {
    expect(reconcileMinesRound(runningRound()).status).toBe('running')
  })

  it('bust une manche abandonnée', () => {
    const now = Date.now()
    const round = runningRound({
      startedAtMs: now - MINES_ABANDON_RUNNING_MS - 1000,
    })
    const next = reconcileMinesRound(round, now)
    expect(next.status).toBe('busted')
    expect(next.currentMultiplier).toBe(0)
  })
})

describe('minesRoundStore — réconciliation active', () => {
  beforeEach(() => {
    minesRoundStore._resetForTests()
  })

  it('libère le slot après abandon prolongé', () => {
    const now = Date.now()
    minesRoundStore.createRound(
      runningRound({
        startedAtMs: now - MINES_ABANDON_RUNNING_MS - 5000,
      }),
    )
    expect(minesRoundStore.getActiveRoundId('u1')).toBeUndefined()
  })

  it('expose getActiveRound pour reprise', () => {
    minesRoundStore.createRound(runningRound())
    const active = minesRoundStore.getActiveRound('u1')
    expect(active?.roundId).toBe('m1')
    expect(active?.status).toBe('running')
  })
})
