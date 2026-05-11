/** Préfixe obligatoire des `gameId` créés pour les tables tournoi (hidden bets / wallet off). */
export const TOURNAMENT_GAME_ID_PREFIX = 'game_tournament_' as const

export function isTournamentGameId(gameId: string): boolean {
  return gameId.startsWith(TOURNAMENT_GAME_ID_PREFIX)
}
