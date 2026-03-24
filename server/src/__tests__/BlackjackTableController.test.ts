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
    expect(table.placeBet('u1', 20, 500, 1000).ok).toBe(true)
    expect(table.placeBet('u2', 10, 500, 1000).ok).toBe(true)
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
})
