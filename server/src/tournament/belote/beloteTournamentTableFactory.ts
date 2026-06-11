import { randomUUID } from 'node:crypto'
import { BeloteTableController } from '../../logic/belote/BeloteTableController.js'
import type { BeloteGameVariant } from '../../logic/belote/types.js'
import { activeBeloteGames } from '../../shared/activeBeloteGames.js'
import {
  BELOTE_TOURNAMENT_GAME_ID_PREFIX,
  beloteTournamentSnapshotRoomId,
} from './beloteTournament.constants.js'

export type BeloteTournamentSeatInput = {
  userId: string
  username: string
  position: number
  avatarUrl?: string | null
}

export function makeBeloteTournamentGameId(): string {
  return `${BELOTE_TOURNAMENT_GAME_ID_PREFIX}${randomUUID()}`
}

export async function createAndRegisterBeloteTournamentTable(params: {
  gameId: string
  tournamentId: string
  variant: BeloteGameVariant
  targetScore: number
  seats: BeloteTournamentSeatInput[]
}): Promise<BeloteTableController> {
  const table = new BeloteTableController({
    gameId: params.gameId,
    roomId: beloteTournamentSnapshotRoomId(params.gameId),
    variant: params.variant,
    targetScore: params.targetScore,
    buyIn: 0,
    players: params.seats.map((s) => ({
      userId: s.userId,
      username: s.username,
      position: s.position,
      avatarUrl: s.avatarUrl ?? null,
      isBot: false,
    })),
  })
  activeBeloteGames.set(params.gameId, table)
  return table
}
