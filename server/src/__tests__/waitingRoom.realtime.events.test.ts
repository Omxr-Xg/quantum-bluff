import express from 'express'
import request from 'supertest'

jest.mock('../config/database.js', () => {
  const prisma = {
    roomPlayer: {
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    waitingRoom: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  }
  return { prisma }
})

import waitingRoomRoutes from '../routes/waitingRoom.routes.js'
import { prisma } from '../config/database.js'

describe('waiting room realtime events', () => {
  const ioEmit = jest.fn()
  const ioTo = jest.fn(() => ({ emit: ioEmit }))
  const ioMock = { to: ioTo }

  const app = express()
  app.use(express.json())
  app.set('io', ioMock)
  app.use('/api/waiting-room', waitingRoomRoutes)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('emits WAITING_ROOM_UPDATED after ready toggle', async () => {
    ;(prisma.roomPlayer.update as jest.Mock).mockResolvedValue({ isReady: true })
    ;(prisma.waitingRoom.findUnique as jest.Mock).mockResolvedValue({
      id: 'room-1',
      name: 'Room 1',
      hostId: 'u1',
      maxPlayers: 5,
      visibility: 'PUBLIC',
      status: 'WAITING',
      players: [
        {
          isReady: true,
          position: 0,
          user: { id: 'u1', username: 'A', level: 1 },
        },
      ],
    })

    await request(app)
      .put('/api/waiting-room/room-1/ready')
      .send({ userId: 'u1', isReady: true })
      .expect(200)

    expect(ioTo).toHaveBeenCalledWith('room-1')
    expect(ioEmit).toHaveBeenCalledWith(
      'WAITING_ROOM_UPDATED',
      expect.objectContaining({ id: 'room-1', status: 'WAITING' })
    )
  })

  test('emits PLAYER_LEFT and WAITING_ROOM_UPDATED on leave', async () => {
    ;(prisma.roomPlayer.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })
    ;(prisma.waitingRoom.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        id: 'room-2',
        hostId: 'u1',
        players: [{ userId: 'u2' }],
      })
      .mockResolvedValueOnce({
        id: 'room-2',
        name: 'Room 2',
        hostId: 'u2',
        maxPlayers: 5,
        visibility: 'PUBLIC',
        status: 'WAITING',
        players: [
          {
            isReady: false,
            position: 0,
            user: { id: 'u2', username: 'B', level: 1 },
          },
        ],
      })
    ;(prisma.waitingRoom.update as jest.Mock).mockResolvedValue({
      id: 'room-2',
      hostId: 'u2',
    })

    await request(app)
      .post('/api/waiting-room/room-2/leave')
      .send({ userId: 'u1' })
      .expect(200)

    expect(ioEmit).toHaveBeenCalledWith('PLAYER_LEFT', {
      roomId: 'room-2',
      userId: 'u1',
      scope: 'WAITING_ROOM',
    })
    expect(ioEmit).toHaveBeenCalledWith(
      'WAITING_ROOM_UPDATED',
      expect.objectContaining({ id: 'room-2', status: 'WAITING' })
    )
  })
})
