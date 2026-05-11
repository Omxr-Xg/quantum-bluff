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

  test('when host leaves alone, deletes room and emits WAITING_ROOM_UPDATED null', async () => {
    ;(prisma.waitingRoom.findUnique as jest.Mock).mockResolvedValue({
      id: 'room-2',
      hostId: 'u1',
      players: [{ userId: 'u1' }],
    })
    ;(prisma.waitingRoom.delete as jest.Mock).mockResolvedValue({ id: 'room-2' })

    await request(app)
      .post('/api/waiting-room/room-2/leave')
      .send({ userId: 'u1' })
      .expect(200)

    expect(prisma.waitingRoom.delete).toHaveBeenCalledWith({ where: { id: 'room-2' } })
    expect(prisma.roomPlayer.deleteMany).not.toHaveBeenCalled()
    expect(ioEmit).toHaveBeenCalledWith('WAITING_ROOM_CLOSED_BY_HOST', { roomId: 'room-2' })
    expect(ioEmit).toHaveBeenCalledWith('WAITING_ROOM_UPDATED', null)
  })

  test('when host leaves with others, first remaining player becomes host', async () => {
    ;(prisma.waitingRoom.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        id: 'room-x',
        hostId: 'u1',
        players: [
          { userId: 'u1', position: 0 },
          { userId: 'u2', position: 1 },
          { userId: 'u3', position: 2 },
        ],
      })
      .mockResolvedValueOnce({
        id: 'room-x',
        name: 'Room X',
        hostId: 'u2',
        maxPlayers: 5,
        visibility: 'PUBLIC',
        status: 'WAITING',
        turbo: false,
        players: [
          {
            isReady: false,
            position: 1,
            avatarUrl: null,
            user: { id: 'u2', username: 'B', level: 1 },
          },
          {
            isReady: false,
            position: 2,
            avatarUrl: null,
            user: { id: 'u3', username: 'C', level: 1 },
          },
        ],
      })
    ;(prisma.roomPlayer.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })
    ;(prisma.waitingRoom.update as jest.Mock).mockResolvedValue({ id: 'room-x', hostId: 'u2' })

    const res = await request(app)
      .post('/api/waiting-room/room-x/leave')
      .send({ userId: 'u1' })
      .expect(200)

    expect(res.body).toEqual(
      expect.objectContaining({ newHostId: 'u2', hostTransferred: true })
    )
    expect(prisma.waitingRoom.delete).not.toHaveBeenCalled()
    expect(prisma.waitingRoom.update).toHaveBeenCalledWith({
      where: { id: 'room-x' },
      data: { hostId: 'u2' },
    })
    expect(ioEmit).toHaveBeenCalledWith('PLAYER_LEFT', {
      roomId: 'room-x',
      userId: 'u1',
      scope: 'WAITING_ROOM',
    })
    expect(ioEmit).toHaveBeenCalledWith(
      'WAITING_ROOM_UPDATED',
      expect.objectContaining({ id: 'room-x', hostId: 'u2', status: 'WAITING' })
    )
  })

  test('when a non-host leaves, emits PLAYER_LEFT and WAITING_ROOM_UPDATED', async () => {
    ;(prisma.waitingRoom.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        id: 'room-3',
        hostId: 'u1',
        players: [{ userId: 'u1' }, { userId: 'u2' }],
      })
      .mockResolvedValueOnce({
        id: 'room-3',
        hostId: 'u1',
        players: [{ userId: 'u1' }],
      })
      .mockResolvedValueOnce({
        id: 'room-3',
        name: 'Room 3',
        hostId: 'u1',
        maxPlayers: 5,
        visibility: 'PUBLIC',
        status: 'WAITING',
        players: [
          {
            isReady: false,
            position: 0,
            user: { id: 'u1', username: 'A', level: 1 },
          },
        ],
      })
    ;(prisma.roomPlayer.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })

    await request(app)
      .post('/api/waiting-room/room-3/leave')
      .send({ userId: 'u2' })
      .expect(200)

    expect(prisma.waitingRoom.delete).not.toHaveBeenCalled()
    expect(ioEmit).toHaveBeenCalledWith('PLAYER_LEFT', {
      roomId: 'room-3',
      userId: 'u2',
      scope: 'WAITING_ROOM',
    })
    expect(ioEmit).toHaveBeenCalledWith(
      'WAITING_ROOM_UPDATED',
      expect.objectContaining({ id: 'room-3', status: 'WAITING' })
    )
  })
})
