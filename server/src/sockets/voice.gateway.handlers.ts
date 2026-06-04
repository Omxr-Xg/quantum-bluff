import type { Server, Socket } from 'socket.io'
import { prisma } from '../config/database.js'
import {
  areFriends,
  assertMayJoinVoiceChannel,
  isBlockedEitherWay,
} from '../voice/voiceAccess.service.js'
import {
  activateCall,
  createCall,
  endCall,
  getCall,
} from '../voice/voiceCall.service.js'
import {
  buildCallChannelId,
  buildTableChannelId,
  buildWaitingChannelId,
  parseVoiceChannelId,
  resolveChannelId,
} from '../voice/voiceChannelId.js'
import {
  canSendToListener,
  getBlockedUserIds,
  getFriendIdSet,
  normalizeVoiceAudience,
} from '../voice/voicePolicy.service.js'
import {
  addVoiceSocket,
  broadcastVoiceRoster,
  buildRosterForUser,
  emitPeerLeft,
  getVoiceChannel,
  getUserPrimaryChannel,
  migrateChannelParticipants,
  removeUserFromAllChannels,
  removeVoiceSocket,
  socketRoomKey,
} from '../voice/voiceSession.registry.js'
import type { VoiceMigrateHint } from '../voice/voice.types.js'

type VoiceSocket = Socket & { userId?: string; voiceChannelId?: string }

async function usernameFor(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  })
  return u?.username ?? 'Joueur'
}

async function leaveChannel(
  io: Server,
  socket: VoiceSocket,
  channelId: string,
): Promise<void> {
  const userId = socket.userId
  if (!userId) return
  socket.leave(socketRoomKey(channelId))
  if (socket.voiceChannelId === channelId) socket.voiceChannelId = undefined
  const removed = removeVoiceSocket(channelId, userId, socket.id)
  if (removed) {
    emitPeerLeft(io, channelId, userId)
    await broadcastVoiceRoster(io, channelId)
  }
  const parsed = parseVoiceChannelId(channelId)
  if (parsed?.kind === 'call') {
    const call = getCall(parsed.id)
    if (call) {
      const remaining = getVoiceChannel(channelId)
      if (!remaining || remaining.size === 0) endCall(parsed.id)
    }
  }
}

async function joinChannel(
  io: Server,
  socket: VoiceSocket,
  channelId: string,
  opts?: { replace?: boolean; migrateFrom?: string },
): Promise<void> {
  const userId = socket.userId
  if (!userId) return
  const parsed = parseVoiceChannelId(channelId)
  if (!parsed) {
    socket.emit('VOICE_ERROR', { code: 'INVALID_CHANNEL' })
    return
  }

  const access = await assertMayJoinVoiceChannel(socket, userId, parsed)
  if (!access.ok) {
    socket.emit('VOICE_ERROR', { code: access.code })
    return
  }

  const prior = getUserPrimaryChannel(userId)
  if (prior && prior !== channelId) {
    if (opts?.migrateFrom === prior) {
      await migrateChannelParticipants(io, prior, channelId)
      socket.voiceChannelId = channelId
      socket.emit('VOICE_ROSTER', await buildRosterForUser(channelId, userId))
      socket.emit('VOICE_ACTIVE', {
        channelId,
        channel: (await buildRosterForUser(channelId, userId)).channel,
      })
      return
    }
    if (opts?.replace !== false) {
      const oldSockets = io.sockets.adapter.rooms.get(socketRoomKey(prior))
      if (oldSockets) {
        for (const sid of oldSockets) {
          const s = io.sockets.sockets.get(sid) as VoiceSocket | undefined
          if (s?.userId === userId) await leaveChannel(io, s, prior)
        }
      }
      removeUserFromAllChannels(userId, channelId)
    }
  }

  const name = await usernameFor(userId)
  const prev = prior ? getVoiceChannel(prior)?.get(userId) : undefined
  await addVoiceSocket(channelId, userId, name, socket.id, { preserveSettings: prev })
  socket.join(socketRoomKey(channelId))
  socket.voiceChannelId = channelId

  if (parsed.kind === 'call') {
    activateCall(parsed.id)
  }

  const roster = await buildRosterForUser(channelId, userId)
  socket.emit('VOICE_ROSTER', roster)
  socket.emit('VOICE_ACTIVE', { channelId, channel: roster.channel })
  await broadcastVoiceRoster(io, channelId)
}

