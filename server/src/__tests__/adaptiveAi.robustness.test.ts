import {
  applyTendencyBluffChance,
  applyTendencyFoldThreshold,
  expertOracleDecision,
  EXPERT_FOLD_MAX_WIN_PROB,
} from '../logic/botAI.js'
import { buildPublicProfile } from '../poker/services/playerTendency.service.js'
import type { Card } from '../types/poker.js'

const c = (rank: Card['rank'], suit: Card['suit'] = 'HEARTS'): Card => ({
  rank,
  suit,
  value: { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14 }[rank] as number,
})

describe('adaptive AI — robustesse production', () => {
  test('profil absent / LOW → oracle baseline inchangé', () => {
    expect(applyTendencyFoldThreshold(null)).toBe(EXPERT_FOLD_MAX_WIN_PROB)
    expect(applyTendencyFoldThreshold(undefined)).toBe(EXPERT_FOLD_MAX_WIN_PROB)
    expect(
      applyTendencyFoldThreshold({
        vpip: 0.9,
        pfr: 0.8,
        bluffRaiseRate: 0.9,
        foldToRaiseRate: 0.1,
        styleTag: 'AGGRESSIVE',
        confidence: 'LOW',
      }),
    ).toBe(EXPERT_FOLD_MAX_WIN_PROB)
  })

  test('cold start buildPublicProfile → style gelé, rates exposés', () => {
    const view = buildPublicProfile({
      handsObserved: 3,
      vpipOpportunities: 10,
      vpipTaken: 4,
      pfrOpportunities: 8,
      pfrTaken: 2,
      raisesFacing: 5,
      foldsToRaise: 1,
      raisesMade: 3,
      lowEquityRaises: 1,
      styleTag: 'UNKNOWN',
      styleScoreAggressive: 0,
      styleScoreTight: 0,
      styleScoreCallingStation: 0,
      lastStyleEvaluationAt: null,
    })
    expect(view.styleTag).toBe('UNKNOWN')
    expect(view.confidence).toBe('LOW')
    expect(view.vpip).toBe(0.4)
  })

  test('styleScores corrompus (somme 0) → fallback tag discret sans crash', () => {
    const threshold = applyTendencyFoldThreshold({
      vpip: 0.4,
      pfr: 0.2,
      bluffRaiseRate: 0.4,
      foldToRaiseRate: 0.3,
      styleTag: 'AGGRESSIVE',
      confidence: 'HIGH',
      styleScores: { aggressive: 0, tight: 0, callingStation: 0 },
    })
    expect(threshold).toBeLessThan(EXPERT_FOLD_MAX_WIN_PROB)
    expect(applyTendencyBluffChance(0.42, null)).toBe(0.42)
  })

  test('oracle avec trous adverses joue toujours une action valide', () => {
    const req = {
      playerCards: [c('A'), c('K')],
      communityCards: [c('2'), c('7'), c('J')],
      difficulty: 'expert' as const,
      currentBet: 100,
      playerChips: 500,
      callAmount: 100,
      minRaise: 100,
      potSize: 300,
      position: 0,
      playersCount: 2,
    }
    const d = expertOracleDecision(req, { opponentHoleCards: [[c('Q'), c('Q')]] })
    expect(['FOLD', 'CALL', 'CHECK', 'RAISE']).toContain(d.action)
  })
})
