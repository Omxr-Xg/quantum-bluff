import { randomUUID } from 'crypto'
import type { Redis } from 'ioredis'
import type { VoiceCallType } from './voice.types.js'
import { buildCallChannelId } from './voiceChannelId.js'

export type StoredVoiceCall = {
  callId: string
  channelId: string
  type: VoiceCallType
  callerId: string
  memberIds: string[]
  status: 'ringing' | 'active' | 'ended'
  negotiationId?: string
  createdAt: number
  connectedAt?: number
  chatLogged?: boolean
}

const CALL_KEY_PREFIX = 'voice:call:'
const ACTIVE_USER_KEY_PREFIX = 'voice:call:active:'
const CALL_TTL_SEC = 86_400

type VoiceCallStoreBackend = {
  getCall(callId: string): Promise<StoredVoiceCall | null>
  getCallByChannel(channelId: string): Promise<StoredVoiceCall | null>
  saveCall(call: StoredVoiceCall): Promise<void>
  deleteCall(callId: string, memberIds: string[]): Promise<void>
  getActiveCallIdForUser(userId: string): Promise<string | null>
  setActiveCallForUsers(callId: string, userIds: string[]): Promise<void>
  clearActiveCallForUsers(userIds: string[]): Promise<void>
}

class MemoryVoiceCallStore implements VoiceCallStoreBackend {
  private calls = new Map<string, StoredVoiceCall>()
  private activeByUser = new Map<string, string>()

  async getCall(callId: string): Promise<StoredVoiceCall | null> {
    return this.calls.get(callId) ?? null
  }

  async getCallByChannel(channelId: string): Promise<StoredVoiceCall | null> {
    for (const c of this.calls.values()) {
      if (c.channelId === channelId) return c
    }
    return null
  }

  async saveCall(call: StoredVoiceCall): Promise<void> {
    this.calls.set(call.callId, call)
  }

  async deleteCall(callId: string, memberIds: string[]): Promise<void> {
    this.calls.delete(callId)
    for (const uid of memberIds) {
      if (this.activeByUser.get(uid) === callId) {
        this.activeByUser.delete(uid)
      }
    }
  }

  async getActiveCallIdForUser(userId: string): Promise<string | null> {
    return this.activeByUser.get(userId) ?? null
  }

  async setActiveCallForUsers(callId: string, userIds: string[]): Promise<void> {
    for (const uid of userIds) {
      this.activeByUser.set(uid, callId)
    }
  }

  async clearActiveCallForUsers(userIds: string[]): Promise<void> {
    for (const uid of userIds) {
      this.activeByUser.delete(uid)
    }
  }
}

class RedisVoiceCallStore implements VoiceCallStoreBackend {
  constructor(private redis: Redis) {}

  private callKey(callId: string): string {
    return `${CALL_KEY_PREFIX}${callId}`
  }

  private activeUserKey(userId: string): string {
    return `${ACTIVE_USER_KEY_PREFIX}${userId}`
  }

  async getCall(callId: string): Promise<StoredVoiceCall | null> {
    const raw = await this.redis.get(this.callKey(callId))
    if (!raw) return null
    try {
      return JSON.parse(raw) as StoredVoiceCall
    } catch {
      return null
    }
  }

  async getCallByChannel(channelId: string): Promise<StoredVoiceCall | null> {
    const callId = channelId.replace(/^call:/, '')
    if (!callId) return null
    return this.getCall(callId)
  }

  async saveCall(call: StoredVoiceCall): Promise<void> {
    await this.redis.set(
      this.callKey(call.callId),
      JSON.stringify(call),
      'EX',
      CALL_TTL_SEC,
    )
  }

  async deleteCall(callId: string, memberIds: string[]): Promise<void> {
    const pipe = this.redis.pipeline()
    pipe.del(this.callKey(callId))
    for (const uid of memberIds) {
      pipe.del(this.activeUserKey(uid))
    }
    await pipe.exec()
  }

  async getActiveCallIdForUser(userId: string): Promise<string | null> {
    return this.redis.get(this.activeUserKey(userId))
  }

  async setActiveCallForUsers(callId: string, userIds: string[]): Promise<void> {
    const pipe = this.redis.pipeline()
    for (const uid of userIds) {
      pipe.set(this.activeUserKey(uid), callId, 'EX', CALL_TTL_SEC)
    }
    await pipe.exec()
  }

  async clearActiveCallForUsers(userIds: string[]): Promise<void> {
    if (userIds.length === 0) return
    const pipe = this.redis.pipeline()
    for (const uid of userIds) {
      pipe.del(this.activeUserKey(uid))
    }
    await pipe.exec()
  }
}

let memoryBackend: MemoryVoiceCallStore | null = null

function getMemoryBackend(): MemoryVoiceCallStore {
  if (!memoryBackend) memoryBackend = new MemoryVoiceCallStore()
  return memoryBackend
}

let redisClient: Redis | null = null

/** Injecte le client Redis (appelé au boot ou en test). */
export function bindVoiceCallRedis(client: Redis | null): void {
  redisClient = client
}

function backend(): VoiceCallStoreBackend {
  if (redisClient) return new RedisVoiceCallStore(redisClient)
  return getMemoryBackend()
}

export async function storeGetCall(callId: string): Promise<StoredVoiceCall | null> {
  return backend().getCall(callId)
}

export async function storeGetCallByChannel(
  channelId: string,
): Promise<StoredVoiceCall | null> {
  return backend().getCallByChannel(channelId)
}

export async function storeSaveCall(call: StoredVoiceCall): Promise<void> {
  await backend().saveCall(call)
}

export async function storeDeleteCall(
  callId: string,
  memberIds: string[],
): Promise<void> {
  await backend().deleteCall(callId, memberIds)
}

export async function storeGetActiveCallIdForUser(userId: string): Promise<string | null> {
  return backend().getActiveCallIdForUser(userId)
}

export async function storeSetActiveCallForUsers(
  callId: string,
  userIds: string[],
): Promise<void> {
  await backend().setActiveCallForUsers(callId, userIds)
}

export async function storeClearActiveCallForUsers(userIds: string[]): Promise<void> {
  await backend().clearActiveCallForUsers(userIds)
}

export function createStoredCall(opts: {
  type: VoiceCallType
  creatorId: string
  memberIds: string[]
}): StoredVoiceCall {
  const callId = randomUUID()
  const unique = [...new Set([opts.creatorId, ...opts.memberIds])]
  return {
    callId,
    channelId: buildCallChannelId(callId),
    type: opts.type,
    callerId: opts.creatorId,
    memberIds: unique,
    status: 'ringing',
    createdAt: Date.now(),
  }
}

export function newNegotiationId(): string {
  return randomUUID()
}

/** Réinitialise le store mémoire (tests). */
export function resetVoiceCallStoreForTests(): void {
  memoryBackend = new MemoryVoiceCallStore()
  redisClient = null
}
