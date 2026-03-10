// server/src/__tests__/GameTable.test.ts - PATHS FINAUX
import { GameTable } from '../logic/GameTable';
import type { Player } from '../types/poker';

// ✅ PATHS CORRECTS depuis src/__tests__/
jest.mock('./logic/Deck', () => ({
  generateDeck: () => ({ cards: [], burnedCards: [], dealtCount: 0 }),
  shuffle: jest.fn(),
  dealInitialCards: jest.fn((deck, players) => players),
  dealFlop: jest.fn(() => [{ suit: 'H', rank: 'A', value: 14 }]),
  dealTurn: jest.fn(() => ({ suit: 'H', rank: 'K', value: 13 })),
  dealRiver: jest.fn(() => ({ suit: 'H', rank: 'Q', value: 12 }))
}));

jest.mock('./logic/Evaluator', () => ({
  findWinner: jest.fn(() => 'p1'),
  getHandValue: jest.fn(() => 1000)
}));

describe('GameTable - Moteur Principal', () => {
  let table: GameTable;
  const players: Player[] = [
    { id: 'p1', name: 'Azra', cards: [], chips: 1000, role: 'PLAYER' },
    { id: 'p2', name: 'Soheil', cards: [], chips: 1000, role: 'PLAYER' }
  ];

  beforeEach(() => {
    table = new GameTable('room1', [...players]);
  });

  test('startHand initialise deck + PREFLOP', () => {
    const Deck = require('./logic/Deck');
    
    table.startHand();
    
    expect(Deck.shuffle).toHaveBeenCalled();
    expect(Deck.dealInitialCards).toHaveBeenCalled();
    expect(table.state.phase).toBe('PREFLOP');
    expect(table.state.pot).toBe(0);
  });

  test('getSanitizedState applique Fog of War', () => {
    table.startHand();
    
    const azraState = table.getSanitizedState('p1');
    
    expect(azraState.players[0].cards.length).toBe(2);
    expect(azraState.players[1].cards.length).toBe(0);
  });

  test('advancePhase gère séquence FLOP→TURN→RIVER', () => {
    table.startHand();
    
    table.advancePhase();
    expect(table.state.phase).toBe('FLOP');
    
    table.advancePhase();
    expect(table.state.phase).toBe('TURN');
  });
});
