import { randomUUID } from 'node:crypto'
import { CashGameController } from '../logic/CashGameController.js'
import { activeGames } from '../shared/activeGames.js'
import { TOURNAMENT_GAME_ID_PREFIX } from './tournament.constants.js'

export type TournamentSeatInput = {
  userId: string
  username: string
  initialStack: number
  avatarUrl?: string | null
}

export function makeTournamentGameId(): string {
  return `${TOURNAMENT_GAME_ID_PREFIX}${randomUUID()}`
}

/**
 * Instancie `CashGameController` tournoi et l’enregistre dans `activeGames` (démarre la 1re main).
 * La ligne `TournamentTable` doit déjà référencer ce `gameId` (mise à jour côté runtime).
 */
export async function createAndRegisterTournamentTable(params: {
  gameId: string
  tournamentId: string
  seats: TournamentSeatInput[]
  smallBlind: number
  bigBlind: number
  turbo?: boolean
}): Promise<CashGameController> {
  const maxSeats = 9
  const turnTimeoutMs = params.turbo ? 10_000 : 30_000
  const initial = params.seats[0]?.initialStack ?? 1000

  const ctrl = new CashGameController({
    id: params.gameId,
    roomId: params.tournamentId,
    maxSeats,
    smallBlind: params.smallBlind,
    bigBlind: params.bigBlind,
    defaultBuyIn: initial,
    turnTimeoutMs,
    walletLedger: 'none',
    stopWhenSingleSurvivor: true,
  })

  ctrl.initFromRoomPlayers(
    params.seats.map((s) => ({
      userId: s.userId,
      username: s.username,
      chips: s.initialStack,
      avatarUrl: s.avatarUrl ?? null,
    })),
  )

  await activeGames.set(params.gameId, ctrl)
  ctrl.startHand()
  return ctrl
}
