import type { Server } from 'socket.io'

type SocketWithUser = { userId?: string; rooms: Set<string> }

function collectPresentUserIds(
  io: Server,
  roomName: string,
): string[] {
  const ids = new Set<string>()
  for (const [, socket] of io.sockets.sockets) {
    const s = socket as SocketWithUser
    if (!s.userId) continue
    if (!s.rooms.has(roomName)) continue
    ids.add(s.userId)
  }
  return [...ids]
}

/** Joueurs dont le socket est dans la salle d’attente belote. */
export async function getBeloteRoomPresentUserIds(
  io: Server | undefined,
  roomId: string,
): Promise<string[]> {
  if (!io) return []
  return collectPresentUserIds(io, `belote-room:${roomId}`)
}

/** Joueurs dont le socket suit la partie en cours. */
export async function getBeloteGamePresentUserIds(
  io: Server | undefined,
  gameId: string,
): Promise<string[]> {
  if (!io) return []
  return collectPresentUserIds(io, `belote-game:${gameId}`)
}
