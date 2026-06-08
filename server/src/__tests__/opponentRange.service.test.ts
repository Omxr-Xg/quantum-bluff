import {
  heroEquityVsRange,
  narrowOpponentRange,
  seedOpponentRange,
} from '../poker/services/opponentRange.service.js'
import type { Card } from '../types/poker.js'

const c = (rank: Card['rank'], suit: Card['suit'] = 'HEARTS'): Card => ({
  rank,
  suit,
  value: { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14 }[rank] as number,
})

describe('opponentRange.service', () => {
  test('seedOpponentRange returns weighted holes', () => {
    const hero: Card[] = [c('A'), c('K')]
    const range = seedOpponentRange(hero)
    expect(range.holes.length).toBeGreaterThan(10)
  })

  test('narrowOpponentRange keeps minimum combos', () => {
    const hero: Card[] = [c('A'), c('K')]
    const seeded = seedOpponentRange(hero)
    const narrowed = narrowOpponentRange(seeded, 'FOLD', 2000, 'FLOP')
    expect(narrowed.holes.length).toBeGreaterThanOrEqual(8)
  })

  test('heroEquityVsRange returns probability in [0,1]', () => {
    const hero: Card[] = [c('A'), c('A')]
    const board: Card[] = [c('2'), c('7'), c('J')]
    const range = seedOpponentRange([...hero, ...board])
    const eq = heroEquityVsRange(hero, board, range)
    expect(eq).toBeGreaterThanOrEqual(0)
    expect(eq).toBeLessThanOrEqual(1)
  })
})
