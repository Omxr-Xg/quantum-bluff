import type { BeloteGameVariant } from '../../generated/prisma/index.js'
import { normalizeBeloteVariant } from '../../logic/belote/beloteVariants.js'
import { normalizeBeloteBuyIn } from '../../logic/belote/beloteBuyIn.js'

export const BELOTE_TOURNAMENT_MIN_PLAYERS = 4
export const BELOTE_TOURNAMENT_MAX_PLAYERS = 16

const TARGET_SCORE_MIN = 500
const TARGET_SCORE_MAX = 2000
const START_AT_PAST_GRACE_MS = 15_000

export function normalizeBeloteTournamentMaxPlayers(raw: unknown): number {
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n) || n < BELOTE_TOURNAMENT_MIN_PLAYERS || n > BELOTE_TOURNAMENT_MAX_PLAYERS) {
    throw new Error(
      `Nombre de joueurs Belote : ${BELOTE_TOURNAMENT_MIN_PLAYERS} à ${BELOTE_TOURNAMENT_MAX_PLAYERS}, multiple de 4`,
    )
  }
  if (n % 4 !== 0) {
    throw new Error('Le nombre de joueurs Belote doit être un multiple de 4 (4, 8, 12 ou 16)')
  }
  return n
}

export function validateBeloteTournamentParams(input: {
  variant: unknown
  targetScore: unknown
  buyIn: unknown
  startAt: Date
}): { variant: BeloteGameVariant; targetScore: number; buyIn: number } {
  if (!(input.startAt instanceof Date) || Number.isNaN(input.startAt.getTime())) {
    throw new Error('Date de départ invalide')
  }
  if (input.startAt.getTime() < Date.now() - START_AT_PAST_GRACE_MS) {
    throw new Error('La date de départ doit être dans le futur')
  }
  let targetScore = Number(input.targetScore)
  if (!Number.isFinite(targetScore)) targetScore = 1000
  targetScore = Math.min(TARGET_SCORE_MAX, Math.max(TARGET_SCORE_MIN, Math.floor(targetScore)))
  const variant = normalizeBeloteVariant(input.variant) as BeloteGameVariant
  const buyIn = normalizeBeloteBuyIn(input.buyIn)
  return { variant, targetScore, buyIn }
}
