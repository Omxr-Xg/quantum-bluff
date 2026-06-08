import { apiUrl } from './apiBase'
import { getAuthItem } from './authStorage'

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

const AVAILABLE_PATHS = [
  '/api/gift-codes/available',
  '/api/auth/gift-codes/available',
]

const VALIDATE_PATHS = [
  '/api/gift-codes/validate',
  '/api/auth/gift-codes/validate',
]

function authHeaders(): HeadersInit {
  const token = getAuthItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/** Accepte un tableau brut ou `{ codes: [...] }` (réponse API normalisée). */
export function parseAvailableGiftCodesResponse(data: unknown): GiftCode[] {
  if (Array.isArray(data)) {
    return data as GiftCode[]
  }
  if (data && typeof data === 'object' && Array.isArray((data as { codes?: unknown }).codes)) {
    return (data as { codes: GiftCode[] }).codes
  }
  return []
}

async function fetchGiftCodesApi(
  method: 'GET' | 'POST',
  paths: string[],
  body?: { code: string },
): Promise<Response> {
  let last: Response | null = null
  for (const path of paths) {
    const res = await fetch(apiUrl(path), {
      method,
      headers: authHeaders(),
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    if (res.status !== 404) return res
    last = res
  }
  return last ?? new Response(null, { status: 404 })
}

export async function fetchAvailableGiftCodesFromApi(): Promise<GiftCode[] | null> {
  try {
    const response = await fetchGiftCodesApi('GET', AVAILABLE_PATHS)
    if (!response.ok) {
      console.error('[giftCodes] Available codes error:', response.status)
      return null
    }
    const data: unknown = await response.json()
    return parseAvailableGiftCodesResponse(data)
  } catch (error) {
    console.error('[giftCodes] Fetch available codes error:', error)
    return null
  }
}

export async function validateGiftCodeOnApi(code: string): Promise<unknown> {
  const response = await fetchGiftCodesApi('POST', VALIDATE_PATHS, { code })
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(error.error || 'Erreur lors de la validation')
  }
  return response.json()
}

export function giftCodeRewardLabel(
  code: Pick<GiftCode, 'usageType' | 'amount'>,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (code.usageType === 'PERCENTAGE_DISCOUNT') {
    return t('lobby.giftCodeRewardPercent', { value: code.amount })
  }
  if (code.usageType === 'FIXED_DISCOUNT') {
    return t('lobby.giftCodeRewardFixed', { value: code.amount })
  }
  return `+${code.amount}`
}
