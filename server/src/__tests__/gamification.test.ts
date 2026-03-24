import {
  levelFromExperience,
  xpThresholdForLevel,
  xpToNextLevel,
  getEffectiveSlotMaxBet,
  BADGE_CATALOG,
} from '../logic/gamification.js'
import { SLOT_MAX_BET_CAP, SLOT_MIN_BET } from '../logic/slotMachine.js'

describe('gamification', () => {
  it('xpThresholdForLevel', () => {
    expect(xpThresholdForLevel(1)).toBe(0)
    expect(xpThresholdForLevel(2)).toBe(100)
    expect(xpThresholdForLevel(3)).toBe(300)
  })

  it('levelFromExperience', () => {
    expect(levelFromExperience(0)).toBe(1)
    expect(levelFromExperience(99)).toBe(1)
    expect(levelFromExperience(100)).toBe(2)
    expect(levelFromExperience(299)).toBe(2)
    expect(levelFromExperience(300)).toBe(3)
  })

  it('xpToNextLevel', () => {
    expect(xpToNextLevel(0, 1)).toBe(100)
    expect(xpToNextLevel(100, 2)).toBe(200)
  })

  it('getEffectiveSlotMaxBet scales and caps', () => {
    const low = getEffectiveSlotMaxBet(1)
    const high = getEffectiveSlotMaxBet(99)
    expect(low).toBeGreaterThanOrEqual(250)
    expect(low).toBeLessThanOrEqual(SLOT_MAX_BET_CAP)
    expect(high).toBe(SLOT_MAX_BET_CAP)
    expect(getEffectiveSlotMaxBet(1)).toBeLessThan(getEffectiveSlotMaxBet(25))
  })

  it('BADGE_CATALOG sorted by minLevel', () => {
    const levels = BADGE_CATALOG.map((b) => b.minLevel)
    const sorted = [...levels].sort((a, b) => a - b)
    expect(levels).toEqual(sorted)
  })
})
