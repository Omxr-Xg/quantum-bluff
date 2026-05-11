import type { Server, Socket } from 'socket.io'
import { activeGames } from '../shared/activeGames.js'
import { CashGameController } from '../logic/CashGameController.js'

let gameIo: Server | undefined

export function setGameIo(io: Server): void {
  gameIo = io
}

export function getGameIo(): Server | undefined {
  return gameIo
}

interface SocketWithUser extends Socket {
  userId?: string
}

/**
 * Réaligne les clients sur l’état cash en mémoire (ex. après pari caché prélevé sur le stack tapis).
 */
export async function broadcastCashGameState(gameId: string): Promise<void> {
  if (!gameIo) return
  const game = await activeGames.get(gameId)
  if (!(game instanceof CashGameController)) return
  const socketsInRoom = await gameIo.in(gameId).fetchSockets()
  for (const s of socketsInRoom) {
    const uid = (s as unknown as SocketWithUser).userId
    const isSpectator = !game.getPlayerState(uid ?? '')
    const snapshot = game.getSanitizedState(isSpectator ? undefined : uid, isSpectator)
    s.emit('GAME_UPDATE', snapshot)
    s.emit('GAME_STATE_UPDATED', snapshot)
  }
}
