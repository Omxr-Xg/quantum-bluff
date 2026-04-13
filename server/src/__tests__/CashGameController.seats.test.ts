/**
 * CashGameController — sièges, rachats, garde-fous (sans Socket.IO).
 */
import { CashGameController } from '../logic/CashGameController.js'

function make(id = 'room-1') {
  return new CashGameController({
    id: 'g1',
    roomId: id,
    maxSeats: 9,
    smallBlind: 5,
    bigBlind: 10,
    defaultBuyIn: 500,
  })
}

describe('CashGameController — init', () => {
  test.each([
    [1, 2],
    [5, 10],
    [25, 50],
  ] as const)('SB=%i BB=%i', (sb, bb) => {
    const c = new CashGameController({
      id: 'g',
      roomId: 'r',
      smallBlind: sb,
      bigBlind: bb,
      defaultBuyIn: 100,
    })
    expect(c.getMinRaise()).toBe(bb)
  })
})

describe('CashGameController — sit / leave / rebuy', () => {
  test.each(Array.from({ length: 9 }, (_, i) => i))('sit sur siège %i', (seatIndex) => {
    const c = make()
    const r = c.sit('u1', 'Alice', seatIndex, 1000)
    expect(r.ok).toBe(true)
    expect(c.getOccupiedCount()).toBe(1)
  })

  test('sit siège invalide', () => {
    const c = make()
    expect(c.sit('u', 'A', -1, 500).ok).toBe(false)
    expect(c.sit('u', 'A', 99, 500).ok).toBe(false)
  })

  test('double sit même siège', () => {
    const c = make()
    expect(c.sit('u1', 'A', 2, 500).ok).toBe(true)
    expect(c.sit('u2', 'B', 2, 500).ok).toBe(false)
  })

  test.each([
    [100, 100],
    [500, 500],
    [1000, 1000],
    [50, 100],
  ] as const)('buy-in clamp min defaultBuyIn (%i demandé → effective min)', (ask, _min) => {
    const c = new CashGameController({
      id: 'g',
      roomId: 'r',
      defaultBuyIn: 200,
    })
    const r = c.sit('u', 'P', 0, ask)
    expect(r.ok).toBe(true)
    const seat = c.getOccupiedSeats().find((s) => s.userId === 'u')
    expect(seat!.chips).toBeGreaterThanOrEqual(200)
  })

  test('leave ok entre mains', () => {
    const c = make()
    c.sit('u1', 'A', 0, 500)
    expect(c.leave('u1').ok).toBe(true)
    expect(c.getOccupiedCount()).toBe(0)
  })

  test('rebuy ajoute des jetons', () => {
    const c = make()
    c.sit('u1', 'A', 1, 500)
    const before = c.getOccupiedSeats()[0]!.chips
    expect(c.rebuy('u1', 100).ok).toBe(true)
    expect(c.getOccupiedSeats()[0]!.chips).toBeGreaterThan(before)
  })

  test('removeDisconnectedPlayer entre mains', () => {
    const c = make()
    c.sit('u1', 'A', 3, 500)
    expect(c.removeDisconnectedPlayer('u1')).toBe(true)
    expect(c.getOccupiedCount()).toBe(0)
  })
})

describe('CashGameController — startHand garde-fous', () => {
  test('0 joueur → pas de GameTable', () => {
    const c = make()
    c.startHand()
    expect(c.state.phase).not.toBe('PREFLOP')
  })

  test('1 joueur → pas de main', () => {
    const c = make()
    c.sit('u1', 'A', 0, 1000)
    c.startHand()
    expect(c.getOccupiedCount()).toBe(1)
  })

  test('2 joueurs → main démarre', () => {
    const c = make()
    c.sit('u1', 'A', 0, 1000)
    c.sit('u2', 'B', 1, 1000)
    c.startHand()
    expect(c.state.phase).toBe('PREFLOP')
    expect(c.state.players.length).toBe(2)
  })

  test('getSanitizedState sans requesting id', () => {
    const c = make()
    c.sit('u1', 'A', 0, 1000)
    c.sit('u2', 'B', 1, 1000)
    c.startHand()
    const s = c.getSanitizedState()
    expect(s.players).toHaveLength(2)
    expect(s.cashSeats).toBeDefined()
  })

  test('runtime snapshot exposes hand end reason after fold-win', () => {
    const c = make()
    c.sit('u1', 'A', 0, 1000)
    c.sit('u2', 'B', 1, 1000)
    c.startHand()
    const current = c.state.currentTurn
    c.handlePlayerAction(current, 'FOLD')
    const state = c.getSanitizedState('u1')
    expect(state.phase).toBe('SHOWDOWN')
    expect(state.handEndReason).toBe('WIN_BY_FOLD')
  })
})

describe('CashGameController — matrice sièges multiples', () => {
  test.each([
    [2, [0, 1]],
    [3, [0, 2, 4]],
    [4, [0, 1, 2, 3]],
    [5, [0, 1, 2, 3, 4]],
    [6, [0, 1, 2, 3, 4, 5]],
  ] as const)('%i joueurs aux sièges %j', (count, seats) => {
    const c = make(`room-${count}`)
    for (let i = 0; i < count; i++) {
      expect(c.sit(`u${i}`, `P${i}`, seats[i]!, 800).ok).toBe(true)
    }
    expect(c.getOccupiedCount()).toBe(count)
    c.startHand()
    expect(c.state.players.length).toBe(count)
  })
})
