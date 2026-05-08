/**
 * Système de récompense de connexion quotidienne (daily login streak).
 *
 * Le joueur reçoit une récompense progressive chaque jour où il se connecte.
 * S'il rate un jour, son streak retombe à 1 (il recommence).
 *
 * Mapping jour -> récompense (en jetons) :
 *   J1 = 100, J2 = 150, J3 = 200, J4 = 300, J5 = 400, J6 = 500, J7 = 1000
 *
 * Au-delà du 7e jour, la série se réinitialise à 1 (cycle hebdomadaire).
 */
export const DAILY_LOGIN_CYCLE_LENGTH = 7

export const DAILY_LOGIN_REWARDS: Readonly<number[]> = [
  100, // jour 1
  150, // jour 2
  200, // jour 3
  300, // jour 4
  400, // jour 5
  500, // jour 6
  1000, // jour 7 (gros bonus de fin de semaine)
] as const

/**
 * Renvoie la récompense (en jetons) associée à un numéro de jour donné.
 * Pour day = 1..7. Si la valeur est hors-borne on cycle modulo 7.
 */
export function rewardForDay(day: number): number {
  const safeDay = Math.max(1, Math.floor(day))
  // 1..7 -> index 0..6 ; 8 -> jour 1 du cycle suivant
  const idx = ((safeDay - 1) % DAILY_LOGIN_CYCLE_LENGTH + DAILY_LOGIN_CYCLE_LENGTH) % DAILY_LOGIN_CYCLE_LENGTH
  return DAILY_LOGIN_REWARDS[idx] ?? 0
}

export type DailyLoginStatus = {
  /** Jour ISO (YYYY-MM-DD UTC) courant. */
  dayKey: string
  /** Numéro du jour dans la série courante (0 = pas encore de série, 1..7 = position). */
  streakCount: number
  /** Vrai si la récompense d'aujourd'hui est déjà récupérée. */
  claimedToday: boolean
  /** Si la prochaine ouverture serait : reset (série cassée), continue (j+1) ou claim (j courant). */
  nextAction: 'CLAIM_TODAY' | 'ALREADY_CLAIMED'
  /** Numéro du jour qui sera attribué quand l'utilisateur cliquera "Récupérer" (pour anticiper l'UI). */
  nextDayIndex: number
  /** Récompense qui sera versée si le joueur clique "Récupérer" maintenant. */
  nextReward: number
  /** Tableau complet des récompenses (pour afficher la grille des 7 jours). */
  rewards: ReadonlyArray<number>
}

export type DailyLoginClaimResult = {
  dayKey: string
  streakCount: number
  rewardTokens: number
  chips: number
  /** Vrai si la série a été réinitialisée à 1 (le joueur avait raté un jour). */
  reset: boolean
}
