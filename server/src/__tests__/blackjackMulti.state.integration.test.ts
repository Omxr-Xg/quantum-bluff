import express from 'express'
import request from 'supertest'

jest.mock('../middleware/auth.middleware.js', () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    ;(req as express.Request & { userId?: string }).userId = 'user-1'
    next()
  },
}))

jest.mock('../config/database.js', () => ({
  prisma: {
    blackjackRoom: { findFirst: jest.fn() },
    blackjackRoomSnapshot: { findUnique: jest.fn() },
    blackjackRoomSeat: { findFirst: jest.fn() },
  },
}))

jest.mock('../shared/blackjackStateStore.js', () => ({
  blackjackStateStore: {
    getTable: jest.fn(),
  },
}))

jest.mock('../shared/activeBlackjackGames.js', () => ({
  activeBlackjackGames: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    getSync: jest.fn(),
    sync: jest.fn(),
  },
}))

import { prisma } from '../config/database.js'
import { blackjackStateStore } from '../shared/blackjackStateStore.js'
import { activeBlackjackGames } from '../shared/activeBlackjackGames.js'
import blackjackMultiRoutes from '../routes/blackjackMulti.routes.js'

describe('blackjack multi state endpoint integration', () => {
  const app = express()
  app.use(express.json())
  app.use('/api/blackjack-tables', blackjackMultiRoutes)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns TABLE_RECOVERING when runtime missing but snapshot exists', async () => {
    ;(prisma.blackjackRoom.findFirst as jest.Mock).mockResolvedValue({
      id: 'room-1',
      status: 'PLAYING',
      gameId: 'game-1',
      hostId: 'host-1',
      visibility: 'PUBLIC',
    })
    ;(prisma.blackjackRoomSnapshot.findUnique as jest.Mock).mockResolvedValue({
      updatedAt: new Date(),
      version: 3,
    })
    ;(blackjackStateStore.getTable as jest.Mock).mockResolvedValue(null)
    ;(activeBlackjackGames.get as jest.Mock).mockReturnValue(undefined)

    const res = await request(app)
      .get('/api/blackjack-tables/game/game-1/state')
      .set('Authorization', 'Bearer test')

    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({
      code: 'TABLE_RECOVERING',
      error: 'TABLE_RECOVERING',
    })
  })

  it('returns TABLE_UNAVAILABLE (503) when runtime and snapshot are both missing', async () => {
    ;(prisma.blackjackRoom.findFirst as jest.Mock).mockResolvedValue({
      id: 'room-1',
      status: 'PLAYING',
      gameId: 'game-1',
      hostId: 'host-1',
      visibility: 'PUBLIC',
    })
    ;(prisma.blackjackRoomSnapshot.findUnique as jest.Mock).mockResolvedValue(null)
    ;(blackjackStateStore.getTable as jest.Mock).mockResolvedValue(null)
    ;(activeBlackjackGames.get as jest.Mock).mockReturnValue(undefined)

    const res = await request(app)
      .get('/api/blackjack-tables/game/game-1/state')
      .set('Authorization', 'Bearer test')

    expect(res.status).toBe(503)
    expect(res.body).toMatchObject({
      code: 'TABLE_UNAVAILABLE',
      error: 'TABLE_UNAVAILABLE',
    })
  })
})

