import {
  getActiveChallengeCodesForDate,
  getCycleDayIndex,
} from '../dailyChallenges/dailyChallengeRotation.js'

describe('dailyChallenge.rotation', () => {
  it('cycle jour 1 sur epoch', () => {
    expect(getCycleDayIndex(new Date('2026-01-01T12:00:00.000Z'))).toBe(1)
    expect(getActiveChallengeCodesForDate(new Date('2026-01-01T12:00:00.000Z'))).toEqual([
      'WIN_WITH_PAIR',
      'WIN_200_ROULETTE',
      'PLAY_5_TIMES',
      'WIN_200_SLOT',
    ])
  })

  it('cycle jour 2 le lendemain', () => {
    expect(getCycleDayIndex(new Date('2026-01-02T12:00:00.000Z'))).toBe(2)
    expect(getActiveChallengeCodesForDate(new Date('2026-01-02T12:00:00.000Z'))).toContain(
      'WIN_SHOWDOWN'
    )
  })

  it('repart sur jour 1 après 7 jours', () => {
    expect(getCycleDayIndex(new Date('2026-01-08T12:00:00.000Z'))).toBe(1)
  })
})
