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
      upsert: jest.fn(async ({ where, create }: any) => {
        const key = where.userId_dayKey_challengeCode
        const existing = mockProgressRows.find(
          (r) =>
            r.userId === key.userId &&
            r.dayKey === key.dayKey &&
            r.challengeCode === key.challengeCode
        )
        if (existing) return existing
        const row: ProgressRow = {
          id: `p_${mockProgressRows.length + 1}`,
          claimedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...create,
        }
        mockProgressRows.push(row)
        return row
      }),
      findMany: jest.fn(async ({ where }: any) => {
        return mockProgressRows.filter((r) => r.userId === where.userId && r.dayKey === where.dayKey)
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
  }
}

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

  it('initialise les 4 challenges fixes sur GET me', async () => {
    const payload = await getMyDailyChallenges('u1')
    expect(payload.dayKey).toBe(nowIsoDay())
    expect(payload.challenges).toHaveLength(4)
    expect(payload.challenges.map((c) => c.code)).toEqual([
      'WIN_WITH_PAIR',
      'WIN_200_ROULETTE',
      'PLAY_5_TIMES',
      'WIN_200_SLOT',
    ])
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
    await markWinWithPair('u1', 'Double paire', true, tx as any)
    await markWinWithPair('u1', 'Paire', true, tx as any)
    const row = mockProgressRows.find((r) => r.challengeCode === 'WIN_WITH_PAIR')
    expect(row?.progress).toBe(1)
    expect(row?.completed).toBe(true)
  })

  it('claim crédite une seule fois et écrit le ledger', async () => {
    await getMyDailyChallenges('u1')
    const tx = mockCreateTx()
    await incrementMultiplayerPlayCount('u1', tx as any)
    await incrementMultiplayerPlayCount('u1', tx as any)
    await incrementMultiplayerPlayCount('u1', tx as any)
    await incrementMultiplayerPlayCount('u1', tx as any)
    await incrementMultiplayerPlayCount('u1', tx as any)

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
