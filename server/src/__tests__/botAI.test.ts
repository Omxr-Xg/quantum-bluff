import {
  normalizedHandStrength,
  decideBotAction,
  compositeOpponentNormalizedStrength,
  expertOracleDecision,
  heroShowdownEquity,
  EXPERT_FOLD_MAX_WIN_PROB,
  applyTendencyFoldThreshold,
  applyTendencyBluffChance,
} from '../logic/botAI.js'
import type { Card } from '../types/poker.js'

const c = (rank: Card['rank'], suit: Card['suit'] = 'HEARTS', value?: number): Card => ({
  rank,
  suit,
  value: value ?? ({ '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14 }[rank] as number),
})

describe('botAI — normalizedHandStrength', () => {
  test('table vide → valeur par défaut', () => {
    expect(normalizedHandStrength([], [])).toBe(0.35)
  })

  test('flop partiel (2 cartes joueur + 3 board) : pas 0,5 figé', () => {
    const hole: Card[] = [c('A', 'HEARTS', 14), c('K', 'DIAMONDS', 13)]
    const board: Card[] = [c('2', 'CLUBS', 2), c('7', 'SPADES', 7), c('J', 'HEARTS', 11)]
    const s = normalizedHandStrength(hole, board)
    expect(s).toBeGreaterThan(0)
    expect(s).toBeLessThanOrEqual(1)
    expect(s).not.toBe(0.5)
  })

  test('7 cartes (river) : dans [0,1]', () => {
    const hole: Card[] = [c('A'), c('A')]
    const board: Card[] = [c('2'), c('3'), c('4'), c('5'), c('6')]
    const s = normalizedHandStrength(hole, board)
    expect(s).toBeGreaterThanOrEqual(0)
    expect(s).toBeLessThanOrEqual(1)
  })
})

describe('botAI — compositeOpponentNormalizedStrength', () => {
  test('≤2 adversaires : conserve le max', () => {
    expect(compositeOpponentNormalizedStrength([0.8])).toBe(0.8)
    expect(compositeOpponentNormalizedStrength([0.8, 0.3])).toBe(0.8)
  })

  test('3+ adversaires : strictement entre médiane et max quand ils diffèrent', () => {
    const s = compositeOpponentNormalizedStrength([0.9, 0.5, 0.2])
    expect(s).toBeLessThan(0.9)
    expect(s).toBeGreaterThan(0.2)
    expect(s).toBeGreaterThan(0.5)
  })
})

describe('botAI — heroShowdownEquity', () => {
  test('river : QQ bat 65 sur board neutre', () => {
    const board: Card[] = [c('2'), c('7'), c('J'), c('4'), c('9')]
    const hero: Card[] = [c('Q'), c('Q')]
    const villain: Card[] = [c('6'), c('5')]
    expect(heroShowdownEquity(hero, [villain], board)).toBeGreaterThan(0.95)
  })

  test('river : 72o perd face à AA', () => {
    const board: Card[] = [c('2'), c('7'), c('J'), c('4'), c('9')]
    const hero: Card[] = [c('7'), c('2')]
    const villain: Card[] = [c('A'), c('A')]
    expect(heroShowdownEquity(hero, [villain], board)).toBeLessThan(EXPERT_FOLD_MAX_WIN_PROB)
  })
})

describe('botAI — expertOracleDecision multiway', () => {
  test('QQ vs 65 preflop face à une relance : ne fold pas (équité >> 20%)', () => {
    const hero: Card[] = [c('Q'), c('Q')]
    const villain: Card[] = [c('6'), c('5')]
    const req = {
      playerCards: hero,
      communityCards: [] as Card[],
      difficulty: 'expert' as const,
      currentBet: 200,
      playerChips: 900,
      callAmount: 150,
      minRaise: 100,
      potSize: 350,
      position: 1,
      playersCount: 2,
    }
    const d = expertOracleDecision(req, { opponentHoleCards: [villain] })
    expect(d.action).not.toBe('FOLD')
  })

  test('72o vs AA river face à une grosse mise : fold (<20% win)', () => {
    const board: Card[] = [c('2'), c('7'), c('J'), c('4'), c('9')]
    const hero: Card[] = [c('7'), c('2')]
    const villain: Card[] = [c('A'), c('A')]
    const req = {
      playerCards: hero,
      communityCards: board,
      difficulty: 'expert' as const,
      currentBet: 400,
      playerChips: 600,
      callAmount: 300,
      minRaise: 100,
      potSize: 500,
      position: 1,
      playersCount: 2,
    }
    const d = expertOracleDecision(req, { opponentHoleCards: [villain] })
    expect(d.action).toBe('FOLD')
  })

  test('5 trous faibles + héros moyen + petite mise : pas fold systématique (random figé)', () => {
    const rnd = jest.spyOn(Math, 'random').mockReturnValue(0.99)
    const board: Card[] = [c('2'), c('7'), c('K')]
    const hero: Card[] = [c('9'), c('9')]
    const weak: Card[] = [c('3'), c('4')]
    const req = {
      playerCards: hero,
      communityCards: board,
      difficulty: 'expert' as const,
      currentBet: 100,
      playerChips: 900,
      callAmount: 80,
      minRaise: 100,
      potSize: 400,
      position: 2,
      playersCount: 6,
    }
    const holes = [weak, weak, weak, weak, weak]
    const d = expertOracleDecision(req, { opponentHoleCards: holes })
    rnd.mockRestore()
    expect(d.action).not.toBe('FOLD')
  })
})

describe('botAI — tendency adjustments', () => {
  test('confidence LOW → seuil fold inchangé', () => {
    expect(
      applyTendencyFoldThreshold({
        vpip: 0.5,
        pfr: 0.2,
        bluffRaiseRate: 0.5,
        foldToRaiseRate: 0.3,
        styleTag: 'AGGRESSIVE',
        confidence: 'LOW',
      }),
    ).toBe(EXPERT_FOLD_MAX_WIN_PROB)
  })

  test('bluffer MEDIUM → seuil fold abaissé', () => {
    const threshold = applyTendencyFoldThreshold({
      vpip: 0.4,
      pfr: 0.2,
      bluffRaiseRate: 0.4,
      foldToRaiseRate: 0.3,
      styleTag: 'AGGRESSIVE',
      confidence: 'MEDIUM',
    })
    expect(threshold).toBeLessThan(EXPERT_FOLD_MAX_WIN_PROB)
  })

  test('profil bluffer MEDIUM abaisse le seuil de fold vs baseline', () => {
    const blufferProfile = {
      vpip: 0.55,
      pfr: 0.18,
      bluffRaiseRate: 0.42,
      foldToRaiseRate: 0.25,
      styleTag: 'AGGRESSIVE',
      confidence: 'MEDIUM' as const,
      styleScores: { aggressive: 70, tight: 15, callingStation: 15 },
    }
    const threshold = applyTendencyFoldThreshold(blufferProfile)
    expect(threshold).toBeLessThan(EXPERT_FOLD_MAX_WIN_PROB)
    expect(threshold).toBeGreaterThan(0.1)
  })

  test('foldToRaise élevé → plus de bluffs quand check possible', () => {
    const base = applyTendencyBluffChance(0.42, null)
    const adapted = applyTendencyBluffChance(0.42, {
      vpip: 0.2,
      pfr: 0.1,
      bluffRaiseRate: 0.1,
      foldToRaiseRate: 0.7,
      styleTag: 'TIGHT',
      confidence: 'HIGH',
    })
    expect(adapted).toBeGreaterThan(base)
  })
})

describe('botAI — decideBotAction', () => {
  const baseReq = {
    currentBet: 100,
    playerChips: 1000,
    callAmount: 0,
    minRaise: 100,
    potSize: 200,
    position: 0,
    playersCount: 2,
  }

  test('répond avec une action valide (easy)', () => {
    const hole: Card[] = [c('9'), c('8')]
    const d = decideBotAction({
      ...baseReq,
      playerCards: hole,
      communityCards: [],
      difficulty: 'easy',
    })
    expect(['FOLD', 'CALL', 'CHECK', 'RAISE']).toContain(d.action)
  })

  test('expert vs hard : les deux produisent une action', () => {
    const hole: Card[] = [c('Q'), c('Q')]
    const board: Card[] = [c('2'), c('7'), c('K')]
    const r1 = decideBotAction({
      ...baseReq,
      callAmount: 50,
      playerCards: hole,
      communityCards: board,
      difficulty: 'hard',
    })
    const r2 = decideBotAction({
      ...baseReq,
      callAmount: 50,
      playerCards: hole,
      communityCards: board,
      difficulty: 'expert',
    })
    expect(r1.action).toBeDefined()
    expect(r2.action).toBeDefined()
  })
})
