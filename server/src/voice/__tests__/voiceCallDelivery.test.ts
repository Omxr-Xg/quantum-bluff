import type { Server } from 'socket.io'
import { emitVoiceEventToUser, flushPendingIncomingCalls } from '../voiceCallDelivery.js'
import {
  createCall,
  drainPendingIncomingCalls,
  endCall,
  getCall,
} from '../voiceCall.service.js'

function mockIo(roomSizes: Record<string, number> = {}) {
  const emitted: Array<{ room?: string; event: string; payload: unknown }> = []
  const io = {
    to: (room: string) => ({
      emit: (event: string, payload: unknown) => {
        emitted.push({ room, event, payload })
      },
    }),
    sockets: {
      adapter: {
        rooms: {
          get: (room: string) => {
            const size = roomSizes[room] ?? 0
            return size > 0 ? new Set(Array.from({ length: size }, (_, i) => `sid-${i}`)) : undefined
          },
        },
      },
      sockets: {
        values: () => [][Symbol.iterator](),
      },
    },
  } as unknown as Server
  return { io, emitted }
}

describe('voiceCallDelivery', () => {
  it('queues incoming call when user room is empty', () => {
    const call = createCall({ type: 'private', creatorId: 'a', memberIds: ['b'] })
    const { io } = mockIo()
    const payload = {
      callId: call.callId,
      channelId: call.channelId,
      type: 'private' as const,
      fromUserId: 'a',
      fromUsername: 'Alice',
      memberIds: call.memberIds,
    }

    emitVoiceEventToUser(io, 'b', 'VOICE_CALL_INCOMING', payload)

    const pending = drainPendingIncomingCalls('b')
    expect(pending).toHaveLength(1)
    expect(pending[0]?.callId).toBe(call.callId)
    endCall(call.callId)
  })

  it('flushes pending ringing calls on reconnect', () => {
    const call = createCall({ type: 'private', creatorId: 'a', memberIds: ['b'] })
    const payload = {
      callId: call.callId,
      channelId: call.channelId,
      type: 'private' as const,
      fromUserId: 'a',
      fromUsername: 'Alice',
      memberIds: call.memberIds,
    }
    const { io: ioEmpty } = mockIo()
    emitVoiceEventToUser(ioEmpty, 'b', 'VOICE_CALL_INCOMING', payload)

    const { io, emitted } = mockIo({ 'user:b': 1 })
    flushPendingIncomingCalls(io, 'b')

    expect(emitted.some((e) => e.event === 'VOICE_CALL_INCOMING' && e.room === 'user:b')).toBe(true)
    expect(getCall(call.callId)?.status).toBe('ringing')
    endCall(call.callId)
  })
})
