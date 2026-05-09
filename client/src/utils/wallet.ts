import { apiUrl } from './apiBase'
import { getAuthItem } from './authStorage'

export interface WalletHistoryEntry {
  id: string
  amount: number
  reason: string
  balanceBefore: number | null
  balanceAfter: number | null
  createdAt: string
}

export interface WalletHistory {
  entries: WalletHistoryEntry[]
  total: number
  limit: number
  offset: number
}

export interface GiftCode {
  id: string
  code: string
  amount: number
  usageType: string
  type: string
  description: string | null
  expiresAt: string | null
  usedCount: number
  maxUses: number
}

export type PromoCodeValidationResult = {
  success: boolean
  message: string
  usageType: string
  // Réponse si code TOKENS
  newBalance?: number
  addedAmount?: number
  // Réponse si code FIXED_DISCOUNT ou PERCENTAGE_DISCOUNT
  discountType?: string
  discountValue?: number
  description?: string
}

export async function fetchWalletHistory(limit = 50, offset = 0): Promise<WalletHistory | null> {
  try {
    const token = getAuthItem('token')
    const response = await fetch(apiUrl(`/api/wallet/history?limit=${limit}&offset=${offset}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      console.error('[wallet] History error:', response.status)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('[wallet] Fetch history error:', error)
    return null
  }
}

export async function fetchAvailableGiftCodes(): Promise<GiftCode[] | null> {
  try {
    const token = getAuthItem('token')
    const response = await fetch(apiUrl('/api/gift-codes/available'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      console.error('[giftCodes] Available codes error:', response.status)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('[giftCodes] Fetch available codes error:', error)
    return null
  }
}

export async function validateGiftCode(code: string): Promise<PromoCodeValidationResult | null> {
  try {
    const token = getAuthItem('token')
    const response = await fetch(apiUrl('/api/gift-codes/validate'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erreur lors de la validation')
    }

    return await response.json()
  } catch (error: Error | unknown) {
    console.error('[giftCodes] Validate error:', error)
    throw error
  }
}
