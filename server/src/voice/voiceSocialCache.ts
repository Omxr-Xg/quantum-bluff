import { env } from '../config/env.js'
import { getBlockedUserIds, getFriendIdSet } from './voicePolicy.service.js'

const TTL_MS = env.voiceSocialCacheTtlMs

type CacheEntry<T> = { expiresAt: number; value: T }

const friendCache = new Map<string, CacheEntry<Set<string>>>()
const blockedCache = new Map<string, CacheEntry<Set<string>>>()

function readCache<T>(map: Map<string, CacheEntry<T>>, userId: string): T | undefined {
  const hit = map.get(userId)
  if (!hit || hit.expiresAt <= Date.now()) {
    map.delete(userId)
    return undefined
  }
  return hit.value
}

function writeCache<T>(map: Map<string, CacheEntry<T>>, userId: string, value: T): void {
  map.set(userId, { expiresAt: Date.now() + TTL_MS, value })
}

export async function getFriendIdSetCached(userId: string): Promise<Set<string>> {
  const cached = readCache(friendCache, userId)
  if (cached) return cached
  const ids = await getFriendIdSet(userId)
  writeCache(friendCache, userId, ids)
  return ids
}

export async function getBlockedUserIdsCached(userId: string): Promise<Set<string>> {
  const cached = readCache(blockedCache, userId)
  if (cached) return cached
  const ids = await getBlockedUserIds(userId)
  writeCache(blockedCache, userId, ids)
  return ids
}

/** Après blocage / amitié — invalider les deux utilisateurs concernés. */
export function invalidateVoiceSocialCache(userId?: string): void {
  if (userId) {
    friendCache.delete(userId)
    blockedCache.delete(userId)
    return
  }
  friendCache.clear()
  blockedCache.clear()
}
