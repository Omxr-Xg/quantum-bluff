import { env } from './env.js'

export function normalizeBalancePromoInput(code: string): string {
  return code.trim().toUpperCase()
}

/** Code promo secret : paiement fictif offert + crédit du montant choisi (pas de remise du solde à zéro). */
export function isFreeTopupPromoCode(code: string): boolean {
  const expected = env.freeTopupPromoCode
  if (!expected) return false
  return normalizeBalancePromoInput(code) === expected
}
