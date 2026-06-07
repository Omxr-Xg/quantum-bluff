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

type RoomMemberCheck = {
  hostId: string
  visibility?: string
  memberIds: string[]
}

function isRoomMember(room: RoomMemberCheck, userId: string): boolean {
  return room.hostId === userId || room.memberIds.includes(userId)
}

async function hasAcceptedJoinRequest(roomId: string, userId: string): Promise<boolean> {
  const accepted = await prisma.joinRequest.findFirst({
    where: { roomId, userId, status: 'ACCEPTED' },
    select: { id: true },
  })
  return Boolean(accepted)
}

async function mayJoinPokerWaitingRoom(userId: string, roomId: string): Promise<boolean> {
  const room = await prisma.waitingRoom.findUnique({
    where: { id: roomId },
    select: {
      hostId: true,
      visibility: true,
      players: { select: { userId: true } },
    },
  })
  if (!room) return false
  const check: RoomMemberCheck = {
    hostId: room.hostId,
    visibility: room.visibility,
    memberIds: room.players.map((p) => p.userId),
  }
  if (isRoomMember(check, userId)) return true
  if (room.visibility === 'PUBLIC') return true
  return hasAcceptedJoinRequest(roomId, userId)
}

async function mayJoinBeloteWaitingRoom(userId: string, roomId: string): Promise<boolean> {
  const room = await prisma.beloteRoom.findUnique({
    where: { id: roomId },
    select: {
      hostId: true,
      visibility: true,
      seats: { select: { userId: true } },
    },
  })
  if (!room) return false
  const check: RoomMemberCheck = {
    hostId: room.hostId,
    visibility: room.visibility,
    memberIds: room.seats.map((s) => s.userId),
  }
  if (isRoomMember(check, userId)) return true
  if (room.visibility === 'PUBLIC') return true
  const accepted = await prisma.beloteJoinRequest.findFirst({
    where: { roomId, userId, status: 'ACCEPTED' },
    select: { id: true },
  })
  return Boolean(accepted)
}

async function mayJoinBlackjackWaitingRoom(userId: string, roomId: string): Promise<boolean> {
  const room = await prisma.blackjackRoom.findUnique({
    where: { id: roomId },
    select: {
      hostId: true,
      visibility: true,
      seats: { select: { userId: true } },
    },
  })
  if (!room) return false
  const check: RoomMemberCheck = {
    hostId: room.hostId,
    visibility: room.visibility,
    memberIds: room.seats.map((s) => s.userId),
  }
  if (isRoomMember(check, userId)) return true
  return room.visibility === 'PUBLIC'
}

async function mayJoinWaitingChannel(
  _socket: Socket,
  userId: string,
  roomId: string,
): Promise<boolean> {
  if (await mayJoinPokerWaitingRoom(userId, roomId)) return true
  if (await mayJoinBeloteWaitingRoom(userId, roomId)) return true
  if (await mayJoinBlackjackWaitingRoom(userId, roomId)) return true
  return false
}

async function mayJoinTableChannel(
  socket: Socket,
  userId: string,
  gameId: string,
): Promise<boolean> {
  if (socketMayUseTableVoice(socket, gameId)) return true

  const pokerRoom = await prisma.waitingRoom.findFirst({
    where: { gameId },
    select: {
      hostId: true,
      players: { select: { userId: true } },
    },
  })
  if (
    pokerRoom &&
    isRoomMember(
      {
        hostId: pokerRoom.hostId,
        memberIds: pokerRoom.players.map((p) => p.userId),
      },
      userId,
    )
  ) {
    return true
  }

  const beloteRoom = await prisma.beloteRoom.findFirst({
    where: { gameId },
    select: {
      hostId: true,
      seats: { select: { userId: true } },
    },
  })
  if (
    beloteRoom &&
    isRoomMember(
      {
        hostId: beloteRoom.hostId,
        memberIds: beloteRoom.seats.map((s) => s.userId),
      },
      userId,
    )
  ) {
    return true
  }

  const blackjackRoom = await prisma.blackjackRoom.findFirst({
    where: { gameId },
    select: {
      hostId: true,
      seats: { select: { userId: true } },
    },
  })
  if (
    blackjackRoom &&
    isRoomMember(
      {
        hostId: blackjackRoom.hostId,
        memberIds: blackjackRoom.seats.map((s) => s.userId),
      },
      userId,
    )
  ) {
    return true
  }

  return false
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
    if (!(await mayJoinTableChannel(socket, userId, parsed.id))) {
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
