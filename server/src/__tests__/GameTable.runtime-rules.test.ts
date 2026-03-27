import { GameTable } from '../logic/GameTable.js'
import type { Player } from '../types/poker.js'

function mkPlayers(): Player[] {
  return [
    {
      id: 'p1',
      name: 'p1',
      cards: [],
      chips: 5000,
      role: 'PLAYER',
      isActive: true,
      isConnected: true,
    },
    {
      id: 'p2',
      name: 'p2',
      cards: [],
      chips: 5000,
      role: 'PLAYER',
      isActive: true,
      isConnected: true,
    },
  ]
}

describe('GameTable runtime rules', () => {
  it('keeps heads-up preflop actor as dealer', () => {
    const t = new GameTable('g1', mkPlayers(), { smallBlind: 10, bigBlind: 20 })
    t.startHand()
    const dealer = t.state.players.find((p) => p.isDealer)
    expect(dealer?.id).toBe(t.state.currentTurn)
  })

  it('assigns postflop first actor to non-dealer in heads-up', () => {
    const t = new GameTable('g2', mkPlayers(), { smallBlind: 10, bigBlind: 20 })
    t.startHand()
    const dealer = t.state.players.find((p) => p.isDealer)!
    const other = t.state.players.find((p) => p.id !== dealer.id)!
    // preflop: dealer(small blind) calls, then big blind checks to close street
    t.handlePlayerAction(dealer.id, 'CALL')
    t.handlePlayerAction(other.id, 'CHECK')
    expect(t.state.phase).toBe('FLOP')
    expect(t.state.currentTurn).toBe(other.id)
  })

  it('freezes hand participants during active hand', () => {
    const t = new GameTable('g3', mkPlayers(), { smallBlind: 10, bigBlind: 20 })
    t.startHand()
    const before = t.state.handParticipantIds ?? []
    t.addPlayer({
      id: 'p3',
      name: 'p3',
      cards: [],
      chips: 5000,
      role: 'PLAYER',
      isActive: true,
      isConnected: true,
    })
    expect(t.state.handParticipantIds).toEqual(before)
    expect(() => t.handlePlayerAction('p3', 'FOLD')).toThrow(
      'Joueur non participant sur cette main'
    )
  })

  it('sets explicit hand end reason on fold-to-win', () => {
    const t = new GameTable('g4', mkPlayers(), { smallBlind: 10, bigBlind: 20 })
    t.startHand()
    t.handlePlayerAction(t.state.currentTurn, 'FOLD')
    expect(t.state.phase).toBe('SHOWDOWN')
    expect(t.state.handEndReason).toBe('WIN_BY_FOLD')
  })
})

