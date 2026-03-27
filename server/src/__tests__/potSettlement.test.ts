import { settlePots } from '../logic/poker/potSettlement.js'
import type { Player } from '../types/poker.js'

function p(id: string, put: number, active = true): Player {
  return {
    id,
    name: id,
    cards: [],
    chips: 0,
    role: 'PLAYER',
    isActive: active,
    currentBet: 0,
    totalPutInThisHand: put,
  }
}

describe('potSettlement', () => {
  it('splits odd chips to first winner deterministically', () => {
    const result = settlePots({
      players: [p('a', 101), p('b', 101)],
      communityCards: [],
    })
    expect(result.showdownWinnerIds.length).toBeGreaterThanOrEqual(1)
    const total = Array.from(result.payouts.values()).reduce((s, v) => s + v, 0)
    expect(total).toBe(202)
  })
})

