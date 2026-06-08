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

export type { GiftCode } from './giftCodesClient'

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

export { fetchAvailableGiftCodesFromApi as fetchAvailableGiftCodes } from './giftCodesClient'

export type TopUpPromoValidationResult = {
  valid: boolean
  /** Paiement fictif à 0 € + crédit des jetons choisis (code secret serveur). */
  freeCheckout?: boolean
}

/** Code promo réservé au faux paiement (effet défini uniquement côté API). */
export async function validateTopUpPromo(code: string): Promise<TopUpPromoValidationResult | null> {
  try {
    const token = getAuthItem('token')
    if (!token || !code.trim()) return { valid: false }
    const response = await fetch(apiUrl('/api/auth/validate-topup-promo'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: code.trim() }),
    })
    if (!response.ok) return { valid: false }
    return (await response.json()) as TopUpPromoValidationResult
  } catch (error) {
    console.error('[wallet] validateTopUpPromo error:', error)
    return { valid: false }
  }
}

export async function validateGiftCode(code: string): Promise<PromoCodeValidationResult | null> {
  try {
    const { validateGiftCodeOnApi } = await import('./giftCodesClient')
    return (await validateGiftCodeOnApi(code)) as PromoCodeValidationResult
  } catch (error: Error | unknown) {
    console.error('[giftCodes] Validate error:', error)
    throw error
  }
}

export type PaymentPromoResolution =
  | { kind: 'empty' }
  | { kind: 'free_checkout' }
  | { kind: 'discount'; discountType: 'FIXED_DISCOUNT' | 'PERCENTAGE_DISCOUNT'; discountValue: number }
  | { kind: 'tokens'; newBalance: number; message: string }

/** Valide un code promo de paiement (réduction ou jetons) — à appeler au blur ou à la confirmation. */
export async function resolvePaymentPromoCode(code: string): Promise<PaymentPromoResolution> {
  const trimmed = code.trim()
  if (!trimmed) return { kind: 'empty' }

  const top = await validateTopUpPromo(trimmed)
  if (top?.valid && top.freeCheckout) return { kind: 'free_checkout' }

  const result = await validateGiftCode(trimmed)
  if (!result?.success) {
    throw new Error(result?.message ?? 'Code invalide')
  }

  if (result.discountType) {
    return {
      kind: 'discount',
      discountType: result.discountType as 'FIXED_DISCOUNT' | 'PERCENTAGE_DISCOUNT',
      discountValue: result.discountValue ?? 0,
    }
  }

  if (typeof result.newBalance === 'number' && Number.isFinite(result.newBalance)) {
    return { kind: 'tokens', newBalance: result.newBalance, message: result.message }
  }

  return { kind: 'empty' }
}
