import type { Socket } from 'socket.io-client'
import type { CallSignalPayload, CallSignalType } from './voiceCallTypes'

export class VoiceSignalingClient {
  constructor(private socket: Socket) {}

  emitSignal(opts: {
    callId: string
    channelId: string
    negotiationId: string
    toUserId: string
    type: CallSignalType
    sdp?: RTCSessionDescriptionInit
    candidate?: RTCIceCandidateInit
  }): void {
    this.socket.emit('VOICE_SIGNAL', {
      callId: opts.callId,
      channelId: opts.channelId,
      negotiationId: opts.negotiationId,
      toUserId: opts.toUserId,
      signal: {
        type: opts.type,
        sdp: opts.sdp,
        candidate: opts.candidate,
      },
    })
  }
}

export function isCallSignalPayload(
  payload: unknown,
  myUserId: string,
): payload is CallSignalPayload {
  if (!payload || typeof payload !== 'object') return false
  const p = payload as CallSignalPayload
  return (
    typeof p.channelId === 'string' &&
    p.channelId.startsWith('call:') &&
    typeof p.fromUserId === 'string' &&
    typeof p.toUserId === 'string' &&
    p.toUserId === myUserId &&
    typeof p.negotiationId === 'string' &&
    p.signal != null &&
    typeof p.signal.type === 'string'
  )
}
