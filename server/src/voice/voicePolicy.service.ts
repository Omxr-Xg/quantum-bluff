import { prisma } from '../config/database.js'
import type { VoiceAudience } from './voice.types.js'

export function normalizeVoiceAudience(raw: unknown): VoiceAudience | null {
  const v = typeof raw === 'string' ? raw.toUpperCase() : ''
  if (v === 'NOBODY') return 'NOBODY'
  if (v === 'FRIENDS') return 'FRIENDS'
  if (v === 'CHANNEL' || v === 'TABLE') return 'CHANNEL'
  return null
}

export function isChannelWideAudience(mode: VoiceAudience): boolean {
  return mode === 'CHANNEL' || mode === 'TABLE'
}

export async function getFriendIdSet(userId: string): Promise<Set<string>> {
  const rows = await prisma.friendship.findMany({
    where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
    select: { user1Id: true, user2Id: true },
  })
  const set = new Set<string>()
  for (const f of rows) {
    set.add(f.user1Id === userId ? f.user2Id : f.user1Id)
  }
  return set
}

export async function getBlockedUserIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.userBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  })
  const set = new Set<string>()
  for (const r of rows) {
    set.add(r.blockerId === userId ? r.blockedId : r.blockerId)
  }
  return set
}

export function speakerAllowsListener(
  mode: VoiceAudience,
  listenerId: string,
  speakerFriendIds: Set<string>,
): boolean {
  if (mode === 'NOBODY') return false
  if (isChannelWideAudience(mode)) return true
  return speakerFriendIds.has(listenerId)
}

export function listenerAllowsSpeaker(
  mode: VoiceAudience,
  speakerId: string,
  listenerFriendIds: Set<string>,
): boolean {
  if (mode === 'NOBODY') return false
  if (isChannelWideAudience(mode)) return true
  return listenerFriendIds.has(speakerId)
}

export function canSendToListener(
  speakerId: string,
  listenerId: string,
  opts: {
    speakerSpeakTo: VoiceAudience
    speakerMicMuted: boolean
    friendIds: Set<string>
    blockedIds: Set<string>
  },
): boolean {
  if (speakerId === listenerId) return false
  if (opts.blockedIds.has(listenerId)) return false
  if (opts.speakerMicMuted) return false
  return speakerAllowsListener(opts.speakerSpeakTo, listenerId, opts.friendIds)
}
