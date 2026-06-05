import { randomUUID } from 'crypto'
import type { VoiceCallType, VoiceIncomingCallPayload } from './voice.types.js'
import { buildCallChannelId } from './voiceChannelId.js'

const PENDING_INCOMING_TTL_MS = 20_000

type PendingIncomingEntry = {
  payload: VoiceIncomingCallPayload
  expiresAt: number
}

const pendingIncomingByUser = new Map<string, PendingIncomingEntry[]>()

export type ActiveVoiceCall = {
  callId: string
  channelId: string
  type: VoiceCallType
  creatorId: string
  memberIds: string[]
  status: 'ringing' | 'active' | 'ended'
  createdAt: number
}

/** Délai avant « non disponible » si personne ne décroche (appelant). */
export const VOICE_CALL_RING_TIMEOUT_MS = 15_000

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

export function queuePendingIncomingCall(
  userId: string,
  payload: VoiceIncomingCallPayload,
): void {
  const now = Date.now()
  const list = (pendingIncomingByUser.get(userId) ?? []).filter((e) => e.expiresAt > now)
  if (!list.some((e) => e.payload.callId === payload.callId)) {
    list.push({ payload, expiresAt: now + PENDING_INCOMING_TTL_MS })
  }
  pendingIncomingByUser.set(userId, list)
}

export function drainPendingIncomingCalls(userId: string): VoiceIncomingCallPayload[] {
  const list = pendingIncomingByUser.get(userId)
  if (!list?.length) return []
  pendingIncomingByUser.delete(userId)
  const now = Date.now()
  return list
    .filter((e) => e.expiresAt > now)
    .map((e) => e.payload)
    .filter((payload) => {
      const call = getCall(payload.callId)
      return call != null && call.status === 'ringing'
    })
}

export function clearPendingIncomingForCall(callId: string): void {
  for (const [userId, list] of pendingIncomingByUser.entries()) {
    const next = list.filter((e) => e.payload.callId !== callId)
    if (next.length === 0) pendingIncomingByUser.delete(userId)
    else pendingIncomingByUser.set(userId, next)
  }
}

export function endCall(callId: string): void {
  calls.delete(callId)
  clearCallRingTimeout(callId)
  clearPendingIncomingForCall(callId)
}

const ringTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

export function scheduleCallRingTimeout(
  callId: string,
  ms: number,
  onTimeout: () => void,
): void {
  clearCallRingTimeout(callId)
  const t = setTimeout(() => {
    ringTimeouts.delete(callId)
    onTimeout()
  }, ms)
  ringTimeouts.set(callId, t)
  t.unref?.()
}

export function clearCallRingTimeout(callId: string): void {
  const t = ringTimeouts.get(callId)
  if (t) clearTimeout(t)
  ringTimeouts.delete(callId)
}

export function addCallMember(callId: string, userId: string): void {
  const c = calls.get(callId)
  if (!c) return
  if (!c.memberIds.includes(userId)) c.memberIds.push(userId)
}
