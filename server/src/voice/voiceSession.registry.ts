import type { Server } from 'socket.io'
import { prisma } from '../config/database.js'
import type {
  VoiceChannelMeta,
  VoiceParticipant,
  VoiceParticipantPublic,
  VoiceRosterPayload,
} from './voice.types.js'
import {
  getBlockedUserIdsCached,
  getFriendIdSetCached,
} from './voiceSocialCache.js'
import {
  parseVoiceChannelId,
  type ParsedVoiceChannel,
} from './voiceChannelId.js'

const sessions = new Map<string, Map<string, VoiceParticipant>>()
/** Un seul canal vocal principal par utilisateur. */
const userPrimaryChannel = new Map<string, string>()

const channelMetaCache = new Map<
  string,
  { expiresAt: number; channel: VoiceChannelMeta; gameId?: string }
>()
const CHANNEL_META_TTL_MS = 120_000

const rosterBroadcastTimers = new Map<string, ReturnType<typeof setTimeout>>()
const ROSTER_BROADCAST_DEBOUNCE_MS = 80

function socketRoomKey(channelId: string): string {
  return `voice:${channelId}`
}

function toPublic(p: VoiceParticipant): VoiceParticipantPublic {
  return {
    userId: p.userId,
    username: p.username,
    speakTo: p.speakTo === 'TABLE' ? 'CHANNEL' : p.speakTo,
    listenTo: p.listenTo === 'TABLE' ? 'CHANNEL' : p.listenTo,
    micMuted: p.micMuted,
    soundMuted: p.soundMuted,
    peerMutes: [...p.peerMutes],
    speaking: p.speaking,
  }
}

export async function channelLabel(parsed: ParsedVoiceChannel): Promise<string> {
  if (parsed.kind === 'call') {
    return 'Appel vocal'
  }
  if (parsed.kind === 'table') {
    return `Table #${parsed.id.slice(0, 8)}`
  }
  if (parsed.kind === 'waiting') {
    const room = await prisma.waitingRoom.findUnique({
      where: { id: parsed.id },
      select: { name: true },
    })
    return room?.name ? `Waiting room ${room.name}` : `Waiting room`
  }
  return 'Vocal'
}

async function channelMetaFor(
  channelId: string,
  parsed: ParsedVoiceChannel | null,
): Promise<{ channel: VoiceChannelMeta; gameId?: string }> {
  const cached = channelMetaCache.get(channelId)
  if (cached && cached.expiresAt > Date.now()) {
    return { channel: cached.channel, gameId: cached.gameId }
  }
  const label = parsed ? await channelLabel(parsed) : 'Vocal'
  const channel: VoiceChannelMeta = {
    channelId,
    kind: parsed?.kind ?? 'table',
    label,
  }
  const gameId = parsed?.kind === 'table' ? parsed.id : undefined
  channelMetaCache.set(channelId, {
    expiresAt: Date.now() + CHANNEL_META_TTL_MS,
    channel,
    gameId,
  })
  return { channel, gameId }
}

export function getVoiceChannel(channelId: string): Map<string, VoiceParticipant> | undefined {
  return sessions.get(channelId)
}

export function getUserPrimaryChannel(userId: string): string | undefined {
  return userPrimaryChannel.get(userId)
}

export function getParticipantState(
  channelId: string,
  userId: string,
): VoiceParticipant | undefined {
  return sessions.get(channelId)?.get(userId)
}

export async function addVoiceSocket(
  channelId: string,
  userId: string,
  username: string,
  socketId: string,
  opts?: { preserveSettings?: VoiceParticipant },
): Promise<VoiceParticipant> {
  let room = sessions.get(channelId)
  if (!room) {
    room = new Map()
    sessions.set(channelId, room)
  }
  let p = room.get(userId)
  if (!p) {
    const prev = opts?.preserveSettings
    p = {
      userId,
      username,
      speakTo: prev?.speakTo ?? 'CHANNEL',
      listenTo: prev?.listenTo ?? 'CHANNEL',
      micMuted: prev?.micMuted ?? true,
      soundMuted: prev?.soundMuted ?? false,
      peerMutes: new Set(prev?.peerMutes ?? []),
      speaking: false,
      socketIds: new Set(),
    }
    room.set(userId, p)
  }
  p.socketIds.add(socketId)
  p.username = username
  userPrimaryChannel.set(userId, channelId)
  return p
}

export function removeVoiceSocket(
  channelId: string,
  userId: string,
  socketId: string,
): boolean {
  const room = sessions.get(channelId)
  if (!room) return false
  const p = room.get(userId)
  if (!p) return false
  p.socketIds.delete(socketId)
  p.speaking = false
  if (p.socketIds.size === 0) {
    room.delete(userId)
    if (room.size === 0) sessions.delete(channelId)
    if (userPrimaryChannel.get(userId) === channelId) {
      userPrimaryChannel.delete(userId)
    }
    return true
  }
  return false
}

