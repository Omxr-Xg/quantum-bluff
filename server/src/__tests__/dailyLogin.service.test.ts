type DailyLoginUserRow = {
  id: string
  chips: number
  loginStreakCount: number
  lastLoginRewardDayKey: string | null
  lastLoginRewardAt: Date | null
}

const mockUsers = new Map<string, DailyLoginUserRow>()
const mockLedgerRows: Array<{ userId: string; amount: number; reason: string; roundId?: string | null }> = []

const hookState = {
  runBeforeUpdateMany: false,
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function mockCreateTx() {
  return {
    user: {
      findUnique: jest.fn(async ({ where, select }: any) => {
        const row = mockUsers.get(where.id)
        if (!row) return null
        if (select) {
          const picked: Record<string, unknown> = {}
          for (const key of Object.keys(select)) {
            if (select[key]) picked[key] = (row as Record<string, unknown>)[key]
          }
          return picked
        }
        return row
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const row = mockUsers.get(where.id)
        if (!row) return { count: 0 }

        if (hookState.runBeforeUpdateMany) {
          row.lastLoginRewardDayKey = todayKey()
        }

        if (row.lastLoginRewardDayKey === where.lastLoginRewardDayKey.not) {
          return { count: 0 }
        }

        row.chips += data.chips.increment
        row.loginStreakCount = data.loginStreakCount
        row.lastLoginRewardDayKey = data.lastLoginRewardDayKey
        row.lastLoginRewardAt = data.lastLoginRewardAt
        return { count: 1 }
      }),
    },
    walletLedgerEntry: {
      create: jest.fn(async ({ data }: any) => {
        mockLedgerRows.push(data)
        return data
      }),
    },
  }
}

var mockPrisma: { $transaction: jest.Mock; user: { findUnique: jest.Mock } }
jest.mock('../config/database.js', () => {
  const mockUserFindUnique = jest.fn(async ({ where, select }: any) => {
    const row = mockUsers.get(where.id)
    if (!row) return null
    if (select) {
      const picked: Record<string, unknown> = {}
      for (const key of Object.keys(select)) {
        if (select[key]) picked[key] = (row as Record<string, unknown>)[key]
      }
      return picked
    }
    return row
  })

  mockPrisma = {
    user: {
      findUnique: mockUserFindUnique,
    },
    $transaction: jest.fn(async (fn: any) => fn(mockCreateTx())),
  }
  return { prisma: mockPrisma }
})

import { claimDailyLogin, getDailyLoginStatus, isDailyLoginError } from '../dailyLogin/dailyLogin.service.js'

describe('dailyLogin.service', () => {
  beforeEach(() => {
    mockUsers.clear()
    mockLedgerRows.length = 0
    hookState.runBeforeUpdateMany = false
    mockPrisma.$transaction.mockClear()
    mockUsers.set('u1', {
      id: 'u1',
      chips: 1000,
      loginStreakCount: 0,
      lastLoginRewardDayKey: null,
      lastLoginRewardAt: null,
    })
  })

  it('retourne un statut claimable si rien n’est réclamé aujourd’hui', async () => {
    const status = await getDailyLoginStatus('u1')
    expect(status.claimedToday).toBe(false)
    expect(status.nextAction).toBe('CLAIM_TODAY')
    expect(status.nextDayIndex).toBe(1)
    expect(status.nextReward).toBe(100)
  })

  it('crédite une seule fois et écrit une trace ledger', async () => {
    const claimed = await claimDailyLogin('u1')
    expect(claimed.rewardTokens).toBe(100)
    expect(claimed.streakCount).toBe(1)
    expect(claimed.chips).toBe(1100)
    expect(mockLedgerRows).toHaveLength(1)
    expect(mockLedgerRows[0]?.reason).toBe('DAILY_LOGIN_REWARD')
  })

  it('refuse un second claim le même jour', async () => {
    await claimDailyLogin('u1')

    try {
      await claimDailyLogin('u1')
      throw new Error('must fail')
    } catch (err) {
      expect(isDailyLoginError(err)).toBe(true)
      if (isDailyLoginError(err)) {
        expect(err.statusCode).toBe(409)
        expect(err.code).toBe('ALREADY_CLAIMED')
      }
    }

    expect(mockLedgerRows).toHaveLength(1)
  })

  it('protège aussi le cas race condition via updateMany atomique', async () => {
    hookState.runBeforeUpdateMany = true

    try {
      await claimDailyLogin('u1')
      throw new Error('must fail')
    } catch (err) {
      expect(isDailyLoginError(err)).toBe(true)
      if (isDailyLoginError(err)) {
        expect(err.statusCode).toBe(409)
        expect(err.code).toBe('ALREADY_CLAIMED')
      }
    }

    expect(mockLedgerRows).toHaveLength(0)
  })
})
