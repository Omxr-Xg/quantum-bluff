import type { PrismaClient } from '../generated/prisma/index.js'
import {
  applyChipsWinnerIfMissing,
  applyXpPlacementIfMissing,
  grantLedgerRow,
  grantTournamentRewardsIfMissing,
  xpForFinalRank,
} from '../tournament/tournament.reward.service.js'

describe('grantLedgerRow idempotence', () => {
  it('deuxième insert avec même clé unique → already', async () => {
    const keys = new Set<string>()
    const prismaMock = {
      tournamentRewardLedger: {
        create: async (args: {
          data: { tournamentId: string; userId: string; kind: string };
        }) => {
          const k = `${args.data.tournamentId}:${args.data.userId}:${args.data.kind}`
          if (keys.has(k)) {
            const err = new Error('Unique constraint')
            ;(err as { code?: string }).code = 'P2002'
            throw err
          }
          keys.add(k)
        },
      },
    }
    const row = {
      tournamentId: 't1',
      userId: 'u1',
      kind: 'CHIPS_WINNER' as const,
      chipsAmount: 100,
    }
    await expect(grantLedgerRow(prismaMock as never, row)).resolves.toBe('granted')
    await expect(grantLedgerRow(prismaMock as never, row)).resolves.toBe('already')
  })
})

describe('xpForFinalRank', () => {
  it('maps ranks to XP buckets', () => {
    expect(xpForFinalRank(1)).toBe(500)
    expect(xpForFinalRank(2)).toBe(400)
    expect(xpForFinalRank(3)).toBe(300)
    expect(xpForFinalRank(99)).toBe(50)
    expect(xpForFinalRank(null)).toBe(50)
  })
})

describe('applyXpPlacementIfMissing', () => {
  it('skips when xpDelta is 0', async () => {
    const prisma = { tournamentRewardLedger: { create: jest.fn() } }
    await applyXpPlacementIfMissing(prisma as never, 't1', 'u1', 0)
    expect(prisma.tournamentRewardLedger.create).not.toHaveBeenCalled()
  })

  it('updates user when ledger insert succeeds', async () => {
    const created = jest.fn().mockResolvedValue({})
    const findUnique = jest.fn().mockResolvedValue({ experience: 100 })
    const update = jest.fn().mockResolvedValue({})
    const prisma = {
      tournamentRewardLedger: { create: created },
      user: { findUnique, update },
    }
    await applyXpPlacementIfMissing(prisma as never, 't1', 'u1', 50)
    expect(created).toHaveBeenCalled()
    expect(update).toHaveBeenCalled()
  })
})

describe('applyChipsWinnerIfMissing', () => {
  it('returns already when amount <= 0', async () => {
    const prisma = { tournamentRewardLedger: { create: jest.fn() }, user: { update: jest.fn() } }
    await expect(
      applyChipsWinnerIfMissing(prisma as never, 't1', 'u1', 0),
    ).resolves.toBe('already')
    expect(prisma.tournamentRewardLedger.create).not.toHaveBeenCalled()
  })

  it('increments chips when ledger grants', async () => {
    const prisma = {
      tournamentRewardLedger: {
        create: jest.fn().mockResolvedValue({}),
      },
      user: {
        update: jest.fn().mockResolvedValue({}),
      },
    }
    await expect(
      applyChipsWinnerIfMissing(prisma as never, 't1', 'u1', 100),
    ).resolves.toBe('granted')
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: { chips: { increment: 100 } },
      }),
    )
  })
})

describe('grantTournamentRewardsIfMissing', () => {
  it('no-op when tournament missing or not completed', async () => {
    const prisma = {
      tournament: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(),
    }
    await grantTournamentRewardsIfMissing(prisma as unknown as PrismaClient, 'tid')
    expect(prisma.$transaction).not.toHaveBeenCalled()

    const prisma2 = {
      tournament: {
        findUnique: jest.fn().mockResolvedValue({
          status: 'REGISTRATION_OPEN',
          initialStack: 1000,
          players: [],
        }),
      },
      $transaction: jest.fn(),
    }
    await grantTournamentRewardsIfMissing(prisma2 as unknown as PrismaClient, 'tid')
    expect(prisma2.$transaction).not.toHaveBeenCalled()
  })

  it('runs transaction with XP and prize for completed tournament', async () => {
    const txCalls: unknown[] = []
    const prisma = {
      tournament: {
        findUnique: jest.fn().mockResolvedValue({
          status: 'COMPLETED',
          initialStack: 100,
          players: [
            { userId: 'a', finalRank: 1, status: 'WINNER' },
            { userId: 'b', finalRank: 2, status: 'ELIMINATED' },
          ],
        }),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<void>) => {
        const tx = {
          tournamentRewardLedger: { create: jest.fn().mockResolvedValue({}) },
          user: {
            findUnique: jest.fn().mockResolvedValue({ experience: 0 }),
            update: jest.fn().mockResolvedValue({}),
          },
        }
        txCalls.push(tx)
        await fn(tx)
      }),
    }
    await grantTournamentRewardsIfMissing(prisma as unknown as PrismaClient, 'tid')
    expect(prisma.$transaction).toHaveBeenCalled()
  })
})
