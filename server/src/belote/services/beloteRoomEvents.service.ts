import type { Server } from 'socket.io'
import { prisma } from '../../config/database.js'
import { getBeloteRoomPresentUserIds } from './belotePresence.service.js'
import { formatBeloteRoom, type BeloteRoomRow } from './beloteRoomFormat.js'
import { getGameIo } from '../../sockets/gameIo.registry.js'

export async function loadBeloteRoomWithSeats(roomId: string) {
  return prisma.beloteRoom.findUnique({
    where: { id: roomId },
    include: {
      seats: {
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
      },
    },
  })
}

export async function emitBeloteRoomUpdated(
  roomId: string,
  io?: Server,
): Promise<void> {
  const socketIo = io ?? getGameIo()
  if (!socketIo) return
  const room = await loadBeloteRoomWithSeats(roomId)
  if (!room) {
    socketIo.to(`belote-room:${roomId}`).emit('BELOTE_ROOM_UPDATED', null)
    return
  }
  const presentUserIds = await getBeloteRoomPresentUserIds(socketIo, roomId)
  socketIo.to(`belote-room:${roomId}`).emit('BELOTE_ROOM_UPDATED', {
    ...formatBeloteRoom(room as BeloteRoomRow),
    presentUserIds,
  })
}
