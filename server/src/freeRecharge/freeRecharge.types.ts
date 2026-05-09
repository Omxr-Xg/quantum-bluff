/**
 * Types et interfaces pour le système de recharge gratuite avec cooldown
 */

export const FREE_RECHARGE_AMOUNT = 300 // Montant rechargé gratuitement (pour joueurs en difficulté)
export const FREE_RECHARGE_THRESHOLD = 400 // Seuil de jetons en dessous duquel la recharge est disponible
export const FREE_RECHARGE_COOLDOWN_HOURS = 4 // Cooldown en heures

export interface FreeRechargeStatus {
  canRecharge: boolean
  nextRechargeAt: string | null // ISO string, null si disponible immédiatement
  hoursUntilRecharge: number | null
  minutesUntilRecharge: number | null
  totalMinutesUntilRecharge: number | null
  lastRechargeAt: string | null
  message: string
}

export interface FreeRechargeClaimResult {
  success: boolean
  newBalance: number
  addedAmount: number
  nextRechargeAt: string | null
  message: string
}
