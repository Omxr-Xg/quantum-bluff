/**
 * Utilitaires client pour le système de recharge gratuite avec cooldown
 */

import { getAuthItem } from './authStorage'

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

    const response = await fetch('/api/free-recharge/status', {
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
 * Effectue une recharge gratuite
 */
export async function claimFreeRecharge(): Promise<FreeRechargeClaimResult | null> {
  try {
    const token = getAuthItem('token')
    if (!token) {
      console.error('[freeRecharge] No token found')
      return null
    }

    const response = await fetch('/api/free-recharge/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      console.error('[freeRecharge] Claim error:', response.status)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('[freeRecharge] Claim error:', error)
    return null
  }
}
