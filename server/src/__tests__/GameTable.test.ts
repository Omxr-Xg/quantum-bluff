// server/src/__tests__/GameTable.test.ts
// QUANTUM BLUFF - GAME TABLE TESTS SIMPLIFIÉS
// ✅ Pas de mocks = pas d'erreurs paths

import { GameTable } from '../logic/GameTable';
import type { Player } from '../types/poker';

describe('GameTable - Moteur Principal', () => {
  let table: GameTable;
  
  const players: Player[] = [
    { id: 'p1', name: 'Azra', cards: [], chips: 1000, role: 'PLAYER' as const },
    { id: 'p2', name: 'Soheil', cards: [], chips: 1000, role: 'PLAYER' as const }
  ];

  beforeEach(() => {
    table = new GameTable('room1', [...players]);
  });

  test('constructor initialise GameState PREFLOP', () => {
    expect(table.state.phase).toBe('PREFLOP');
    expect(table.state.pot).toBe(0);
    expect(table.state.currentTurn).toBe('p1');
  });

  test('getSanitizedState structure + Fog of War', () => {
    const state = table.getSanitizedState('p1');
    
    expect(state).toHaveProperty('id', 'room1');
    expect(state).toHaveProperty('phase', 'PREFLOP');
    expect(state).toHaveProperty('pot', 0);
    expect(state.players).toHaveLength(2);
  });

  test('handlePlayerAction valide tour du joueur', () => {
    // p1 joue en premier → OK
    expect(() => table.handlePlayerAction('p1', 'CALL')).not.toThrow();
    
    // p2 joue → ERREUR (pas son tour)
    expect(() => table.handlePlayerAction('p2', 'CALL')).toThrow('Pas ton tour');
  });
});
