import type { Socket } from 'socket.io'
import { prisma } from '../config/database.js'
import { getCall } from './voiceCall.service.js'
import {
  buildTableChannelId,
  parseVoiceChannelId,
  type ParsedVoiceChannel,
} from './voiceChannelId.js'

export function socketMayUseTableVoice(socket: Socket, gameId: string): boolean {
  if (!gameId || typeof gameId !== 'string') return false
  return (
    socket.rooms.has(gameId) ||
    socket.rooms.has(`belote-game:${gameId}`) ||
    socket.rooms.has(`blackjack:${gameId}`) ||
    socket.rooms.has(`blackjack-game:${gameId}`)
  )
}

async function mayJoinWaitingChannel(
  _socket: Socket,
  userId: string,
  roomId: string,
): Promise<boolean> {
  const room = await prisma.waitingRoom.findUnique({
    where: { id: roomId },
    select: {
      hostId: true,
      status: true,
      visibility: true,
      players: { select: { userId: true } },
    },
  })
  if (!room) return false
  const isMember =
    room.hostId === userId ||
    room.players.some((p) => p.userId === userId)
  if (isMember) return true
  if (room.visibility === 'PUBLIC') return true
  const accepted = await prisma.joinRequest.findFirst({
    where: { roomId, userId, status: 'ACCEPTED' },
    select: { id: true },
  })
  return Boolean(accepted)
}

async function mayJoinCallChannel(userId: string, callId: string): Promise<boolean> {
  const call = await getCall(callId)
  if (!call) return false
  if (!call.memberIds.includes(userId)) return false
  return call.status === 'active' || call.status === 'ringing'
}

export async function assertMayJoinVoiceChannel(
  socket: Socket,
  userId: string,
  parsed: ParsedVoiceChannel,
): Promise<{ ok: true } | { ok: false; code: string }> {
  if (parsed.kind === 'table') {
    if (!socketMayUseTableVoice(socket, parsed.id)) {
      return { ok: false, code: 'NOT_IN_GAME' }
    }
    return { ok: true }
  }
  if (parsed.kind === 'waiting') {
    if (!(await mayJoinWaitingChannel(socket, userId, parsed.id))) {
      return { ok: false, code: 'NOT_IN_WAITING_ROOM' }
    }
    return { ok: true }
  }
  if (parsed.kind === 'call') {
    if (!(await mayJoinCallChannel(userId, parsed.id))) {
      return { ok: false, code: 'NOT_IN_CALL' }
    }
    return { ok: true }
  }
  return { ok: false, code: 'INVALID_CHANNEL' }
}

export async function areFriends(userId: string, otherId: string): Promise<boolean> {
  const row = await prisma.friendship.findFirst({
    where: {
      OR: [
        { user1Id: userId, user2Id: otherId },
        { user1Id: otherId, user2Id: userId },
      ],
    },
    select: { id: true },
  })
  return Boolean(row)
}

export async function isBlockedEitherWay(
  userId: string,
  otherId: string,
): Promise<boolean> {
  const row = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: otherId },
        { blockerId: otherId, blockedId: userId },
      ],
    },
    select: { id: true },
  })
  return Boolean(row)
}

export function tableGameIdFromChannel(channelId: string): string | undefined {
  const p = parseVoiceChannelId(channelId)
  if (p?.kind === 'table') return p.id
  return undefined
}

export { buildTableChannelId }
