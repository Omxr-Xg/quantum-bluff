import { env } from '../config/env.js'
import { prisma } from '../config/database.js'
import { clientAvatarUrlFromUser } from './userAvatarPublic.js'

export type CachedUserProfile = {
  userId: string
  username: string
  avatarUrl: string | null
}

type Entry = { expiresAt: number; value: CachedUserProfile }

const cache = new Map<string, Entry>()

export async function getCachedUserProfile(userId: string): Promise<CachedUserProfile> {
  const hit = cache.get(userId)
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value
  }

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, avatarUrl: true, avatarHasBinary: true },
  })
  const value: CachedUserProfile = u
    ? {
        userId: u.id,
        username: u.username,
        avatarUrl: clientAvatarUrlFromUser(u),
      }
    : { userId, username: 'Joueur', avatarUrl: null }

  cache.set(userId, { expiresAt: Date.now() + env.userProfileCacheTtlMs, value })
  return value
}

export function invalidateUserProfileCache(userId?: string): void {
  if (userId) cache.delete(userId)
  else cache.clear()
}
