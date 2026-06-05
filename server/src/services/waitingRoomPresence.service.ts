import type { Server } from 'socket.io'

type SocketWithUser = { userId?: string; rooms: Set<string> }

function collectPresentUserIds(io: Server, roomName: string): string[] {
  const ids = new Set<string>()
  for (const [, socket] of io.sockets.sockets) {
    const s = socket as SocketWithUser
    if (!s.userId) continue
    if (!s.rooms.has(roomName)) continue
    ids.add(s.userId)
  }
  return [...ids]
}

/** Joueurs dont le socket est abonné à la salle d'attente poker (room socket = roomId). */
export function getWaitingRoomPresentUserIds(
  io: Server | undefined,
  roomId: string,
): string[] {
  if (!io?.sockets?.sockets) return []
  return collectPresentUserIds(io, roomId)
}
