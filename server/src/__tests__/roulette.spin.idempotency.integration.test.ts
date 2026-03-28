import express from 'express'
import request from 'supertest'

jest.mock('../config/redis.config.js', () => ({
  __esModule: true,
  default: { set: jest.fn(), get: jest.fn(), del: jest.fn() },
  isRedisHealthy: jest.fn().mockResolvedValue(false),
}))

jest.mock('../middleware/auth.middleware.js', () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    ;(req as express.Request & { userId?: string }).userId = 'user-spin-test'
    next()
  },
}))

const mockPrismaTransaction = jest.fn()

jest.mock('../config/database.js', () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockPrismaTransaction(...args),
  },
}))

jest.mock('../casino/services/walletLedger.service.js', () => ({
  appendWalletLedgerEntry: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../logic/gamification.js', () => ({
  awardXpInTransaction: jest.fn().mockResolvedValue({
    experience: 10,
    level: 1,
    xpToNext: 100,
    newBadges: [] as string[],
  }),
  getEffectiveRouletteMaxPerLine: jest.fn().mockReturnValue(1000),
  getEffectiveRouletteMaxTotalStake: jest.fn().mockReturnValue(5000),
  levelFromExperience: jest.fn().mockReturnValue(1),
  XP_ROULETTE_SPIN: 1,
  XP_ROULETTE_WIN_BONUS: 1,
}))

import { __resetIdempotencyMemoryStoreForTests } from '../casino/services/idempotency.service.js'
import rouletteRoutes from '../routes/roulette.routes.js'

describe('POST /api/roulette/spin idempotency', () => {
  const app = express()
  app.use(express.json())
  app.use('/api/roulette', rouletteRoutes)

  const actionId = '11111111-1111-4111-8111-111111111111'
  const bets = [{ type: 'red' as const, amount: 10 }]
  const spinPayload = { bets, actionId, roundId: actionId }

  beforeEach(() => {
    __resetIdempotencyMemoryStoreForTests()
    mockPrismaTransaction.mockReset()
    mockPrismaTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        user: {
          findUnique: jest.fn().mockResolvedValue({ chips: 1000, experience: 0 }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          update: jest.fn().mockResolvedValue({ chips: 990 }),
          findUniqueOrThrow: jest.fn().mockResolvedValue({ experience: 10, level: 1 }),
        },
        casinoStats: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({}),
          update: jest.fn().mockResolvedValue({}),
        },
        walletLedgerEntry: { create: jest.fn().mockResolvedValue({}) },
      }
      return fn(tx)
    })
  })

  it('deux POST identiques : une seule transaction, même JSON résultat', async () => {
    const res1 = await request(app).post('/api/roulette/spin').send(spinPayload)
    expect(res1.status).toBe(200)
    expect(res1.body).toMatchObject({ actionId, result: expect.any(Number) })
    expect(mockPrismaTransaction).toHaveBeenCalledTimes(1)

    const res2 = await request(app).post('/api/roulette/spin').send(spinPayload)
    expect(res2.status).toBe(200)
    expect(res2.body.result).toBe(res1.body.result)
    expect(res2.body.chips).toBe(res1.body.chips)
    expect(mockPrismaTransaction).toHaveBeenCalledTimes(1)
  })

  it('même actionId et mises différentes : 409 IDEMPOTENCY_PAYLOAD_MISMATCH', async () => {
    await request(app).post('/api/roulette/spin').send(spinPayload)
    const res2 = await request(app)
      .post('/api/roulette/spin')
      .send({ ...spinPayload, bets: [{ type: 'black' as const, amount: 10 }] })
    expect(res2.status).toBe(409)
    expect(res2.body.code).toBe('IDEMPOTENCY_PAYLOAD_MISMATCH')
    expect(mockPrismaTransaction).toHaveBeenCalledTimes(1)
  })
})
