import type { Server, Socket } from 'socket.io'
import { rootLogger } from '../observability/logger.js'
import type { VoiceIncomingCallPayload } from './voice.types.js'
import {
  drainPendingIncomingCalls,
  queuePendingIncomingCall,
} from './voiceCall.service.js'

export type { VoiceIncomingCallPayload }

type VoiceSocket = Socket & { userId?: string }

function userRoomSize(io: Server, userId: string): number {
  return io.sockets.adapter.rooms.get(`user:${userId}`)?.size ?? 0
}

function emitDirectToUserSockets(
  io: Server,
  userId: string,
  event: string,
  payload: unknown,
): number {
  let count = 0
  for (const sock of io.sockets.sockets.values()) {
    if ((sock as VoiceSocket).userId === userId) {
      sock.emit(event, payload)
      count += 1
    }
  }
  return count
}

/** Cible `user:{id}` + repli sur les sockets authentifiés si la room est vide (race reconnect). */
export function emitVoiceEventToUser(
  io: Server,
  userId: string,
  event: string,
  payload: unknown,
): void {
  io.to(`user:${userId}`).emit(event, payload)
  const inRoom = userRoomSize(io, userId)
  if (inRoom > 0) return

  const direct = emitDirectToUserSockets(io, userId, event, payload)
  if (direct > 0) {
    rootLogger.debug({
      msg: 'voice_emit_direct_fallback',
      userId,
      event,
      direct,
    })
    return
  }

  if (event === 'VOICE_CALL_INCOMING') {
    queuePendingIncomingCall(userId, payload as VoiceIncomingCallPayload)
    rootLogger.info({
      msg: 'voice_incoming_queued_offline',
      userId,
      callId: (payload as VoiceIncomingCallPayload).callId,
    })
  }
}

/** À appeler après `JOIN_USER_ROOM` / connexion — délivre les appels manqués récents. */
export async function flushPendingIncomingCalls(io: Server, userId: string): Promise<void> {
  const pending = await drainPendingIncomingCalls(userId)
  for (const payload of pending) {
    io.to(`user:${userId}`).emit('VOICE_CALL_INCOMING', payload)
    emitDirectToUserSockets(io, userId, 'VOICE_CALL_INCOMING', payload)
    rootLogger.debug({
      msg: 'voice_incoming_flushed',
      userId,
      callId: payload.callId,
    })
  }
}
