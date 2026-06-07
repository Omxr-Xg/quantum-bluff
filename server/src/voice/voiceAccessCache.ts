import type { Socket } from 'socket.io'
import { assertMayJoinVoiceChannel } from './voiceAccess.service.js'
import type { ParsedVoiceChannel } from './voiceChannelId.js'

type AccessResult = { ok: true } | { ok: false; code: string }

const OK_TTL_MS = 90_000
const DENY_TTL_MS = 20_000

type CacheEntry = { expiresAt: number; value: AccessResult }

const cache = new Map<string, CacheEntry>()
const inFlight = new Map<string, Promise<AccessResult>>()

function cacheKey(userId: string, channelId: string): string {
  return `${userId}:${channelId}`
}

function readCache(key: string): AccessResult | undefined {
  const hit = cache.get(key)
  if (!hit || hit.expiresAt <= Date.now()) {
    cache.delete(key)
    return undefined
  }
  return hit.value
}

function writeCache(key: string, value: AccessResult): void {
  const ttl = value.ok ? OK_TTL_MS : DENY_TTL_MS
  cache.set(key, { expiresAt: Date.now() + ttl, value })
}

export function invalidateVoiceAccessCache(userId?: string, channelId?: string): void {
  if (!userId && !channelId) {
    cache.clear()
    inFlight.clear()
    return
  }
  const exactKey = userId && channelId ? cacheKey(userId, channelId) : null
  for (const key of [...cache.keys(), ...inFlight.keys()]) {
    const match =
      (exactKey !== null && key === exactKey) ||
      (userId !== undefined && channelId === undefined && key.startsWith(`${userId}:`))
    if (match) {
      cache.delete(key)
      inFlight.delete(key)
    }
  }
}

export async function assertMayJoinVoiceChannelCached(
  socket: Socket,
  userId: string,
  parsed: ParsedVoiceChannel,
): Promise<AccessResult> {
  const key = cacheKey(userId, parsed.channelId)
  const cached = readCache(key)
  if (cached) return cached

  const pending = inFlight.get(key)
  if (pending) return pending

  const promise = assertMayJoinVoiceChannel(socket, userId, parsed)
    .then((result) => {
      writeCache(key, result)
      return result
    })
    .finally(() => {
      inFlight.delete(key)
    })

  inFlight.set(key, promise)
  return promise
}
