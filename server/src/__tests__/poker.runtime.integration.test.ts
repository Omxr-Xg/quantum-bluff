import { CashGameController, TURBO_TURN_TIMEOUT_MS } from '../logic/CashGameController.js'

describe('Poker runtime integration', () => {
  it('keeps turbo timeout from runtime config', () => {
    const game = new CashGameController({
      id: 'g-turbo',
      roomId: 'r1',
      turnTimeoutMs: TURBO_TURN_TIMEOUT_MS,
    })
    game.initFromRoomPlayers([
      { userId: 'u1', username: 'u1', chips: 1000 },
      { userId: 'u2', username: 'u2', chips: 1000 },
    ])
    game.startHand()
    expect(game.getTurnTimeoutMs()).toBe(TURBO_TURN_TIMEOUT_MS)
    expect(game.getSanitizedState('u1').turnTimeLimitSec).toBe(10)
  })

  it('queues spectator join while hand is in progress', () => {
    const game = new CashGameController({
      id: 'g-queue',
      roomId: 'r2',
    })
    game.initFromRoomPlayers([
      { userId: 'u1', username: 'u1', chips: 1000 },
      { userId: 'u2', username: 'u2', chips: 1000 },
    ])
    game.startHand()
    game.addSpectatorToRejoinQueue('u3')
    expect(game.isInRejoinQueue('u3')).toBe(true)
    const sitResult = game.sit('u3', 'u3', 3, 1000)
    expect(sitResult.ok).toBe(false)
  })
})
