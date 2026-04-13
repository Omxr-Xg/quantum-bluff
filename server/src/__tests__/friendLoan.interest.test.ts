import {
  ALLOWED_REPAYMENT_RATES,
  computeRepaymentSlice,
  computeTotalDue,
  getInterestRate,
  isAllowedRepaymentRate,
} from '../logic/friendLoan.interest.js'

describe('friendLoan.interest', () => {
  it('getInterestRate matches validated grid', () => {
    expect(getInterestRate(10)).toBe(30)
    expect(getInterestRate(50)).toBe(5)
  })

  it('rejects invalid repayment rate', () => {
    expect(() => getInterestRate(11)).toThrow('INVALID_REPAYMENT_RATE')
  })

  it('isAllowedRepaymentRate', () => {
    expect(isAllowedRepaymentRate(30)).toBe(true)
    expect(isAllowedRepaymentRate(33)).toBe(false)
    expect(ALLOWED_REPAYMENT_RATES.length).toBe(7)
  })

  it('computeTotalDue adds interest on principal', () => {
    expect(computeTotalDue(1000, 30)).toBe(1300)
    expect(computeTotalDue(100, 7)).toBe(107)
  })

  it('computeRepaymentSlice caps by remaining and floors', () => {
    expect(computeRepaymentSlice(100, 30, 500)).toBe(30)
    expect(computeRepaymentSlice(100, 30, 20)).toBe(20)
    expect(computeRepaymentSlice(1, 10, 1000)).toBe(0)
  })
})
