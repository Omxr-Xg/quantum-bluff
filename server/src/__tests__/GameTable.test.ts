import { GameTable } from '../logic/GameTable.js'
import type { Player } from '../types/poker.js'

describe('GameTable - Moteur Principal', () => {
  let table: GameTable

  const createPlayers = (): Player[] => [
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
    table = new GameTable('room1', createPlayers())
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

    expect(state.players[0]).toHaveProperty('id')
    expect(state.players[0]).toHaveProperty('name')
    expect(state.players[0]).toHaveProperty('chips')
    expect(state.players[0]).toHaveProperty('currentBet')
    expect(state.players[0]).toHaveProperty('role')
    expect(state.players[0]).toHaveProperty('isActive')
    expect(state.players[0]).toHaveProperty('cards')
  })

  test('impossible de jouer avant startHand', () => {
    expect(() => table.handlePlayerAction('p1', 'CALL')).toThrow(
      'La main n’a pas commencé'
    )
  })

  test('startHand distribue les cartes et poste les blinds', () => {
    table.startHand()

    expect(table.state.phase).toBe('PREFLOP')
    expect(table.state.communityCards).toHaveLength(0)
    expect(table.state.pot).toBe(30)

    expect(table.state.players[0].cards).toHaveLength(2)
    expect(table.state.players[1].cards).toHaveLength(2)

    const roles = table.state.players.map((p) => p.role)
    expect(roles).toContain('SMALL_BLIND')
    expect(roles).toContain('BIG_BLIND')
  })

  test('heads-up : le dealer/small blind parle en premier préflop', () => {
    table.startHand()

    expect(table.state.currentTurn).toBe('p1')
    expect(table.canPlayerAct('p1')).toBe(true)
    expect(table.canPlayerAct('p2')).toBe(false)
  })

  test('CALL est autorisé quand le small blind doit compléter la big blind', () => {
    table.startHand()
  
    expect(table.calculateCallAmount('p1')).toBe(10)
    expect(() => table.handlePlayerAction('p1', 'CALL')).not.toThrow()
  })
  
  test('CHECK est interdit quand une mise est à suivre', () => {
    table.startHand()
  
    expect(table.calculateCallAmount('p1')).toBe(10)
    expect(() => table.handlePlayerAction('p1', 'CHECK')).toThrow(
      'Impossible de check, une mise est à suivre'
    )
  })

  test('pas ton tour déclenche une erreur', () => {
    table.startHand()

    expect(() => table.handlePlayerAction('p2', 'CHECK')).toThrow('Pas ton tour !')
  })

  test('FOLD d’un joueur donne le pot au dernier joueur restant', () => {
    table.startHand()

    table.handlePlayerAction('p1', 'FOLD')

    expect(table.state.phase).toBe('SHOWDOWN')
    expect(table.state.pot).toBe(0)

    const p2 = table.getPlayerState('p2')
    expect(p2?.chips).toBe(1010)
  })

  test('advancePhase fait progresser FLOP -> TURN -> RIVER -> SHOWDOWN', () => {
    table.startHand()

    table.advancePhase()
    expect(table.state.phase).toBe('FLOP')
    expect(table.state.communityCards).toHaveLength(3)

    table.advancePhase()
    expect(table.state.phase).toBe('TURN')
    expect(table.state.communityCards).toHaveLength(4)

    table.advancePhase()
    expect(table.state.phase).toBe('RIVER')
    expect(table.state.communityCards).toHaveLength(5)

    table.advancePhase()
    expect(table.state.phase).toBe('SHOWDOWN')
    expect(table.state.currentTurn).toBe('')
  })
})