export function registerVoiceGatewayHandlers(io: Server, socket: VoiceSocket): void {
  socket.on(
    'VOICE_JOIN',
    async (data: { channelId?: string; gameId?: string; replace?: boolean }) => {
      try {
        const channelId = resolveChannelId(data ?? {})
        if (!channelId) return
        await joinChannel(io, socket, channelId, { replace: data?.replace ?? true })
      } catch (err) {
        console.error('[voice] VOICE_JOIN', err)
      }
    },
  )

  socket.on(
    'VOICE_SWITCH',
    async (data: {
      channelId?: string
      gameId?: string
      mode?: 'continue' | 'replace'
      fromChannelId?: string
    }) => {
      try {
        const channelId = resolveChannelId(data ?? {})
        if (!channelId) return
        const mode = data?.mode ?? 'replace'
        const from =
          data?.fromChannelId ??
          socket.voiceChannelId ??
          getUserPrimaryChannel(socket.userId ?? '')
        if (mode === 'continue' && from && from !== channelId) {
          await joinChannel(io, socket, channelId, {
            replace: false,
            migrateFrom: from,
          })
          return
        }
        await joinChannel(io, socket, channelId, { replace: true })
      } catch (err) {
        console.error('[voice] VOICE_SWITCH', err)
      }
    },
  )

  socket.on('VOICE_LEAVE', async (data?: { channelId?: string; gameId?: string }) => {
    const channelId =
      resolveChannelId(data ?? {}) ?? socket.voiceChannelId ?? undefined
    if (!channelId) return
    await leaveChannel(io, socket, channelId)
    socket.emit('VOICE_ACTIVE', { channelId: null, channel: null })
  })

  socket.on(
    'VOICE_SETTINGS',
    async (data: {
      channelId?: string
      gameId?: string
      speakTo?: unknown
      listenTo?: unknown
      micMuted?: boolean
      soundMuted?: boolean
    }) => {
      try {
        const channelId =
          resolveChannelId(data ?? {}) ?? socket.voiceChannelId ?? undefined
        const userId = socket.userId
        if (!channelId || !userId) return
        const room = getVoiceChannel(channelId)
        const p = room?.get(userId)
        if (!p) return

        const speakTo = normalizeVoiceAudience(data.speakTo)
        const listenTo = normalizeVoiceAudience(data.listenTo)
        if (speakTo) p.speakTo = speakTo
        if (listenTo) p.listenTo = listenTo
        if (typeof data.micMuted === 'boolean') p.micMuted = data.micMuted
        if (typeof data.soundMuted === 'boolean') p.soundMuted = data.soundMuted
        if (p.micMuted) p.speaking = false

        await broadcastVoiceRoster(io, channelId)
      } catch (err) {
        console.error('[voice] VOICE_SETTINGS', err)
      }
    },
  )

  socket.on(
    'VOICE_PEER_MUTE',
    async (data: {
      channelId?: string
      gameId?: string
      targetUserId?: string
      muted?: boolean
    }) => {
      try {
        const channelId =
          resolveChannelId(data ?? {}) ?? socket.voiceChannelId ?? undefined
        const userId = socket.userId
        const target = data?.targetUserId
        if (!channelId || !userId || !target || target === userId) return
        const room = getVoiceChannel(channelId)
        const p = room?.get(userId)
        if (!p) return
        if (data.muted) p.peerMutes.add(target)
        else p.peerMutes.delete(target)
        await broadcastVoiceRoster(io, channelId)
      } catch (err) {
        console.error('[voice] VOICE_PEER_MUTE', err)
      }
    },
  )

  socket.on(
    'VOICE_SPEAKING',
    async (data?: { channelId?: string; gameId?: string; speaking?: boolean }) => {
      const channelId =
        resolveChannelId(data ?? {}) ?? socket.voiceChannelId ?? undefined
      const userId = socket.userId
      if (!channelId || !userId) return
      const room = getVoiceChannel(channelId)
      const p = room?.get(userId)
      if (!p) return
      p.speaking = Boolean(data?.speaking) && !p.micMuted
      await broadcastVoiceRoster(io, channelId)
    },
  )

  socket.on(
    'VOICE_SIGNAL',
    async (data: {
      channelId?: string
      gameId?: string
      toUserId?: string
      signal?: { type?: string; sdp?: unknown; candidate?: unknown }
    }) => {
      try {
        const channelId =
          resolveChannelId(data ?? {}) ?? socket.voiceChannelId ?? undefined
        const fromUserId = socket.userId
        const toUserId = data?.toUserId
        if (!channelId || !fromUserId || !toUserId || toUserId === fromUserId) return

        const parsed = parseVoiceChannelId(channelId)
        if (!parsed) return
        const access = await assertMayJoinVoiceChannel(socket, fromUserId, parsed)
        if (!access.ok) return

        const type = data.signal?.type
        if (type !== 'offer' && type !== 'answer' && type !== 'ice') return

        const room = getVoiceChannel(channelId)
        const speaker = room?.get(fromUserId)
        const target = room?.get(toUserId)
        if (!speaker || !target) return

        const speakerFriends = await getFriendIdSet(fromUserId)
        const blocked = await getBlockedUserIds(fromUserId)
        const listenerBlocked = await getBlockedUserIds(toUserId)
        if (blocked.has(toUserId) || listenerBlocked.has(fromUserId)) return

        if (
          !canSendToListener(fromUserId, toUserId, {
            speakerSpeakTo: speaker.speakTo,
            speakerMicMuted: speaker.micMuted,
            friendIds: speakerFriends,
            blockedIds: blocked,
          })
        ) {
          return
        }

        const gameId = parsed.kind === 'table' ? parsed.id : undefined
        for (const sid of target.socketIds) {
          io.to(sid).emit('VOICE_SIGNAL', {
            channelId,
            gameId,
            fromUserId,
            toUserId,
            signal: data.signal,
          })
        }
      } catch (err) {
        console.error('[voice] VOICE_SIGNAL', err)
      }
    },
  )

  socket.on(
    'VOICE_CALL_START',
    async (data: {
      targetUserIds?: string[]
      type?: 'private' | 'group'
    }) => {
      try {
        const userId = socket.userId
        if (!userId) return
        const targets = [...new Set((data?.targetUserIds ?? []).filter((id) => id && id !== userId))]
        const type = data?.type ?? (targets.length === 1 ? 'private' : 'group')
        if (targets.length === 0) return
        if (type === 'private' && targets.length !== 1) return

        for (const tid of targets) {
          if (!(await areFriends(userId, tid))) {
            socket.emit('VOICE_ERROR', { code: 'NOT_FRIENDS' })
            return
          }
          if (await isBlockedEitherWay(userId, tid)) {
            socket.emit('VOICE_ERROR', { code: 'BLOCKED' })
            return
          }
        }

        const prior = getUserPrimaryChannel(userId)
        if (prior && prior !== socket.voiceChannelId) {
          socket.emit('VOICE_CONFIRM_LEAVE', {
            currentChannelId: prior,
            pendingAction: { type: 'call', targetUserIds: targets },
          })
          return
        }

        const call = createCall({ type, creatorId: userId, memberIds: targets })
        const fromName = await usernameFor(userId)
        for (const tid of targets) {
          io.to(`user:${tid}`).emit('VOICE_CALL_INCOMING', {
            callId: call.callId,
            channelId: call.channelId,
            type: call.type,
            fromUserId: userId,
            fromUsername: fromName,
            memberIds: call.memberIds,
          })
        }
        await joinChannel(io, socket, call.channelId, { replace: true })
      } catch (err) {
        console.error('[voice] VOICE_CALL_START', err)
      }
    },
  )

  socket.on(
    'VOICE_CALL_RESPOND',
    async (data: {
      callId?: string
      action?: 'accept' | 'reject' | 'ignore' | 'block'
    }) => {
      try {
        const userId = socket.userId
        const callId = data?.callId
        const action = data?.action
        if (!userId || !callId || !action) return
        const call = getCall(callId)
        if (!call || !call.memberIds.includes(userId)) return

        const fromName = await usernameFor(userId)
        io.to(`user:${call.creatorId}`).emit('VOICE_CALL_RESPONSE', {
          callId,
          userId,
          username: fromName,
          action,
        })

        if (action === 'block') {
          await prisma.userBlock.upsert({
            where: { blockerId_blockedId: { blockerId: userId, blockedId: call.creatorId } },
            create: { blockerId: userId, blockedId: call.creatorId },
            update: {},
          })
        }

        if (action === 'accept') {
          const prior = getUserPrimaryChannel(userId)
          if (prior && prior !== call.channelId) {
            removeUserFromAllChannels(userId, call.channelId)
            if (socket.voiceChannelId && socket.voiceChannelId !== call.channelId) {
              await leaveChannel(io, socket, socket.voiceChannelId)
            }
          }
          await joinChannel(io, socket, call.channelId, { replace: true })
          activateCall(callId)
        } else if (action === 'reject' || action === 'block') {
          call.memberIds = call.memberIds.filter((id) => id !== userId)
          if (call.memberIds.length <= 1) endCall(callId)
        }
      } catch (err) {
        console.error('[voice] VOICE_CALL_RESPOND', err)
      }
    },
  )
}

