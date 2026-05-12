import {
  levelFromExperience,
  xpThresholdForLevel,
  xpToNextLevel,
  getEffectiveSlotMaxBet,
  BADGE_CATALOG,
  unlockBadgesForLevel,
  awardXpInTransaction,
  gamificationPayloadForUser,
} from '../logic/gamification.js'
import { SLOT_MAX_BET_CAP } from '../logic/slotMachine.js'

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

  it('gamificationPayloadForUser exposes caps', () => {
    const p = gamificationPayloadForUser({ experience: 100, level: 2 })
    expect(p.level).toBe(2)
    expect(p.maxBetSlot).toBeGreaterThan(0)
    expect(p.xpToNext).toBeGreaterThanOrEqual(0)
  })

  it('unlockBadgesForLevel creates rows for newly eligible badges', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 1 })
    const tx = {
      userBadge: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany,
      },
    }
    const added = await unlockBadgesForLevel(tx as never, 'u1', 5)
    expect(added).toContain('rising')
    expect(createMany).toHaveBeenCalled()
  })

  it('awardXpInTransaction no-op delta returns current progression', async () => {
    const tx = {
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ experience: 50, level: 1 }),
        update: jest.fn(),
      },
      userBadge: { findMany: jest.fn(), createMany: jest.fn() },
    }
    const r = await awardXpInTransaction(tx as never, 'u1', 0)
    expect(r.experience).toBe(50)
    expect(r.newBadges).toEqual([])
    expect(tx.user.update).not.toHaveBeenCalled()
  })

  it('awardXpInTransaction applies XP and unlocks badges', async () => {
    const tx = {
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ experience: 0, level: 1 }),
        update: jest.fn().mockResolvedValue({ id: 'u1' }),
      },
      userBadge: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    }
    const r = await awardXpInTransaction(tx as never, 'u1', 500)
    expect(r.experience).toBe(500)
    expect(tx.user.update).toHaveBeenCalled()
    expect(Array.isArray(r.newBadges)).toBe(true)
  })
})
