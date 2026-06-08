import {
  buildPublicProfile,
  computeConfidence,
  evaluateStyleScores,
  pickDominantTag,
  ratio,
} from '../poker/services/playerTendency.service.js'

function rawProfile(overrides: Partial<ReturnType<typeof baseRaw>> = {}) {
  return { ...baseRaw(), ...overrides }
}

function baseRaw() {
  return {
    handsObserved: 25,
    vpipOpportunities: 100,
    vpipTaken: 38,
    pfrOpportunities: 80,
    pfrTaken: 14,
    raisesFacing: 50,
    foldsToRaise: 26,
    raisesMade: 20,
    lowEquityRaises: 6,
    styleTag: 'AGGRESSIVE',
    styleScoreAggressive: 72,
    styleScoreTight: 18,
    styleScoreCallingStation: 10,
    lastStyleEvaluationAt: new Date('2026-05-29T14:32:00.000Z'),
  }
}

describe('playerTendency.service — ratios & confidence', () => {
  test('ratio handles zero opportunities', () => {
    expect(ratio(0, 0)).toBe(0)
    expect(ratio(3, 10)).toBe(0.3)
  })

  test('computeConfidence cold start and tiers', () => {
    expect(computeConfidence(5)).toBe('LOW')
    expect(computeConfidence(20)).toBe('MEDIUM')
    expect(computeConfidence(50)).toBe('HIGH')
  })
})

describe('playerTendency.service — style scores', () => {
  test('evaluateStyleScores normalizes to ~100', () => {
    const scores = evaluateStyleScores(rawProfile())
    expect(scores.aggressive + scores.tight + scores.callingStation).toBe(100)
    expect(scores.tag).toBeTruthy()
  })

  test('pickDominantTag returns BALANCED on tied top scores', () => {
    expect(pickDominantTag(40, 40, 20)).toBe('BALANCED')
  })

  test('buildPublicProfile cold start freezes style', () => {
    const view = buildPublicProfile(rawProfile({ handsObserved: 5 }))
    expect(view.styleTag).toBe('UNKNOWN')
    expect(view.confidence).toBe('LOW')
    expect(view.styleScores).toEqual({ aggressive: 0, tight: 0, callingStation: 0 })
    expect(view.lastStyleEvaluationAt).toBeNull()
    expect(view.vpip).toBeGreaterThan(0)
  })

  test('buildPublicProfile exposes stored scores when warm', () => {
    const view = buildPublicProfile(rawProfile())
    expect(view.styleTag).toBe('AGGRESSIVE')
    expect(view.confidence).toBe('MEDIUM')
    expect(view.styleScores.aggressive).toBe(72)
    expect(view.lastStyleEvaluationAt).toBe('2026-05-29T14:32:00.000Z')
  })
})
