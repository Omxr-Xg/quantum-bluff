import type { Server } from 'socket.io'
import type { BeloteBotDifficulty } from '../../generated/prisma/index.js'
import { prisma } from '../../config/database.js'
import {
  beloteBotDisplayName,
  makeBeloteBotId,
  normalizeBeloteBotDifficulty,
} from '../../shared/beloteBots.js'
import { emitBeloteRoomUpdated } from './beloteRoomEvents.service.js'
import type { BeloteRoomSeatRow } from './beloteRoomFormat.js'

async function loadSeats(roomId: string): Promise<BeloteRoomSeatRow[]> {
  const seats = await prisma.beloteRoomSeat.findMany({
    where: { roomId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          level: true,
          avatarUrl: true,
          avatarHasBinary: true,
        },
      },
    },
    orderBy: { position: 'asc' },
  })
  return seats as BeloteRoomSeatRow[]
}

function nextFreePosition(seats: BeloteRoomSeatRow[]): number | null {
  const taken = new Set(seats.map((s) => s.position))
  for (let p = 0; p < 4; p++) {
    if (!taken.has(p)) return p
  }
  return null
}

export async function assertHostCanManageBots(
  roomId: string,
  userId: string,
): Promise<{ ok: true; room: { id: string; status: string; hostId: string; defaultBotDifficulty: BeloteBotDifficulty } } | { ok: false; status: number; error: string }> {
  const room = await prisma.beloteRoom.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      status: true,
      hostId: true,
      defaultBotDifficulty: true,
    },
  })
  if (!room) return { ok: false, status: 404, error: 'Salle introuvable' }
  if (room.hostId !== userId) {
    return { ok: false, status: 403, error: 'Seul l’hôte peut gérer les IA' }
  }
  if (room.status !== 'WAITING') {
    return { ok: false, status: 409, error: 'Partie déjà commencée' }
  }
  return { ok: true, room }
}

export async function addBeloteBotToRoom(
  roomId: string,
  hostUserId: string,
  difficultyRaw?: unknown,
  io?: Server,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const gate = await assertHostCanManageBots(roomId, hostUserId)
  if (!gate.ok) return gate

  const seats = await loadSeats(roomId)
  if (seats.length >= 4) {
    return { ok: false, status: 400, error: 'La table est déjà complète' }
  }

  const position = nextFreePosition(seats)
  if (position == null) {
    return { ok: false, status: 400, error: 'Aucune place libre' }
  }

  const difficulty = normalizeBeloteBotDifficulty(
    difficultyRaw ?? gate.room.defaultBotDifficulty,
  ) as BeloteBotDifficulty
  const botCount = seats.filter((s) => s.participantType === 'BOT').length

  await prisma.beloteRoomSeat.create({
    data: {
      roomId,
      participantType: 'BOT',
      botId: makeBeloteBotId(),
      displayName: beloteBotDisplayName(botCount),
      botDifficulty: difficulty,
      position,
      isReady: true,
    },
  })

  await emitBeloteRoomUpdated(roomId, io)
  return { ok: true }
}

export async function fillBeloteRoomWithBots(
  roomId: string,
  hostUserId: string,
  difficultyRaw?: unknown,
  io?: Server,
): Promise<{ ok: true; added: number } | { ok: false; status: number; error: string }> {
  const gate = await assertHostCanManageBots(roomId, hostUserId)
  if (!gate.ok) return gate

  let seats = await loadSeats(roomId)
  let added = 0
  const difficulty = difficultyRaw ?? gate.room.defaultBotDifficulty

  while (seats.length < 4) {
    const r = await addBeloteBotToRoom(roomId, hostUserId, difficulty, io)
    if (!r.ok) {
      if (added > 0) return { ok: true, added }
      return r
    }
    added++
    seats = await loadSeats(roomId)
  }

  return { ok: true, added }
}

export async function removeBeloteBotFromRoom(
  roomId: string,
  hostUserId: string,
  botId: string,
  io?: Server,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const gate = await assertHostCanManageBots(roomId, hostUserId)
  if (!gate.ok) return gate

  const seat = await prisma.beloteRoomSeat.findFirst({
    where: { roomId, botId, participantType: 'BOT' },
  })
  if (!seat) {
    return { ok: false, status: 404, error: 'IA introuvable' }
  }

  await prisma.beloteRoomSeat.delete({ where: { id: seat.id } })
  await emitBeloteRoomUpdated(roomId, io)
  return { ok: true }
}
