import { normalizedHandStrength, decideBotAction } from '../logic/botAI.js'
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
