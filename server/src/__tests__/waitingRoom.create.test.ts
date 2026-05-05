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
      .send({ hostId: 'u1', roomName: 'Salle test', maxPlayers: 5, visibility: 'PUBLIC' })
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
  })

  test('returns 400 when hostId is missing', async () => {
    await request(app)
      .post('/api/waiting-room/create')
      .send({ roomName: 'Salle test' })
      .expect(400)
  })

  test('returns 404 when host user does not exist', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

    await request(app)
      .post('/api/waiting-room/create')
      .send({ hostId: 'missing-user', roomName: 'Salle test', maxPlayers: 4 })
      .expect(404)
  })

  test('returns 400 when maxPlayers is out of range', async () => {
    await request(app)
      .post('/api/waiting-room/create')
      .send({ hostId: 'u1', roomName: 'Salle test', maxPlayers: 6 })
      .expect(400)
  })
})
