import type { VoiceCallType, VoiceIncomingCallPayload } from './voice.types.js'
import {
  createStoredCall,
  newNegotiationId,
  storeClearActiveCallForUsers,
  storeDeleteCall,
  storeGetActiveCallIdForUser,
  storeGetCall,
  storeGetCallByChannel,
  storeSaveCall,
  storeSetActiveCallForUsers,
  type StoredVoiceCall,
} from './voiceCallStore.js'

const PENDING_INCOMING_TTL_MS = 20_000

type PendingIncomingEntry = {
  payload: VoiceIncomingCallPayload
  expiresAt: number
}

const pendingIncomingByUser = new Map<string, PendingIncomingEntry[]>()

export type ActiveVoiceCall = StoredVoiceCall & {
  /** Alias historique — même valeur que callerId. */
  creatorId: string
}

function toActiveCall(stored: StoredVoiceCall): ActiveVoiceCall {
  return { ...stored, creatorId: stored.callerId }
}

/** Délai avant « non disponible » si personne ne décroche (appelant). */
export const VOICE_CALL_RING_TIMEOUT_MS = 15_000

export async function getCall(callId: string): Promise<ActiveVoiceCall | undefined> {
  const c = await storeGetCall(callId)
  return c ? toActiveCall(c) : undefined
}

export async function getCallByChannel(
  channelId: string,
): Promise<ActiveVoiceCall | undefined> {
  const c = await storeGetCallByChannel(channelId)
  return c ? toActiveCall(c) : undefined
}

export async function userHasActiveCall(userId: string): Promise<boolean> {
  const id = await storeGetActiveCallIdForUser(userId)
  if (!id) return false
  const call = await storeGetCall(id)
  return call != null && call.status !== 'ended'
}

export async function createCall(opts: {
  type: VoiceCallType
  creatorId: string
  memberIds: string[]
}): Promise<ActiveVoiceCall> {
  const call = createStoredCall({
    type: opts.type,
    creatorId: opts.creatorId,
    memberIds: opts.memberIds,
  })
  await storeSaveCall(call)
  await storeSetActiveCallForUsers(call.callId, call.memberIds)
  return toActiveCall(call)
}

export async function activateCall(callId: string): Promise<string | undefined> {
  const c = await storeGetCall(callId)
  if (!c) return undefined
  const negotiationId = newNegotiationId()
  c.status = 'active'
  c.negotiationId = negotiationId
  await storeSaveCall(c)
  await storeSetActiveCallForUsers(callId, c.memberIds)
  return negotiationId
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

export async function drainPendingIncomingCalls(
  userId: string,
): Promise<VoiceIncomingCallPayload[]> {
  const list = pendingIncomingByUser.get(userId)
  if (!list?.length) return []
  pendingIncomingByUser.delete(userId)
  const now = Date.now()
  const out: VoiceIncomingCallPayload[] = []
  for (const e of list) {
    if (e.expiresAt <= now) continue
    const call = await getCall(e.payload.callId)
    if (call != null && call.status === 'ringing') {
      out.push(e.payload)
    }
  }
  return out
}

export function clearPendingIncomingForCall(callId: string): void {
  for (const [userId, list] of pendingIncomingByUser.entries()) {
    const next = list.filter((e) => e.payload.callId !== callId)
    if (next.length === 0) pendingIncomingByUser.delete(userId)
    else pendingIncomingByUser.set(userId, next)
  }
}

export async function endCall(callId: string): Promise<void> {
  const c = await storeGetCall(callId)
  if (c) {
    await storeDeleteCall(callId, c.memberIds)
  }
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

export async function addCallMember(callId: string, userId: string): Promise<void> {
  const c = await storeGetCall(callId)
  if (!c) return
  if (!c.memberIds.includes(userId)) {
    c.memberIds.push(userId)
    await storeSaveCall(c)
    await storeSetActiveCallForUsers(callId, c.memberIds)
  }
}

export async function releaseCallLocks(callId: string): Promise<void> {
  const c = await storeGetCall(callId)
  if (c) await storeClearActiveCallForUsers(c.memberIds)
}

export async function removeCallMember(callId: string, userId: string): Promise<void> {
  const c = await storeGetCall(callId)
  if (!c) return
  c.memberIds = c.memberIds.filter((id) => id !== userId)
  await storeSaveCall(c)
  await storeSetActiveCallForUsers(callId, c.memberIds)
}
