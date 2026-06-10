import {
  CRASH_GROWTH_RATE,
  generateCrashPoint,
  multiplierAtElapsedSeconds,
  resolveCashoutMultiplier,
  validateCrashBet,
  computeCrashPayout,
} from '../logic/crash.js'

describe('crash — validateCrashBet', () => {
  it('accepts valid bet', () => {
    expect(validateCrashBet(100, 500)).toEqual({ ok: true, bet: 100 })
  })

  it('rejects step mismatch', () => {
    expect(validateCrashBet(15, 500).ok).toBe(false)
  })
})

describe('crash — multiplier growth', () => {
  it('starts at 1.00', () => {
    expect(multiplierAtElapsedSeconds(0)).toBe(1)
  })

  it('grows with time', () => {
    const m1 = multiplierAtElapsedSeconds(1)
    const m3 = multiplierAtElapsedSeconds(3)
    expect(m3).toBeGreaterThan(m1)
    expect(m1).toBeCloseTo(Math.exp(CRASH_GROWTH_RATE), 2)
  })
})

describe('crash — cashout (server-authoritative)', () => {
  it('allows cashout before crash', () => {
    const crashPoint = 5
    const result = resolveCashoutMultiplier(2, crashPoint)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.multiplier).toBe(multiplierAtElapsedSeconds(2))
    }
  })

  it('rejects cashout after crash time', () => {
    const crashPoint = 1.2
    const result = resolveCashoutMultiplier(10, crashPoint)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('ALREADY_CRASHED')
  })

  it('uses server multiplier at request time only', () => {
    const crashPoint = 10
    const elapsed = 5
    const result = resolveCashoutMultiplier(elapsed, crashPoint)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.multiplier).toBe(multiplierAtElapsedSeconds(elapsed))
    }
  })
})

describe('crash — payout', () => {
  it('computes gross return', () => {
    expect(computeCrashPayout(100, 2.4)).toBe(240)
  })
})

describe('crash — crash point distribution', () => {
  it('generates values >= 1.01', () => {
    for (let i = 0; i < 50; i++) {
      const p = generateCrashPoint(() => Math.random())
      expect(p).toBeGreaterThanOrEqual(1.01)
      expect(p).toBeLessThanOrEqual(50)
    }
  })
})