export async function handleVoiceDisconnect(
  io: Server,
  socket: VoiceSocket,
): Promise<void> {
  const channelId = socket.voiceChannelId
  const userId = socket.userId
  if (!channelId || !userId) return
  await leaveChannel(io, socket, channelId)
}

/** Émis avec GAME_STARTED pour continuité waiting → table. */
export function voiceMigrateHintForGameStart(
  roomId: string,
  gameId: string,
): VoiceMigrateHint {
  return {
    fromChannelId: buildWaitingChannelId(roomId),
    toChannelId: buildTableChannelId(gameId),
    mode: 'continue',
  }
}

/** Émis avec GAME_ENDED (roomId) pour continuité table → waiting room. */
export function voiceMigrateHintForGameReturn(
  gameId: string,
  roomId: string,
): VoiceMigrateHint {
  return {
    fromChannelId: buildTableChannelId(gameId),
    toChannelId: buildWaitingChannelId(roomId),
    mode: 'continue',
  }
}

export function withVoiceMigrateOnRoomReturn<T extends { gameId?: string; roomId?: string }>(
  payload: T,
): T & { voiceMigrate?: VoiceMigrateHint } {
  if (payload.gameId && payload.roomId) {
    return {
      ...payload,
      voiceMigrate: voiceMigrateHintForGameReturn(payload.gameId, payload.roomId),
    }
  }
  return payload
}
