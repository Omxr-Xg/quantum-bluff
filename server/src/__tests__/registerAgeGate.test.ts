import {
  evaluateRegisterAgeGate,
  parseIsoDateOfBirth,
  eligibilityUnblockAtUtc,
  isBeforeEligibilityDay,
} from '../utils/registerAgeGate.js'

describe('registerAgeGate', () => {
  const fixed = new Date(Date.UTC(2026, 4, 14))

  it('parseIsoDateOfBirth accepts valid UTC calendar dates', () => {
    const d = parseIsoDateOfBirth('2000-05-20')
    expect(d?.getTime()).toBe(Date.UTC(2000, 4, 20))
  })

  it('rejects impossible calendar dates', () => {
    expect(parseIsoDateOfBirth('2000-02-30')).toBeNull()
    expect(parseIsoDateOfBirth('not-a-date')).toBeNull()
  })

  it('US requires 21+', () => {
    const dob20 = evaluateRegisterAgeGate('2006-05-14', 'US', fixed)
    expect(dob20.ok).toBe(false)
    if (!dob20.ok) expect(dob20.code).toBe('REGISTER_AGE_US_21')

    const dob21 = evaluateRegisterAgeGate('2005-05-14', 'US', fixed)
    expect(dob21.ok).toBe(true)
  })

  it('default / unknown country requires 18+', () => {
    const young = evaluateRegisterAgeGate('2009-05-14', null, fixed)
    expect(young.ok).toBe(false)
    if (!young.ok) expect(young.code).toBe('REGISTER_AGE_MIN_18')

    const ok = evaluateRegisterAgeGate('2007-05-14', 'FR', fixed)
    expect(ok.ok).toBe(true)
  })

  it('SA and IR block registration', () => {
    const sa = evaluateRegisterAgeGate('1990-01-01', 'SA', fixed)
    expect(sa.ok).toBe(false)
    if (!sa.ok) expect(sa.code).toBe('REGISTER_GAMBLING_FORBIDDEN')

    const ir = evaluateRegisterAgeGate('1990-01-01', 'ir', fixed)
    expect(ir.ok).toBe(false)
    if (!ir.ok) expect(ir.code).toBe('REGISTER_GAMBLING_FORBIDDEN')
  })

  it('rejects future birth date', () => {
    const r = evaluateRegisterAgeGate('2027-01-01', 'FR', fixed)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('REGISTER_DATE_INVALID')
  })

  it('eligibilityUnblockAtUtc is Nth birthday at UTC midnight', () => {
    const dob = parseIsoDateOfBirth('2010-06-15')!
    expect(eligibilityUnblockAtUtc(dob, 18).getTime()).toBe(Date.UTC(2028, 5, 15, 0, 0, 0, 0))
    expect(eligibilityUnblockAtUtc(dob, 21).getTime()).toBe(Date.UTC(2031, 5, 15, 0, 0, 0, 0))
  })

  it('isBeforeEligibilityDay respects UTC calendar days', () => {
    const unblock = new Date(Date.UTC(2028, 5, 15))
    expect(isBeforeEligibilityDay(new Date(Date.UTC(2028, 5, 14)), unblock)).toBe(true)
    expect(isBeforeEligibilityDay(new Date(Date.UTC(2028, 5, 15)), unblock)).toBe(false)
  })
})
