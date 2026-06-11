type ProgressRow = {
  id: string
  userId: string
  dayKey: string
  challengeCode: string
  progress: number
  goal: number
  completed: boolean
  claimed: boolean
  rewardTokens: number
  claimedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const mockProgressRows: ProgressRow[] = []
const mockUsers = new Map<string, { chips: number }>()
const mockLedgerRows: Array<{ userId: string; amount: number; reason: string; actionId?: string | null }> = []

function nowIsoDay(): string {
  return new Date().toISOString().slice(0, 10)
}

function mockCreateTx() {
  return {
    dailyChallengeProgress: {
      createMany: jest.fn(async ({ data }: any) => {
        let count = 0
        for (const create of data) {
          const existing = mockProgressRows.find(
            (r) =>
              r.userId === create.userId &&
              r.dayKey === create.dayKey &&
              r.challengeCode === create.challengeCode
          )
          if (existing) continue
          const row: ProgressRow = {
            id: `p_${mockProgressRows.length + 1}`,
            claimedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...create,
          }
          mockProgressRows.push(row)
          count += 1
        }
        return { count }
      }),
      findMany: jest.fn(async ({ where }: any) => {
        return mockProgressRows.filter((r) => {
          if (r.userId !== where.userId) return false
          if (where.dayKey != null && r.dayKey !== where.dayKey) return false
          return true
        })
      }),
      count: jest.fn(async ({ where }: any) => {
        return mockProgressRows.filter((r) => {
          if (r.userId !== where.userId) return false
          if (where.claimed === true && !r.claimed) return false
          if (where.dayKey?.gte && r.dayKey < where.dayKey.gte) return false
          if (where.dayKey?.lte && r.dayKey > where.dayKey.lte) return false
          if (where.challengeCode?.not && r.challengeCode === where.challengeCode.not) return false
          return true
        }).length
      }),
      findUnique: jest.fn(async ({ where }: any) => {
        const key = where.userId_dayKey_challengeCode
        return (
          mockProgressRows.find(
            (r) =>
              r.userId === key.userId &&
              r.dayKey === key.dayKey &&
              r.challengeCode === key.challengeCode
          ) ?? null
        )
      }),
      findUniqueOrThrow: jest.fn(async ({ where }: any) => {
        const key = where.userId_dayKey_challengeCode
        const row = mockProgressRows.find(
          (r) =>
            r.userId === key.userId &&
            r.dayKey === key.dayKey &&
            r.challengeCode === key.challengeCode
        )
        if (!row) throw new Error('row not found')
        return row
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const key = where.userId_dayKey_challengeCode
        const row = mockProgressRows.find(
          (r) =>
            r.userId === key.userId &&
            r.dayKey === key.dayKey &&
            r.challengeCode === key.challengeCode
        )
        if (!row) throw new Error('row not found')
        Object.assign(row, data, { updatedAt: new Date() })
        return row
      }),
    },
    user: {
      update: jest.fn(async ({ where, data }: any) => {
        const user = mockUsers.get(where.id) ?? { chips: 0 }
        user.chips += data.chips.increment
        mockUsers.set(where.id, user)
        return { chips: user.chips }
      }),
    },
    walletLedgerEntry: {
      create: jest.fn(async ({ data }: any) => {
        mockLedgerRows.push(data)
        return data
      }),
    },
    userBadge: {
      createMany: jest.fn(async () => ({ count: 0 })),
    },
  }
}

jest.mock('../dailyChallenges/dailyChallengeRotation.js', () => {
  const actual = jest.requireActual('../dailyChallenges/dailyChallengeRotation.js')
  return {
    ...actual,
    getCycleDayIndex: () => 1,
    getActiveChallengeCodesForDate: () => [
      'WIN_WITH_PAIR',
      'WIN_200_ROULETTE',
      'PLAY_5_TIMES',
      'WIN_200_SLOT',
    ],
  }
})

var mockPrisma: { $transaction: jest.Mock }
jest.mock('../config/database.js', () => {
  mockPrisma = {
    $transaction: jest.fn(async (fn: any) => fn(mockCreateTx())),
  }
  return { prisma: mockPrisma }
})

import {
  addRouletteNetWinProgress,
  claimDailyChallenge,
  getMyDailyChallenges,
  incrementMultiplayerPlayCount,
  isDailyChallengeError,
  markWinWithPair,
} from '../dailyChallenges/dailyChallenge.service.js'

describe('dailyChallenge.service', () => {
  beforeEach(() => {
    mockProgressRows.length = 0
    mockLedgerRows.length = 0
    mockUsers.clear()
    mockUsers.set('u1', { chips: 1000 })
    mockPrisma.$transaction.mockClear()
  })

  it('initialise les défis du jour courant + hebdo sur GET me', async () => {
    const payload = await getMyDailyChallenges('u1')
    expect(payload.dayKey).toBe(nowIsoDay())
    expect(payload.challenges.length).toBeGreaterThanOrEqual(4)
    expect(payload.cycleDay).toBeGreaterThanOrEqual(1)
    expect(payload.cycleDay).toBeLessThanOrEqual(7)
    expect(payload.weeklyChallenges.length).toBe(8)
    expect(payload.weeklyBonus.goal).toBe(5)
    expect(payload.weeklyBonus.badgeId).toBe('weekly_champion')
  })

  it('plafonne la progression roulette au goal', async () => {
    await getMyDailyChallenges('u1')
    const tx = mockCreateTx()
    await addRouletteNetWinProgress('u1', 500, tx as any)
    const row = mockProgressRows.find((r) => r.challengeCode === 'WIN_200_ROULETTE')
    expect(row?.progress).toBe(200)
    expect(row?.completed).toBe(true)
  })

  it('WIN_WITH_PAIR compte uniquement pour Paire', async () => {
    await getMyDailyChallenges('u1')
    const tx = mockCreateTx()
    await markWinWithPair('u1', 'Double paire', true, false, tx as any)
    await markWinWithPair('u1', 'Paire', true, false, tx as any)
    const row = mockProgressRows.find((r) => r.challengeCode === 'WIN_WITH_PAIR')
    expect(row?.progress).toBe(1)
    expect(row?.completed).toBe(true)
  })

  it('claim crédite une seule fois et écrit le ledger', async () => {
    await getMyDailyChallenges('u1')
    const tx = mockCreateTx()
    await incrementMultiplayerPlayCount('u1', false, tx as any)
    await incrementMultiplayerPlayCount('u1', false, tx as any)
    await incrementMultiplayerPlayCount('u1', false, tx as any)
    await incrementMultiplayerPlayCount('u1', false, tx as any)
    await incrementMultiplayerPlayCount('u1', false, tx as any)

    const claimed = await claimDailyChallenge('u1', 'PLAY_5_TIMES')
    expect(claimed.rewardTokens).toBe(500)
    expect(claimed.chips).toBe(1500)
    expect(mockLedgerRows).toHaveLength(1)
    expect(mockLedgerRows[0]?.reason).toBe('DAILY_CHALLENGE_REWARD')

    try {
      await claimDailyChallenge('u1', 'PLAY_5_TIMES')
      throw new Error('must fail')
    } catch (err) {
      expect(isDailyChallengeError(err)).toBe(true)
      if (isDailyChallengeError(err)) {
        expect(err.statusCode).toBe(409)
        expect(err.code).toBe('CHALLENGE_ALREADY_CLAIMED')
      }
    }
  })
})
