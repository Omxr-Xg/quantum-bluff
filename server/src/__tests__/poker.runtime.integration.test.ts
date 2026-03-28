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

  it('keeps in-hand leave/disconnect isolated until hand boundary', () => {
    const game = new CashGameController({
      id: 'g-leave',
      roomId: 'r3',
    })
    game.initFromRoomPlayers([
      { userId: 'u1', username: 'u1', chips: 1000 },
      { userId: 'u2', username: 'u2', chips: 1000 },
    ])
    game.startHand()

    // In-hand: player cannot be removed from seats immediately.
    expect(game.leave('u1').ok).toBe(false)
    expect(game.removeDisconnectedPlayer('u1')).toBe(false)
    expect(game.getOccupiedCount()).toBe(2)
  })

  it('quit volontaire en cours de main : fold puis siège libéré à onHandComplete', () => {
    const game = new CashGameController({
      id: 'g-quit',
      roomId: 'r5',
    })
    game.initFromRoomPlayers([
      { userId: 'u1', username: 'u1', chips: 1000 },
      { userId: 'u2', username: 'u2', chips: 1000 },
    ])
    game.startHand()
    const r = game.quitVoluntaryDuringHand('u1')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.showdown).toBe(true)
    game.onHandComplete()
    expect(game.getGameTable()).toBeNull()
    expect(game.getOccupiedSeats().some((s) => s.userId === 'u1')).toBe(false)
    expect(game.getOccupiedSeats().some((s) => s.userId === 'u2')).toBe(true)
  })

  it('applies disconnect cleanup between hands and keeps state consistent', () => {
    const game = new CashGameController({
      id: 'g-disconnect',
      roomId: 'r4',
    })
    game.initFromRoomPlayers([
      { userId: 'u1', username: 'u1', chips: 1000 },
      { userId: 'u2', username: 'u2', chips: 1000 },
    ])
    game.startHand()
    const table = game.getGameTable()
    expect(table).not.toBeNull()
    if (!table) return

    // Force hand completion by fold, then cleanup window starts.
    table.handlePlayerAction(table.state.currentTurn, 'FOLD')
    game.onHandComplete()
    expect(game.state.phase).toBe('WAITING')

    expect(game.removeDisconnectedPlayer('u1')).toBe(true)
    expect(game.getOccupiedCount()).toBe(1)
  })
})
