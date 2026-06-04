import { randomUUID } from 'crypto'
import type { VoiceCallType } from './voice.types.js'
import { buildCallChannelId } from './voiceChannelId.js'

export type ActiveVoiceCall = {
  callId: string
  channelId: string
  type: VoiceCallType
  creatorId: string
  memberIds: string[]
  status: 'ringing' | 'active' | 'ended'
  createdAt: number
}

const calls = new Map<string, ActiveVoiceCall>()

export function getCall(callId: string): ActiveVoiceCall | undefined {
  return calls.get(callId)
}

export function getCallByChannel(channelId: string): ActiveVoiceCall | undefined {
  for (const c of calls.values()) {
    if (c.channelId === channelId) return c
  }
  return undefined
}

export function createCall(opts: {
  type: VoiceCallType
  creatorId: string
  memberIds: string[]
}): ActiveVoiceCall {
  const callId = randomUUID()
  const unique = [...new Set([opts.creatorId, ...opts.memberIds])]
  const call: ActiveVoiceCall = {
    callId,
    channelId: buildCallChannelId(callId),
    type: opts.type,
    creatorId: opts.creatorId,
    memberIds: unique,
    status: 'ringing',
    createdAt: Date.now(),
  }
  calls.set(callId, call)
  return call
}

export function activateCall(callId: string): void {
  const c = calls.get(callId)
  if (c) c.status = 'active'
}

export function endCall(callId: string): void {
  calls.delete(callId)
}

export function addCallMember(callId: string, userId: string): void {
  const c = calls.get(callId)
  if (!c) return
  if (!c.memberIds.includes(userId)) c.memberIds.push(userId)
}
