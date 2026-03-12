import { GameTable } from '../logic/GameTable.js'
import type { Player } from '../types/poker.js'

describe('GameTable - Moteur Principal', () => {
  let table: GameTable

  const players: Player[] = [
    {
      id: 'p1',
      name: 'Azra',
      cards: [],
      chips: 1000,
      role: 'PLAYER',
      isActive: true
    },
    {
      id: 'p2',
      name: 'Soheil',
      cards: [],
      chips: 1000,
      role: 'PLAYER',
      isActive: true
    }
  ]

  beforeEach(() => {
    table = new GameTable('room1', [...players])
  })

  test('constructor initialise GameState PREFLOP', () => {
    expect(table.state.phase).toBe('PREFLOP')
    expect(table.state.pot).toBe(0)
    expect(table.state.currentTurn).toBe('p1')
  })

  test('getSanitizedState structure + Fog of War', () => {
    const state = table.getSanitizedState('p1')

    expect(state).toHaveProperty('id', 'room1')
    expect(state).toHaveProperty('phase', 'PREFLOP')
    expect(state).toHaveProperty('pot', 0)
    expect(state.players).toHaveLength(2)

    expect(state.players[0]).toHaveProperty('id', 'p1')
    expect(state.players[1]).toHaveProperty('id', 'p2')
    expect(state.players[0]).toHaveProperty('cards')
    expect(state.players[1]).toHaveProperty('cards')
  })

  test("refuse l'action d'un joueur quand ce n'est pas son tour", () => {
    expect(() => table.handlePlayerAction('p2', 'CHECK')).toThrow('Pas ton tour')
  })

  test('accepte une action valide puis passe le tour au joueur suivant', () => {
    expect(() => table.handlePlayerAction('p1', 'CHECK')).not.toThrow()
    expect(table.state.currentTurn).toBe('p2')
  })

  test("après l'action de p1, p1 ne peut pas rejouer immédiatement", () => {
    table.handlePlayerAction('p1', 'CHECK')
    expect(() => table.handlePlayerAction('p1', 'CHECK')).toThrow('Pas ton tour')
  })
})