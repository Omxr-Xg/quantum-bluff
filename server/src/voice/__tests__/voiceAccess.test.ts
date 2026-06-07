jest.mock('../../config/database.js', () => {
  const prisma = {
    waitingRoom: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    beloteRoom: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    blackjackRoom: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    joinRequest: { findFirst: jest.fn() },
    beloteJoinRequest: { findFirst: jest.fn() },
    friendship: { findFirst: jest.fn() },
    userBlock: { findFirst: jest.fn() },
  }
  return { prisma }
})

jest.mock('../voiceCall.service.js', () => ({
  getCall: jest.fn(),
}))

import type { Socket } from 'socket.io'
import { prisma } from '../../config/database.js'
import {
  assertMayJoinVoiceChannel,
  socketMayUseTableVoice,
} from '../voiceAccess.service.js'

function mockSocket(rooms: string[] = []): Socket {
  const set = new Set(rooms)
  return {
    rooms: {
      has: (r: string) => set.has(r),
    },
  } as unknown as Socket
}

describe('voiceAccess.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('socketMayUseTableVoice', () => {
    it('accepts poker, belote and blackjack socket rooms', () => {
      expect(socketMayUseTableVoice(mockSocket(['g1']), 'g1')).toBe(true)
      expect(socketMayUseTableVoice(mockSocket(['belote-game:g2']), 'g2')).toBe(true)
      expect(socketMayUseTableVoice(mockSocket(['blackjack:g3']), 'g3')).toBe(true)
      expect(socketMayUseTableVoice(mockSocket(), 'g1')).toBe(false)
    })
  })

  describe('assertMayJoinVoiceChannel — waiting', () => {
    it('allows belote waiting room members', async () => {
      ;(prisma.waitingRoom.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.beloteRoom.findUnique as jest.Mock).mockResolvedValue({
        hostId: 'host',
        visibility: 'PRIVATE',
        seats: [{ userId: 'u1' }],
      })
      ;(prisma.blackjackRoom.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await assertMayJoinVoiceChannel(
        mockSocket(),
        'u1',
        { kind: 'waiting', id: 'belote-room-1', channelId: 'waiting:belote-room-1' },
      )
      expect(result).toEqual({ ok: true })
    })

    it('rejects when user is not in any waiting room', async () => {
      ;(prisma.waitingRoom.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.beloteRoom.findUnique as jest.Mock).mockResolvedValue({
        hostId: 'host',
        visibility: 'PRIVATE',
        seats: [],
      })
      ;(prisma.blackjackRoom.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.beloteJoinRequest.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await assertMayJoinVoiceChannel(
        mockSocket(),
        'stranger',
        { kind: 'waiting', id: 'belote-room-1', channelId: 'waiting:belote-room-1' },
      )
      expect(result).toEqual({ ok: false, code: 'NOT_IN_WAITING_ROOM' })
    })
  })

  describe('assertMayJoinVoiceChannel — table', () => {
    it('allows table join via DB when socket has not joined game room yet', async () => {
      ;(prisma.waitingRoom.findFirst as jest.Mock).mockResolvedValue({
        hostId: 'host',
        players: [{ userId: 'u1' }],
      })

      const result = await assertMayJoinVoiceChannel(
        mockSocket(),
        'u1',
        { kind: 'table', id: 'game-1', channelId: 'table:game-1' },
      )
      expect(result).toEqual({ ok: true })
    })

    it('rejects table join when socket and DB have no membership', async () => {
      ;(prisma.waitingRoom.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.beloteRoom.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.blackjackRoom.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await assertMayJoinVoiceChannel(
        mockSocket(),
        'u1',
        { kind: 'table', id: 'game-1', channelId: 'table:game-1' },
      )
      expect(result).toEqual({ ok: false, code: 'NOT_IN_GAME' })
    })
  })
})
