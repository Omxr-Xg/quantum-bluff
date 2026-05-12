/**
 * Utilitaires client pour le système de recharge gratuite avec cooldown
 */

import { getAuthItem } from './authStorage'
import { apiUrl } from './apiBase'
import { updateUserBalance } from './userProfile'

/** À garder aligné avec `server/src/freeRecharge/freeRecharge.types.ts` (affichage UI). */
export const FREE_RECHARGE_AMOUNT = 500
export const FREE_RECHARGE_THRESHOLD = 1200
export const FREE_RECHARGE_COOLDOWN_HOURS = 4

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

/** Erreur renvoyée par l’API (4xx/5xx) avec message serveur. */
export class FreeRechargeApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    message: string,
  ) {
    super(message)
    this.name = 'FreeRechargeApiError'
  }
}

/**
 * Récupère le statut de la recharge gratuite depuis le serveur
 */
export async function fetchFreeRechargeStatus(): Promise<FreeRechargeStatus | null> {
  try {
    const token = getAuthItem('token')
    if (!token) {
      console.error('[freeRecharge] No token found')
      return null
    }

    const response = await fetch(apiUrl('/api/free-recharge/status'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      console.error('[freeRecharge] Status error:', response.status)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('[freeRecharge] Fetch status error:', error)
    return null
  }
}

/**
 * Effectue une recharge gratuite.
 * @throws FreeRechargeApiError si l’API renvoie une erreur (message affichable)
 */
export async function claimFreeRecharge(): Promise<FreeRechargeClaimResult> {
  const token = getAuthItem('token')
  if (!token) {
    throw new FreeRechargeApiError(401, 'NO_TOKEN', 'Connexion requise pour recharger.')
  }

  const response = await fetch(apiUrl('/api/free-recharge/claim'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  })

  const data = (await response.json().catch(() => ({}))) as {
    error?: string
    code?: string
    success?: boolean
    newBalance?: number
    addedAmount?: number
    nextRechargeAt?: string | null
    message?: string
  }

  if (!response.ok) {
    throw new FreeRechargeApiError(
      response.status,
      data.code,
      data.error || `Erreur ${response.status}`,
    )
  }

  const result = data as FreeRechargeClaimResult
  // Persiste tout de suite côté client : sans ça, le header (Layout) reste sur
  // l’ancien solde tant qu’un focus / navigation n’a pas déclenché un GET balance.
  if (typeof result.newBalance === 'number' && Number.isFinite(result.newBalance)) {
    updateUserBalance(result.newBalance)
  }
  return result
}
