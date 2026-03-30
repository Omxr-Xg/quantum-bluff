import { makePokerActionDedupKey, registerPokerActionDedup } from '../poker/services/pokerActionDedup.service.js'

describe('pokerActionDedup', () => {
  it('accepts first action and rejects duplicate', () => {
    const key = makePokerActionDedupKey({
      gameId: 'g',
      playerId: 'u',
      actionId: 'a1',
    })
    const first = registerPokerActionDedup({
      dedupKey: key,
      contextKey: 'h1:PREFLOP:u',
    })
    expect(first.accepted).toBe(true)

    const second = registerPokerActionDedup({
      dedupKey: key,
      contextKey: 'h1:PREFLOP:u',
    })
    expect(second.accepted).toBe(false)
    if (!second.accepted) {
      expect(second.reason).toBe('DUPLICATE_ACTION')
    }
  })
})

