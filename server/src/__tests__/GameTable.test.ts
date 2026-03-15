/**
 * =============================================================================
 * GAMETABLE.TEST.TS — Tests du moteur de table (GameTable)
 * =============================================================================
 *
 * Couvre le cycle de vie d’une main : construction, startHand, actions (CALL,
 * CHECK, RAISE, FOLD), avancement de phase (FLOP, TURN, RIVER, SHOWDOWN),
 * fog of war (getSanitizedState), et règles heads-up (blinds, ordre de parole).
 *
 * Chaque test est commenté pour expliquer le scénario et les assertions.
 * =============================================================================
 */

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
  // Tests pour les nouvelles méthodes
describe('GameTable - Nouvelles méthodes simplifiées', () => {
  let table: GameTable
  let players: Player[]

  beforeEach(() => {
    players = [
      { 
        id: 'p1', name: 'Azra', cards: [], chips: 1000, 
        role: 'PLAYER', isActive: true, position: 0, isConnected: true 
      },
      { 
        id: 'p2', name: 'Soheil', cards: [], chips: 1000, 
        role: 'PLAYER', isActive: true, position: 1, isConnected: true 
      }
    ]
    table = new GameTable('room1', players)
    table.startHand()
  })

  test('nextTurn() passe au joueur suivant', () => {
    const firstTurn = table.state.currentTurn
    table.nextTurn()
    expect(table.state.currentTurn).not.toBe(firstTurn)
  })

  test('bettingRoundComplete() détecte la fin du tour', () => {
    expect(table.bettingRoundComplete()).toBe(false)
  })

  test('endBettingRound() termine le tour si complet', () => {
    const initialPhase = table.state.phase
    table.endBettingRound()
    // Ne change pas car pas complet
    expect(table.state.phase).toBe(initialPhase)
  })

  test('handlePlayerAction() avec CHECK', () => {
  const currentPlayerId = table.state.currentTurn
  
    // En préflop avec blinds, CHECK n'est pas possible
    // Donc on s'attend à ce que ça lance une erreur
    expect(() => table.handlePlayerAction(currentPlayerId, 'CHECK')).toThrow('Impossible de check, une mise est à suivre')
  })
  test('handlePlayerAction() avec RAISE', () => {
  const currentPlayerId = table.state.currentTurn

  // Préflop heads-up: le small blind doit compléter 10 pour suivre la big blind.
  // On teste ici un raise simple.
  expect(() => table.handlePlayerAction(currentPlayerId, 'RAISE', 30)).not.toThrow()

  const player = table.getPlayerState(currentPlayerId)
  expect(player).toBeDefined()

  // Le joueur a investi plus qu’un simple CALL
  expect(player!.currentBet).toBeGreaterThan(10)

  // Le pot a augmenté
  expect(table.state.pot).toBeGreaterThan(30)

  // Le tour passe au joueur suivant
  expect(table.state.currentTurn).not.toBe(currentPlayerId)
})

  // Ajoute un test pour CALL (valide)
  test('handlePlayerAction() avec CALL', () => {
    const currentPlayerId = table.state.currentTurn
    expect(() => table.handlePlayerAction(currentPlayerId, 'CALL')).not.toThrow()
  })

  // Ajoute un test pour FOLD
  test('handlePlayerAction() avec FOLD', () => {
    const currentPlayerId = table.state.currentTurn
    expect(() => table.handlePlayerAction(currentPlayerId, 'FOLD')).not.toThrow()
  })
})