/**
 * =============================================================================
 * POKER.TYPES.TEST.TS — Tests des types et contrats poker
 * =============================================================================
 *
 * Ce fichier vérifie que les types et constantes du module poker (GamePhase,
 * Suit, Rank, Card, Player, GameState) sont cohérents et que les structures
 * attendues par le reste du code sont respectées.
 *
 * Les tests sont purement structurels (shape) et n’exécutent pas de logique
 * métier ; ils servent de garde-fou pour les refactorings.
 * =============================================================================
 */

import type { Card, GamePhase, GameState, Player, Rank, Suit } from '../types/poker.js';

describe('poker.types - GamePhase', () => {
  /** Les phases de jeu attendues par le moteur et le client. */
  const validPhases: GamePhase[] = [
    'WAITING',
    'PREFLOP',
    'FLOP',
    'TURN',
    'RIVER',
    'SHOWDOWN',
    'ENDED_OPPONENT_LEFT',
  ];

  test('toutes les phases définies sont des chaînes non vides', () => {
    validPhases.forEach((phase) => {
      expect(typeof phase).toBe('string');
      expect(phase.length).toBeGreaterThan(0);
    });
  });

  test('nombre de phases connu (7) pour compatibilité client', () => {
    expect(validPhases).toHaveLength(7);
  });
});

describe('poker.types - Suit et Rank', () => {
  const validSuits: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
  const validRanks: Rank[] = [
    '2', '3', '4', '5', '6', '7', '8', '9', '10',
    'J', 'Q', 'K', 'A',
  ];

  test('4 couleurs (Suit)', () => {
    expect(validSuits).toHaveLength(4);
  });

  test('13 rangs (Rank)', () => {
    expect(validRanks).toHaveLength(13);
  });
});

describe('poker.types - Card', () => {
  /** Une carte valide doit avoir suit, rank et value (number). */
  test('objet Card a les propriétés requises', () => {
    const card: Card = {
      suit: 'HEARTS',
      rank: 'A',
      value: 14,
    };
    expect(card).toHaveProperty('suit');
    expect(card).toHaveProperty('rank');
    expect(card).toHaveProperty('value');
    expect(typeof card.value).toBe('number');
  });

  test('value compris entre 2 et 14 pour un rang valide', () => {
    const card: Card = { suit: 'SPADES', rank: 'K', value: 13 };
    expect(card.value).toBeGreaterThanOrEqual(2);
    expect(card.value).toBeLessThanOrEqual(14);
  });
});

describe('poker.types - Player', () => {
  /** Joueur minimal pour création de partie. */
  test('Player minimal a id, name, chips, cards, role, isActive', () => {
    const player: Player = {
      id: 'user-1',
      name: 'Alice',
      chips: 1000,
      cards: [],
      role: 'PLAYER',
      isActive: true,
    };
    expect(player.id).toBeDefined();
    expect(player.name).toBeDefined();
    expect(typeof player.chips).toBe('number');
    expect(Array.isArray(player.cards)).toBe(true);
    expect(player.role).toBeDefined();
    expect(typeof player.isActive).toBe('boolean');
  });

  test('Player peut avoir currentBet, position, isDealer, isConnected', () => {
    const player: Player = {
      id: 'p2',
      name: 'Bob',
      chips: 500,
      cards: [],
      role: 'BIG_BLIND',
      isActive: true,
      currentBet: 20,
      position: 1,
      isDealer: false,
      isConnected: true,
    };
    expect(player.currentBet).toBe(20);
    expect(player.position).toBe(1);
    expect(player.isDealer).toBe(false);
    expect(player.isConnected).toBe(true);
  });
});

describe('poker.types - GameState', () => {
  /** État de jeu minimal retourné par getSanitizedState. */
  test('GameState a id?, pot, communityCards, players, currentTurn, phase', () => {
    const state: GameState = {
      id: 'room-1',
      pot: 100,
      communityCards: [],
      players: [],
      currentTurn: '',
      phase: 'PREFLOP',
    };
    expect(state).toHaveProperty('pot');
    expect(state).toHaveProperty('communityCards');
    expect(state).toHaveProperty('players');
    expect(state).toHaveProperty('currentTurn');
    expect(state).toHaveProperty('phase');
    expect(Array.isArray(state.communityCards)).toBe(true);
    expect(Array.isArray(state.players)).toBe(true);
  });

  test('GameState peut avoir showdownWinnerId, showdownHandName, showdownPot', () => {
    const state: GameState = {
      pot: 0,
      communityCards: [],
      players: [],
      currentTurn: '',
      phase: 'SHOWDOWN',
      showdownWinnerId: 'p1',
      showdownHandName: 'Quinte flush',
      showdownPot: 200,
    };
    expect(state.showdownWinnerId).toBe('p1');
    expect(state.showdownHandName).toBe('Quinte flush');
    expect(state.showdownPot).toBe(200);
  });
});
