import type { Server } from 'socket.io'
import { activeGames } from '../shared/activeGames.js'
import {
  notifyTournamentTableFinished,
  type TournamentTableFinishAdvance,
} from './tournament.runtime.service.js'

/**
 * Après une table tournoi : persistance bracket + suppression `activeGames`.
 */
export async function onTournamentSingleSurvivor(
  io: Server,
  gameId: string,
  winnerUserId: string,
): Promise<TournamentTableFinishAdvance> {
  const advance = await notifyTournamentTableFinished(io, gameId, winnerUserId)
  await activeGames.delete(gameId)
  return advance
}
