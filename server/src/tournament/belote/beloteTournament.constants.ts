export const BELOTE_TOURNAMENT_GAME_ID_PREFIX = 'game_belote_tournament_'

export function isBeloteTournamentGameId(gameId: string | null | undefined): boolean {
  return Boolean(gameId?.startsWith(BELOTE_TOURNAMENT_GAME_ID_PREFIX))
}

export function beloteTournamentSnapshotRoomId(gameId: string): string {
  return `belote-tour-snap-${gameId}`
}