export function removeUserFromAllChannels(userId: string, exceptChannelId?: string): string[] {
  const left: string[] = []
  for (const channelId of [...sessions.keys()]) {
    if (channelId === exceptChannelId) continue
    const room = sessions.get(channelId)
    const p = room?.get(userId)
    if (!p) continue
    room!.delete(userId)
    if (room!.size === 0) sessions.delete(channelId)
    if (userPrimaryChannel.get(userId) === channelId) {
      userPrimaryChannel.delete(userId)
    }
    left.push(channelId)
  }
  return left
}

export async function buildRosterForUser(
  channelId: string,
  userId: string,
): Promise<VoiceRosterPayload> {
  const parsed = parseVoiceChannelId(channelId)
  const room = sessions.get(channelId) ?? new Map()
  const [friendIds, blocked, meta] = await Promise.all([
    getFriendIdSetCached(userId),
    getBlockedUserIdsCached(userId),
    channelMetaFor(channelId, parsed),
  ])
  return {
    channelId,
    gameId: meta.gameId,
    channel: meta.channel,
    participants: [...room.values()].map(toPublic),
    friendIds: [...friendIds],
    blockedUserIds: [...blocked],
  }
}

export async function broadcastVoiceRoster(io: Server, channelId: string): Promise<void> {
  const room = sessions.get(channelId)
  if (!room || room.size === 0) return

  const parsed = parseVoiceChannelId(channelId)
  const participants = [...room.values()].map(toPublic)
  const meta = await channelMetaFor(channelId, parsed)
  const key = socketRoomKey(channelId)
  const userIds = [...room.keys()]

  const social = await Promise.all(
    userIds.map(async (uid) => {
      const [friendIds, blocked] = await Promise.all([
        getFriendIdSetCached(uid),
        getBlockedUserIdsCached(uid),
      ])
      return { uid, friendIds, blocked }
    }),
  )

  for (const { uid, friendIds, blocked } of social) {
    io.to(key).emit('VOICE_ROSTER', {
      channelId,
      gameId: meta.gameId,
      channel: meta.channel,
      participants,
      friendIds: [...friendIds],
      blockedUserIds: [...blocked],
    })
  }
}

/** Regroupe les mises à jour roster (évite des centaines de requêtes Prisma d’affilée). */
export function scheduleBroadcastVoiceRoster(io: Server, channelId: string): void {
  const prev = rosterBroadcastTimers.get(channelId)
  if (prev) clearTimeout(prev)
  const t = setTimeout(() => {
    rosterBroadcastTimers.delete(channelId)
    void broadcastVoiceRoster(io, channelId)
  }, ROSTER_BROADCAST_DEBOUNCE_MS)
  rosterBroadcastTimers.set(channelId, t)
  t.unref?.()
}

export function emitPeerLeft(
  io: Server,
  channelId: string,
  userId: string,
): void {
  const gameId =
    parseVoiceChannelId(channelId)?.kind === 'table'
      ? parseVoiceChannelId(channelId)!.id
      : undefined
  io.to(socketRoomKey(channelId)).emit('VOICE_PEER_LEFT', { channelId, gameId, userId })
}

export async function migrateChannelParticipants(
  io: Server,
  fromChannelId: string,
  toChannelId: string,
): Promise<void> {
  const from = sessions.get(fromChannelId)
  if (!from || from.size === 0) return

  let toRoom = sessions.get(toChannelId)
  if (!toRoom) {
    toRoom = new Map()
    sessions.set(toChannelId, toRoom)
  }

  for (const [uid, p] of from.entries()) {
    emitPeerLeft(io, fromChannelId, uid)
    toRoom.set(uid, {
      userId: p.userId,
      username: p.username,
      speakTo: p.speakTo,
      listenTo: p.listenTo,
      micMuted: p.micMuted,
      soundMuted: p.soundMuted,
      peerMutes: new Set(p.peerMutes),
      speaking: false,
      socketIds: new Set(p.socketIds),
    })
    userPrimaryChannel.set(uid, toChannelId)
    for (const sid of p.socketIds) {
      const sock = io.sockets.sockets.get(sid)
      if (!sock) continue
      sock.leave(socketRoomKey(fromChannelId))
      sock.join(socketRoomKey(toChannelId))
      ;(sock as { voiceChannelId?: string }).voiceChannelId = toChannelId
    }
  }

  sessions.delete(fromChannelId)
  await broadcastVoiceRoster(io, toChannelId)
}

export { socketRoomKey }
