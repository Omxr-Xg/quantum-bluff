/** Taux de remboursement autorisés (% du gain brut prélevé pour le prêteur). */
export const ALLOWED_REPAYMENT_RATES = [10, 15, 20, 25, 30, 40, 50] as const

export type AllowedRepaymentRate = (typeof ALLOWED_REPAYMENT_RATES)[number]

const GRID: Record<number, number> = {
  10: 30,
  15: 24,
  20: 18,
  25: 14,
  30: 10,
  40: 7,
  50: 5,
}

export function isAllowedRepaymentRate(rate: number): rate is AllowedRepaymentRate {
  return (ALLOWED_REPAYMENT_RATES as readonly number[]).includes(rate)
}

/**
 * Intérêt annuel affiché / stocké (%) en fonction du taux de remboursement sur les gains.
 */
export function getInterestRate(repaymentRate: number): number {
  if (!isAllowedRepaymentRate(repaymentRate)) {
    throw new Error('INVALID_REPAYMENT_RATE')
  }
  return GRID[repaymentRate]!
}

/** Intérêt en jetons sur le principal (entier). */
export function interestChipsOnPrincipal(principal: number, interestRatePercent: number): number {
  return Math.floor((principal * interestRatePercent) / 100)
}

export function computeTotalDue(principal: number, interestRatePercent: number): number {
  return principal + interestChipsOnPrincipal(principal, interestRatePercent)
}

/** Part prélevée sur un gain brut pour le prêteur (plafonnée au restant dû). */
export function computeRepaymentSlice(
  grossWin: number,
  repaymentRatePercent: number,
  remainingAmount: number
): number {
  return Math.min(remainingAmount, Math.floor((grossWin * repaymentRatePercent) / 100))
}
