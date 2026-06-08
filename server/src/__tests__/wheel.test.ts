import {
  WHEEL_SEGMENT_COUNT,
  WHEEL_SEGMENTS,
  computeFinalAngle,
  computeWheelPayout,
  computeWheelSpinDeltaFromFinalAngle,
  getWheelSegment,
  pickWheelSegmentIndex,
  validateWheelBet,
  wheelSegmentIndexAtPointer,
} from '../logic/wheel.js'

describe('wheel — validateWheelBet', () => {
  it('accepts valid bet', () => {
    expect(validateWheelBet(100, 500)).toEqual({ ok: true, bet: 100 })
  })

  it('rejects invalid step', () => {
    expect(validateWheelBet(25, 500).ok).toBe(false)
  })
})

describe('wheel — segments', () => {
  it('has 12 segments', () => {
    expect(WHEEL_SEGMENTS).toHaveLength(WHEEL_SEGMENT_COUNT)
  })

  it('includes jackpot x20', () => {
    const jackpot = WHEEL_SEGMENTS.find((s) => s.kind === 'jackpot')
    expect(jackpot?.multiplier).toBe(20)
  })
})

describe('wheel — pickWheelSegmentIndex', () => {
  it('returns index in range', () => {
    for (let i = 0; i < 40; i++) {
      const idx = pickWheelSegmentIndex(() => Math.random())
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(12)
    }
  })
})

describe('wheel — payout', () => {
  it('computes gross return', () => {
    expect(computeWheelPayout(100, 5)).toBe(500)
    expect(computeWheelPayout(100, 0)).toBe(0)
    expect(computeWheelPayout(100, 0.5)).toBe(50)
  })
})

describe('wheel — finalAngle', () => {
  it('returns positive angle with full spins', () => {
    const angle = computeFinalAngle(0, () => 0.5)
    expect(angle).toBeGreaterThanOrEqual(5 * 360)
  })

  it('aligns each segment index under the top pointer', () => {
    for (let i = 0; i < 12; i++) {
      const angle = computeFinalAngle(i, () => 0)
      expect(wheelSegmentIndexAtPointer(angle)).toBe(i)
      expect(getWheelSegment(i).label).toBeTruthy()
    }
  })

  it('cumulative spins still land on the winning segment', () => {
    let totalRotation = 0
    for (let spin = 0; spin < 24; spin++) {
      const segmentIndex = pickWheelSegmentIndex(() => (spin * 0.37) % 1)
      const finalAngle = computeFinalAngle(segmentIndex, () => 0.25)
      const delta = computeWheelSpinDeltaFromFinalAngle(totalRotation, finalAngle)
      totalRotation += delta
      expect(wheelSegmentIndexAtPointer(totalRotation)).toBe(segmentIndex)
    }
  })
})
