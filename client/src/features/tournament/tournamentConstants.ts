/** Aligné sur le serveur (`normalizeTournamentMaxPlayers`, `startTournamentFromDb`). */
export const TOURNAMENT_MIN_PLAYERS = 4;
export const TOURNAMENT_MAX_PLAYERS = 20;

/** Belote : 4 à 16 joueurs, multiple de 4. */
export const BELOTE_TOURNAMENT_MIN_PLAYERS = 4;
export const BELOTE_TOURNAMENT_MAX_PLAYERS = 16;
export const BELOTE_TOURNAMENT_PLAYER_OPTIONS = [4, 8, 12, 16] as const;
