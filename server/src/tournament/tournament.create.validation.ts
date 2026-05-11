const INITIAL_STACK_MIN = 100
const INITIAL_STACK_MAX = 100_000_000
const BLIND_MAX = 10_000_000
/** Tolérance horloge / soumission formulaire (ms) : startAt légèrement dans le passé accepté. */
const START_AT_PAST_GRACE_MS = 15_000

export const TOURNAMENT_MIN_PLAYERS = 4
export const TOURNAMENT_MAX_PLAYERS = 20

/**
 * Nombre de sièges tournoi (entier, plage fixe produit / bracket).
 */
export function normalizeTournamentMaxPlayers(raw: unknown): number {
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n) || n < TOURNAMENT_MIN_PLAYERS || n > TOURNAMENT_MAX_PLAYERS) {
    throw new Error(`Nombre de joueurs entre ${TOURNAMENT_MIN_PLAYERS} et ${TOURNAMENT_MAX_PLAYERS}`)
  }
  return n
}

/**
 * Paramètres de jeu / date pour la création d’un tournoi (hors nom, visibilité, code privé).
 * Lance une `Error` avec message en français si invalide.
 */
export function validateTournamentGameParams(input: {
  initialStack: number
  blindSmall: number
  blindBig: number
  startAt: Date
}): void {
  if (!(input.startAt instanceof Date) || Number.isNaN(input.startAt.getTime())) {
    throw new Error('Date de départ invalide')
  }
  const now = Date.now()
  if (input.startAt.getTime() < now - START_AT_PAST_GRACE_MS) {
    throw new Error('La date de départ doit être dans le futur')
  }
  if (!Number.isFinite(input.initialStack)) {
    throw new Error('Stack initiale invalide')
  }
  const stack = Math.floor(input.initialStack)
  if (stack < INITIAL_STACK_MIN || stack > INITIAL_STACK_MAX) {
    throw new Error(`Stack initiale entre ${INITIAL_STACK_MIN} et ${INITIAL_STACK_MAX}`)
  }
  if (!Number.isFinite(input.blindSmall) || !Number.isFinite(input.blindBig)) {
    throw new Error('Blinds invalides')
  }
  const sb = Math.floor(input.blindSmall)
  const bb = Math.floor(input.blindBig)
  if (sb < 1 || sb > BLIND_MAX) {
    throw new Error(`Petite blind entre 1 et ${BLIND_MAX}`)
  }
  if (bb < 1 || bb > BLIND_MAX) {
    throw new Error(`Grosse blind entre 1 et ${BLIND_MAX}`)
  }
  if (sb > bb) {
    throw new Error('La petite blind ne peut pas dépasser la grosse blind')
  }
}
