import * as blackjack from '../logic/blackjack.js'
import type { Card } from '../logic/blackjack.js'
import { BlackjackTableController } from '../logic/BlackjackTableController.js'

describe('BlackjackTableController', () => {
  it('accepts bets, deals, and reaches player_turn or dealer', () => {
    const table = new BlackjackTableController({
      gameId: 'bj_test',
      roomId: 'room_test',
      maxSeats: 3,
      minBet: 10,
      members: [
        { userId: 'u1', username: 'p1', position: 0 },
        { userId: 'u2', username: 'p2', position: 1 },
      ],
    })

    expect(table.phase).toBe('betting')
    expect(table.allSeatsReadyForDeal()).toBe(false)
    expect(table.placeBet('u1', 20, 500, 1000).ok).toBe(true)
    expect(table.allSeatsReadyForDeal()).toBe(false)
    expect(table.placeBet('u2', 10, 500, 1000).ok).toBe(true)
    expect(table.allSeatsReadyForDeal()).toBe(true)
    expect(table.deal().ok).toBe(true)
    expect(['player_turn', 'dealer']).toContain(table.phase)
    expect(table.handNumber).toBe(1)
    const pub = table.toPublicState()
    expect(pub.seats.length).toBe(2)
    expect(pub.dealerCards.length).toBeGreaterThanOrEqual(1)
  })

  it('rejects second bet same hand', () => {
    const table = new BlackjackTableController({
      gameId: 'bj_test2',
      roomId: 'room_test2',
      maxSeats: 2,
      minBet: 10,
      members: [{ userId: 'u1', username: 'p1', position: 0 }],
    })
    expect(table.placeBet('u1', 10, 100, 1000).ok).toBe(true)
    expect(table.placeBet('u1', 10, 100, 1000).ok).toBe(false)
  })

  it('auto-stands after hit when total is 21', () => {
    const drawOrder: Card[] = [
      { rank: '5', suit: 'h' },
      { rank: '6', suit: 's' },
      { rank: '6', suit: 'd' },
      { rank: 'K', suit: 'c' },
      { rank: 'J', suit: 'c' },
    ]
    const spy = jest.spyOn(blackjack, 'drawCard').mockImplementation(() => {
      const c = drawOrder.shift()
      if (!c) throw new Error('draw queue empty')
      return c
    })
    try {
      const table = new BlackjackTableController({
        gameId: 'bj_21',
        roomId: 'room_21',
        maxSeats: 2,
        minBet: 10,
        members: [{ userId: 'u1', username: 'p1', position: 0 }],
      })
      expect(table.placeBet('u1', 10, 1000, 1000).ok).toBe(true)
      expect(table.deal().ok).toBe(true)
      expect(table.phase).toBe('player_turn')
      expect(table.playerAction('u1', 'hit').ok).toBe(true)
      expect(table.seats[0]!.playState).toBe('standing')
      expect(table.phase).toBe('dealer')
    } finally {
      spy.mockRestore()
    }
  })

  it('double adds one card doubles stake and advances to dealer', () => {
    const drawOrder: Card[] = [
      { rank: '9', suit: 'h' },
      { rank: '7', suit: 's' },
      { rank: '2', suit: 'd' },
      { rank: 'K', suit: 'c' },
      { rank: '5', suit: 'h' },
    ]
    const spy = jest.spyOn(blackjack, 'drawCard').mockImplementation(() => {
      const c = drawOrder.shift()
      if (!c) throw new Error('draw queue empty')
      return c
    })
    try {
      const table = new BlackjackTableController({
        gameId: 'bj_dbl',
        roomId: 'room_dbl',
        maxSeats: 2,
        minBet: 10,
        members: [{ userId: 'u1', username: 'p1', position: 0 }],
      })
      expect(table.placeBet('u1', 10, 1000, 1000).ok).toBe(true)
      expect(table.deal().ok).toBe(true)
      expect(table.phase).toBe('player_turn')
      expect(table.seats[0]!.hand.length).toBe(2)
      expect(table.playerAction('u1', 'double').ok).toBe(true)
      expect(table.seats[0]!.hand.length).toBe(3)
      expect(table.seats[0]!.totalBet).toBe(20)
      expect(table.seats[0]!.doubled).toBe(true)
      expect(table.phase).toBe('dealer')
    } finally {
      spy.mockRestore()
    }
  })
})
