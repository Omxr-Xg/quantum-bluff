import express from 'express'
import request from 'supertest'

jest.mock('../config/database.js', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
    waitingRoom: {
      create: jest.fn(),
    },
  }
  return { prisma }
})

jest.mock('../middleware/auth.middleware.js', () => ({
  authMiddleware: (req: express.Request & { userId?: string }, res: express.Response, next: express.NextFunction) => {
    const userId = req.headers['x-test-user-id']
    if (typeof userId !== 'string' || !userId) {
      return res.status(401).json({ error: 'Non authentifié' })
    }
    req.userId = userId
    next()
  },
}))

import waitingRoomRoutes from '../routes/waitingRoom.routes.js'
import { prisma } from '../config/database.js'

describe('waiting room create route', () => {
  const app = express()
  app.use(express.json())
  app.use('/api/waiting-room', waitingRoomRoutes)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('creates a waiting room with valid payload', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u1',
      username: 'Host',
    })
    ;(prisma.waitingRoom.create as jest.Mock).mockResolvedValue({
      id: 'room-1',
      name: 'Salle test',
      hostId: 'u1',
      maxPlayers: 5,
      visibility: 'PUBLIC',
      status: 'WAITING',
      turbo: false,
      players: [
        {
          isReady: false,
          position: 0,
          avatarUrl: null,
          user: { id: 'u1', username: 'Host', level: 3 },
        },
      ],
    })

    const response = await request(app)
      .post('/api/waiting-room/create')
      .set('x-test-user-id', 'u1')
      .send({ hostId: 'attacker', roomName: 'Salle test', maxPlayers: 5, visibility: 'PUBLIC' })
      .expect(200)

    expect(response.body).toEqual(
      expect.objectContaining({
        id: 'room-1',
        hostId: 'u1',
        maxPlayers: 5,
        visibility: 'PUBLIC',
        players: expect.any(Array),
      })
    )
    expect(prisma.waitingRoom.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          hostId: 'u1',
          players: expect.objectContaining({
            create: expect.objectContaining({ userId: 'u1' }),
          }),
        }),
      }),
    )
  })

  test('returns 401 when authentication is missing', async () => {
    await request(app)
      .post('/api/waiting-room/create')
      .send({ roomName: 'Salle test' })
      .expect(401)
  })

  test('returns 404 when host user does not exist', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

    await request(app)
      .post('/api/waiting-room/create')
      .set('x-test-user-id', 'missing-user')
      .send({ hostId: 'missing-user', roomName: 'Salle test', maxPlayers: 4 })
      .expect(404)
  })

  test('returns 400 when maxPlayers is out of range', async () => {
    await request(app)
      .post('/api/waiting-room/create')
      .set('x-test-user-id', 'u1')
      .send({ hostId: 'u1', roomName: 'Salle test', maxPlayers: 6 })
      .expect(400)
  })

  test('uses default room name when roomName is only whitespace', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u1',
      username: 'Host',
    })
    ;(prisma.waitingRoom.create as jest.Mock).mockResolvedValue({
      id: 'room-2',
      name: 'Salle de Host',
      hostId: 'u1',
      maxPlayers: 5,
      visibility: 'PUBLIC',
      status: 'WAITING',
      turbo: false,
      players: [
        {
          isReady: false,
          position: 0,
          avatarUrl: null,
          user: { id: 'u1', username: 'Host', level: 1 },
        },
      ],
    })

    await request(app)
      .post('/api/waiting-room/create')
      .set('x-test-user-id', 'u1')
      .send({ hostId: 'u1', roomName: '   \t  ', maxPlayers: 5, visibility: 'PUBLIC' })
      .expect(200)

    expect(prisma.waitingRoom.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Salle de Host' }),
      })
    )
  })
})
