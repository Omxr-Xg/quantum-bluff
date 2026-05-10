import { env } from './env.js'

export function normalizeBalancePromoInput(code: string): string {
  return code.trim().toUpperCase()
}

export function isBalanceResetPromoCode(code: string): boolean {
  const expected = env.balanceResetPromoCode
  if (!expected) return false
  return normalizeBalancePromoInput(code) === expected
}
