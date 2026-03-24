/**
 * =============================================================================
 * GAMETABLE.EXTENDED.TEST.TS — Tests étendus du moteur de table (GameTable)
 * =============================================================================
 *
 * Complète GameTable.test.ts en couvrant :
 * - getPlayerState() : récupération d’un joueur par id
 * - getState() / getSanitizedState() : fog of war (cartes masquées selon joueur)
 * - calculateCallAmount() en différentes situations
 * - canPlayerAct() selon le currentTurn
 * - advancePhase jusqu’au showdown et resolveShowdown
 *
 * Tous les tests sont commentés de A à Z.
 * =============================================================================
 */

import { GameTable } from '../logic/GameTable.js';
import type { Player } from '../types/poker.js';

/** Crée deux joueurs type heads-up pour les tests. */
function createPlayers(): Player[] {
  return [
    { id: 'p1', name: 'Azra', cards: [], chips: 1000, role: 'PLAYER', isActive: true },
    { id: 'p2', name: 'Soheil', cards: [], chips: 1000, role: 'PLAYER', isActive: true },
  ];
}

describe('GameTable - getPlayerState', () => {
  let table: GameTable;

  beforeEach(() => {
    table = new GameTable('room1', createPlayers());
    table.startHand();
  });

  /** getPlayerState(id) retourne le joueur dont l’id correspond. */
  test('retourne le joueur existant par id', () => {
    const p1 = table.getPlayerState('p1');
    const p2 = table.getPlayerState('p2');
    expect(p1).toBeDefined();
    expect(p2).toBeDefined();
    expect(p1!.id).toBe('p1');
    expect(p2!.id).toBe('p2');
    expect(p1!.cards).toHaveLength(2);
    expect(p2!.cards).toHaveLength(2);
  });

  /** getPlayerState(id inconnu) retourne undefined. */
  test('retourne undefined pour un id inconnu', () => {
    expect(table.getPlayerState('unknown')).toBeUndefined();
  });
});

describe('GameTable - getState', () => {
  test('getState retourne un état complet avec id, pot, phase, players, currentTurn', () => {
    const table = new GameTable('room2', createPlayers());
    table.startHand();
    const state = table.getState();
    expect(state).toHaveProperty('id', 'room2');
    expect(state).toHaveProperty('pot');
    expect(state).toHaveProperty('phase');
    expect(state).toHaveProperty('players');
    expect(state).toHaveProperty('currentTurn');
    expect(state.players).toHaveLength(2);
    expect(state.players[0].cards).toHaveLength(2);
    expect(state.players[1].cards).toHaveLength(2);
  });
});

describe('GameTable - getSanitizedState (fog of war)', () => {
  test('pour le joueur demandeur, ses cartes sont visibles', () => {
    const table = new GameTable('room3', createPlayers());
    table.startHand();
    const state = table.getSanitizedState('p1');
    const requester = state.players.find((p) => p.id === 'p1');
    const other = state.players.find((p) => p.id === 'p2');
    expect(requester!.cards).toHaveLength(2);
    expect(other!.cards).toHaveLength(0);
  });

  test('sans requestingPlayerId, les cartes de tous les joueurs sont masquées (ou vides selon implémentation)', () => {
    const table = new GameTable('room4', createPlayers());
    table.startHand();
    const state = table.getSanitizedState();
    state.players.forEach((p) => {
      expect(p.cards).toHaveLength(0);
    });
  });
});

describe('GameTable - calculateCallAmount', () => {
  test('small blind doit compléter à la big blind (10 en heads-up)', () => {
    const table = new GameTable('room5', createPlayers());
    table.startHand();
    const callP1 = table.calculateCallAmount('p1');
    expect(callP1).toBe(10);
  });

  test('big blind peut check (call 0) après que small blind a call', () => {
    const table = new GameTable('room6', createPlayers());
    table.startHand();
    table.handlePlayerAction('p1', 'CALL');
    const callP2 = table.calculateCallAmount('p2');
    expect(callP2).toBe(0);
  });
});

describe('GameTable - canPlayerAct', () => {
  test('seul le joueur dont c’est le tour peut agir', () => {
    const table = new GameTable('room7', createPlayers());
    table.startHand();
    expect(table.canPlayerAct('p1')).toBe(true);
    expect(table.canPlayerAct('p2')).toBe(false);
  });

  test('après un CALL de p1, c’est au tour de p2', () => {
    const table = new GameTable('room8', createPlayers());
    table.startHand();
    table.handlePlayerAction('p1', 'CALL');
    expect(table.canPlayerAct('p1')).toBe(false);
    expect(table.canPlayerAct('p2')).toBe(true);
  });
});

describe('GameTable - advancePhase et showdown', () => {
  test('advancePhase jusqu’au SHOWDOWN remplit communityCards (5 cartes)', () => {
    const table = new GameTable('room9', createPlayers());
    table.startHand();
    table.advancePhase();
    expect(table.state.phase).toBe('FLOP');
    expect(table.state.communityCards).toHaveLength(3);
    table.advancePhase();
    table.advancePhase();
    table.advancePhase();
    expect(table.state.phase).toBe('SHOWDOWN');
    expect(table.state.communityCards).toHaveLength(5);
  });

  test('au SHOWDOWN après 4 advancePhase, resolveShowdown remplit showdownWinnerId et showdownHandName', () => {
    const table = new GameTable('room10', createPlayers());
    table.startHand();
    table.advancePhase();
    table.advancePhase();
    table.advancePhase();
    table.advancePhase();
    expect(table.state.phase).toBe('SHOWDOWN');
    expect(table.state.showdownWinnerId).toBeDefined();
    expect(table.state.showdownHandName).toBeDefined();
    expect(table.state.pot).toBe(0);
  });
});
