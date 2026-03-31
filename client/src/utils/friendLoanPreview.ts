/** Aligné sur server/src/logic/friendLoan.interest.ts (aperçu UI uniquement). */
export const ALLOWED_LOAN_REPAYMENT_RATES = [10, 15, 20, 25, 30, 40, 50] as const

const GRID: Record<number, number> = {
  10: 30,
  15: 24,
  20: 18,
  25: 14,
  30: 10,
  40: 7,
  50: 5,
}

export function interestPercentForRepaymentRate(repaymentRate: number): number {
  return GRID[repaymentRate] ?? 0
}

export function previewTotalDue(principal: number, repaymentRate: number): number {
  const ir = interestPercentForRepaymentRate(repaymentRate)
  return principal + Math.floor((principal * ir) / 100)
}
