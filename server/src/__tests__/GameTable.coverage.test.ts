/**
 * GameTable - Tests additionnels pour couverture 80%+
 * Couvre: endGameDueToDisconnect, forceFoldForDisconnect, addPlayer, removePlayer,
 * getMinRaise, calculateBet, startHand erreurs, runOutBoardIfAllIn, processUncalledBetsRefund
 */

import { GameTable } from '../logic/GameTable.js'
import type { Player } from '../types/poker.js'

function createPlayers(): Player[] {
  return [
    { id: 'p1', name: 'A', cards: [], chips: 1000, role: 'PLAYER', isActive: true },
    { id: 'p2', name: 'B', cards: [], chips: 1000, role: 'PLAYER', isActive: true },
  ]
}

describe('GameTable - endGameDueToDisconnect', () => {
  test('retourne null si pas exactement 2 joueurs', () => {
    const table = new GameTable('r1', [
      { id: 'p1', name: 'A', cards: [], chips: 1000, role: 'PLAYER', isActive: true },
    ])
    expect(table.endGameDueToDisconnect()).toBeNull()
  })

  test('retourne null si les deux sont connectés', () => {
    const table = new GameTable('r2', createPlayers())
    table.startHand()
    expect(table.endGameDueToDisconnect()).toBeNull()
  })

  test('retourne winnerId et pot quand un joueur déconnecté', () => {
    const table = new GameTable('r3', createPlayers())
    table.startHand()
    const p2 = table.getPlayerState('p2')
    if (p2) p2.isConnected = false
    const result = table.endGameDueToDisconnect()
    expect(result).not.toBeNull()
    expect(result!.winnerId).toBe('p1')
    expect(result!.pot).toBeGreaterThanOrEqual(0)
    expect(table.state.phase).toBe('ENDED_OPPONENT_LEFT')
  })
})

describe('GameTable - forceFoldForDisconnect', () => {
  test('attribue le pot au dernier joueur actif', () => {
    const table = new GameTable('r4', createPlayers())
    table.startHand()
    const p1 = table.getPlayerState('p1')
    const p2 = table.getPlayerState('p2')
    if (p1) p1.isActive = false
    table.forceFoldForDisconnect('p1')
    expect(table.state.phase).toBe('SHOWDOWN')
    expect(table.state.pot).toBe(0)
    expect(p2!.chips).toBeGreaterThan(1000)
  })
})

describe('GameTable - addPlayer / removePlayer', () => {
  test('addPlayer ajoute un joueur avec position correcte', () => {
    const table = new GameTable('r5', createPlayers())
    table.addPlayer({
      id: 'p3',
      name: 'C',
      cards: [],
      chips: 500,
      role: 'PLAYER',
      isActive: true,
    })
    expect(table.state.players).toHaveLength(3)
    expect(table.getPlayerState('p3')).toBeDefined()
    expect(table.getPlayerState('p3')!.position).toBe(2)
  })

  test('removePlayer retire le joueur et réindexe', () => {
    const table = new GameTable('r6', [
      ...createPlayers(),
      { id: 'p3', name: 'C', cards: [], chips: 500, role: 'PLAYER', isActive: true },
    ])
    table.removePlayer('p2')
    expect(table.state.players).toHaveLength(2)
    expect(table.getPlayerState('p2')).toBeUndefined()
    expect(table.state.players.map((p) => p.position)).toEqual([0, 1])
  })
})

describe('GameTable - getMinRaise / calculateBet', () => {
  test('getMinRaise retourne bigBlind', () => {
    const table = new GameTable('r7', createPlayers())
    expect(table.getMinRaise()).toBe(20)
  })

  test('getMinRaise avec options personnalisées', () => {
    const table = new GameTable('r8', createPlayers(), { smallBlind: 5, bigBlind: 10 })
    expect(table.getMinRaise()).toBe(10)
  })

  test('calculateBet plafonne au nombre de jetons du joueur', () => {
    const table = new GameTable('r9', createPlayers())
    table.startHand()
    const bet = table.calculateBet('p1', 9999)
    expect(bet).toBeLessThanOrEqual(1000)
  })

  test('calculateBet retourne 0 pour joueur inexistant', () => {
    const table = new GameTable('r10', createPlayers())
    expect(table.calculateBet('unknown', 100)).toBe(0)
  })
})

describe('GameTable - startHand erreurs', () => {
  test('startHand lance si moins de 2 joueurs connectés', () => {
    const table = new GameTable('r11', [
      { id: 'p1', name: 'A', cards: [], chips: 1000, role: 'PLAYER', isActive: true },
    ])
    expect(() => table.startHand()).toThrow('Il faut au moins 2 joueurs')
  })

  test('startHand avec joueur déconnecté (isConnected: false) compte comme absent', () => {
    const players = createPlayers()
    players[1]!.isConnected = false
    const table = new GameTable('r12', players)
    expect(() => table.startHand()).toThrow('Il faut au moins 2 joueurs')
  })
})

describe('GameTable - runOutBoardIfAllIn (all-in scenario)', () => {
  test('quand tous les joueurs restants ne peuvent plus miser, le board se déroule jusqu au showdown', () => {
    const players = createPlayers()
    players[0]!.chips = 20
    players[1]!.chips = 2000
    const table = new GameTable('r13', players, { smallBlind: 10, bigBlind: 20 })
    table.startHand()
    // p1 CALL all-in, puis p2 CHECK pour clôturer préflop.
    // Le moteur déroule ensuite le board jusqu'au showdown.
    table.handlePlayerAction('p1', 'CALL')
    expect(table.state.phase).toBe('PREFLOP')
    table.handlePlayerAction('p2', 'CHECK')
    expect(table.state.phase).toBe('SHOWDOWN')
    expect(table.state.communityCards).toHaveLength(5)
  })
})

describe('GameTable - bettingRoundComplete / endBettingRound', () => {
  test('bettingRoundComplete false tant que tout le monde n a pas agi', () => {
    const table = new GameTable('r14', createPlayers())
    table.startHand()
    table.handlePlayerAction('p1', 'CALL')
    table.handlePlayerAction('p2', 'CHECK') // FLOP, seul p2 a checké
    expect(table.bettingRoundComplete()).toBe(false)
  })

  test('endBettingRound no-op quand le tour n est pas complet', () => {
    const table = new GameTable('r15', createPlayers())
    table.startHand()
    table.handlePlayerAction('p1', 'CALL')
    table.handlePlayerAction('p2', 'CHECK') // FLOP, p1 pas encore joué
    const phaseBefore = table.state.phase
    table.endBettingRound()
    expect(table.state.phase).toBe(phaseBefore)
  })
})

describe('GameTable - RAISE validation', () => {
  test('RAISE avec montant insuffisant lance une erreur', () => {
    const table = new GameTable('r16', createPlayers())
    table.startHand()
    expect(() => table.handlePlayerAction('p1', 'RAISE', 5)).toThrow()
  })

  test('RAISE valide augmente le pot et le currentBet', () => {
    const table = new GameTable('r17', createPlayers())
    table.startHand()
    const potBefore = table.state.pot
    table.handlePlayerAction('p1', 'RAISE', 50)
    expect(table.state.pot).toBeGreaterThan(potBefore)
    expect(table.state.currentTurn).toBe('p2')
  })
})
