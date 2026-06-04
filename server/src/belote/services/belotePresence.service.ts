import type { Server } from 'socket.io'

/** Joueurs dont le socket est dans la salle d’attente belote. */
export async function getBeloteRoomPresentUserIds(
  io: Server | undefined,
  roomId: string,
): Promise<string[]> {
  if (!io) return []
  const sockets = await io.in(`belote-room:${roomId}`).fetchSockets()
  const ids = new Set<string>()
  for (const s of sockets) {
    const uid = (s as { userId?: string }).userId
    if (uid) ids.add(uid)
  }
  return [...ids]
}

/** Joueurs dont le socket suit la partie en cours. */
export async function getBeloteGamePresentUserIds(
  io: Server | undefined,
  gameId: string,
): Promise<string[]> {
  if (!io) return []
  const sockets = await io.in(`belote-game:${gameId}`).fetchSockets()
  const ids = new Set<string>()
  for (const s of sockets) {
    const uid = (s as { userId?: string }).userId
    if (uid) ids.add(uid)
  }
  return [...ids]
}
