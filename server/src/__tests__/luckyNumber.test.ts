import {
  LUCKY_NUMBER_MAX,
  LUCKY_NUMBER_MIN,
  LUCKY_NUMBER_WIN_MULTIPLIER,
  computeLuckyNumberPayout,
  isLuckyNumberWin,
  pickLuckyNumber,
  validateLuckyNumberBet,
  validateSelectedNumber,
} from '../logic/luckyNumber.js'

describe('luckyNumber — validateLuckyNumberBet', () => {
  it('accepts valid bet', () => {
    expect(validateLuckyNumberBet(100, 500)).toEqual({ ok: true, bet: 100 })
  })

  it('rejects invalid step', () => {
    expect(validateLuckyNumberBet(25, 500).ok).toBe(false)
  })

  it('rejects bet too low', () => {
    expect(validateLuckyNumberBet(5, 500).ok).toBe(false)
  })

  it('rejects insufficient chips', () => {
    expect(validateLuckyNumberBet(100, 50).ok).toBe(false)
  })
})

describe('luckyNumber — validateSelectedNumber', () => {
  it('accepts 1 to 10', () => {
    expect(validateSelectedNumber(7)).toEqual({ ok: true, selectedNumber: 7 })
    expect(validateSelectedNumber(1)).toEqual({ ok: true, selectedNumber: 1 })
    expect(validateSelectedNumber(10)).toEqual({ ok: true, selectedNumber: 10 })
  })

  it('rejects out of range', () => {
    expect(validateSelectedNumber(0).ok).toBe(false)
    expect(validateSelectedNumber(11).ok).toBe(false)
  })

  it('rejects non-integer', () => {
    expect(validateSelectedNumber(3.5).ok).toBe(false)
  })
})

describe('luckyNumber — pickLuckyNumber', () => {
  it('returns value in range', () => {
    for (let i = 0; i < 50; i++) {
      const n = pickLuckyNumber(() => Math.random())
      expect(n).toBeGreaterThanOrEqual(LUCKY_NUMBER_MIN)
      expect(n).toBeLessThanOrEqual(LUCKY_NUMBER_MAX)
    }
  })

  it('covers full range with deterministic units', () => {
    expect(pickLuckyNumber(() => 0)).toBe(1)
    expect(pickLuckyNumber(() => 0.99)).toBe(10)
  })
})

describe('luckyNumber — win and payout', () => {
  it('detects win only on match', () => {
    expect(isLuckyNumberWin(7, 7)).toBe(true)
    expect(isLuckyNumberWin(7, 3)).toBe(false)
  })

  it('pays x8 on win', () => {
    expect(computeLuckyNumberPayout(100, true)).toBe(100 * LUCKY_NUMBER_WIN_MULTIPLIER)
    expect(computeLuckyNumberPayout(100, false)).toBe(0)
  })
})
