import {
  MINES_HOUSE_EDGE,
  MINES_MINE_OPTIONS,
  computeMinesPayout,
  generateMinePositions,
  maxSafeReveals,
  multiplierForSafeReveals,
  validateMineCount,
  validateMinesBet,
  validateMinesCell,
} from '../logic/mines.js'

describe('mines — validateMinesBet', () => {
  it('accepts valid bet', () => {
    expect(validateMinesBet(100, 500)).toEqual({ ok: true, bet: 100 })
  })

  it('rejects step mismatch', () => {
    expect(validateMinesBet(15, 500).ok).toBe(false)
  })
})

describe('mines — validateMineCount', () => {
  it('accepts allowed mine counts', () => {
    for (const count of MINES_MINE_OPTIONS) {
      expect(validateMineCount(count)).toEqual({ ok: true, mineCount: count })
    }
  })

  it('rejects invalid mine count', () => {
    expect(validateMineCount(7).ok).toBe(false)
  })
})

describe('mines — validateMinesCell', () => {
  it('accepts valid cell index', () => {
    expect(validateMinesCell(12)).toEqual({ ok: true, cell: 12 })
  })

  it('rejects out of range cell', () => {
    expect(validateMinesCell(25).ok).toBe(false)
  })
})

describe('mines — multiplier progression (5 mines)', () => {
  it('matches spec anchor values with 4% house edge', () => {
    expect(multiplierForSafeReveals(5, 0)).toBe(1)
    expect(multiplierForSafeReveals(5, 1)).toBe(1.2)
    expect(multiplierForSafeReveals(5, 2)).toBe(1.45)
    expect(multiplierForSafeReveals(5, 7)).toBeGreaterThanOrEqual(3.9)
  })

  it('increases with each safe reveal', () => {
    const m1 = multiplierForSafeReveals(5, 1)
    const m3 = multiplierForSafeReveals(5, 3)
    expect(m3).toBeGreaterThan(m1)
  })
})

describe('mines — mine layout', () => {
  it('generates unique positions', () => {
    const positions = generateMinePositions(5, () => 0.42)
    expect(positions).toHaveLength(5)
    expect(new Set(positions).size).toBe(5)
    positions.forEach((cell) => {
      expect(cell).toBeGreaterThanOrEqual(0)
      expect(cell).toBeLessThan(25)
    })
  })

  it('limits safe reveals by mine count', () => {
    expect(maxSafeReveals(20)).toBe(5)
  })
})

describe('mines — payout', () => {
  it('computes gross return', () => {
    expect(computeMinesPayout(100, 4.25)).toBe(425)
  })
})

describe('mines — house edge constant', () => {
  it('uses 4% edge per reveal step', () => {
    expect(MINES_HOUSE_EDGE).toBe(0.04)
  })
})
