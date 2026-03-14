import { getHandValue, findWinner, findWinners } from '../logic/Evaluator.js';
import type { Card, Player, Rank, Suit } from '../types/poker.js';

describe('Evaluator - Mains de poker', () => {
  
  // Helper pour créer des cartes facilement
  const card = (rank: string, suit: string): Card => ({
    rank: rank as Rank,
    suit: suit as Suit,
    value: rank === 'J' ? 11 : rank === 'Q' ? 12 : rank === 'K' ? 13 : rank === 'A' ? 14 : parseInt(rank)
  });

  describe('getHandValue', () => {
    
    test('Carte haute', () => {
      const cards = [
        card('2', 'HEARTS'),
        card('4', 'DIAMONDS'),
        card('6', 'CLUBS'),
        card('8', 'SPADES'),
        card('10', 'HEARTS')
      ];
      const value = getHandValue(cards);
      expect(value).toBeGreaterThan(0);
    });

    test('Paire', () => {
      const cards = [
        card('2', 'HEARTS'),
        card('2', 'DIAMONDS'),
        card('6', 'CLUBS'),
        card('8', 'SPADES'),
        card('10', 'HEARTS')
      ];
      const value = getHandValue(cards);
      expect(value).toBeGreaterThan(1000); // Devrait être > carte haute
    });

    test('Double paire', () => {
      const cards = [
        card('2', 'HEARTS'),
        card('2', 'DIAMONDS'),
        card('6', 'CLUBS'),
        card('6', 'SPADES'),
        card('10', 'HEARTS')
      ];
      const value = getHandValue(cards);
      expect(value).toBeGreaterThan(2000);
    });

    test('Brelan', () => {
      const cards = [
        card('2', 'HEARTS'),
        card('2', 'DIAMONDS'),
        card('2', 'CLUBS'),
        card('8', 'SPADES'),
        card('10', 'HEARTS')
      ];
      const value = getHandValue(cards);
      expect(value).toBeGreaterThan(3000);
    });

    test('Quinte', () => {
      const cards = [
        card('2', 'HEARTS'),
        card('3', 'DIAMONDS'),
        card('4', 'CLUBS'),
        card('5', 'SPADES'),
        card('6', 'HEARTS')
      ];
      const value = getHandValue(cards);
      expect(value).toBeGreaterThan(4000);
    });

    test('Quinte blanche (A-2-3-4-5)', () => {
      const cards = [
        card('A', 'HEARTS'),
        card('2', 'DIAMONDS'),
        card('3', 'CLUBS'),
        card('4', 'SPADES'),
        card('5', 'HEARTS')
      ];
      const value = getHandValue(cards);
      expect(value).toBeGreaterThan(4000);
    });

    test('Couleur', () => {
      const cards = [
        card('2', 'HEARTS'),
        card('4', 'HEARTS'),
        card('6', 'HEARTS'),
        card('8', 'HEARTS'),
        card('10', 'HEARTS')
      ];
      const value = getHandValue(cards);
      expect(value).toBeGreaterThan(5000);
    });

    test('Full', () => {
      const cards = [
        card('2', 'HEARTS'),
        card('2', 'DIAMONDS'),
        card('2', 'CLUBS'),
        card('8', 'SPADES'),
        card('8', 'HEARTS')
      ];
      const value = getHandValue(cards);
      expect(value).toBeGreaterThan(6000);
    });

    test('Carré', () => {
      const cards = [
        card('2', 'HEARTS'),
        card('2', 'DIAMONDS'),
        card('2', 'CLUBS'),
        card('2', 'SPADES'),
        card('10', 'HEARTS')
      ];
      const value = getHandValue(cards);
      expect(value).toBeGreaterThan(7000);
    });

    test('Quinte flush', () => {
      const cards = [
        card('2', 'HEARTS'),
        card('3', 'HEARTS'),
        card('4', 'HEARTS'),
        card('5', 'HEARTS'),
        card('6', 'HEARTS')
      ];
      const value = getHandValue(cards);
      expect(value).toBeGreaterThan(8000);
    });

    test('Quinte flush royale', () => {
      const cards = [
        card('10', 'HEARTS'),
        card('J', 'HEARTS'),
        card('Q', 'HEARTS'),
        card('K', 'HEARTS'),
        card('A', 'HEARTS')
      ];
      const value = getHandValue(cards);
      expect(value).toBeGreaterThan(8000);
    });
  });

  describe('Cas d\'égalité (split pot)', () => {
    
    test('Deux joueurs avec la même quinte', () => {
      const board = [
        card('2', 'HEARTS'),
        card('3', 'HEARTS'),
        card('4', 'HEARTS'),
        card('5', 'HEARTS'),
        card('6', 'CLUBS')
      ];

      const player1: Player = {
        id: 'p1',
        name: 'Joueur1',
        cards: [card('A', 'CLUBS'), card('K', 'DIAMONDS')], // Quinte 2-3-4-5-6
        chips: 1000,
        role: 'PLAYER',
        isActive: true
      };

      const player2: Player = {
        id: 'p2',
        name: 'Joueur2',
        cards: [card('7', 'SPADES'), card('8', 'HEARTS')], // Quinte 4-5-6-7-8 (plus haute)
        chips: 1000,
        role: 'PLAYER',
        isActive: true
      };

      const winners = findWinners([player1, player2], board);
      
      // Player2 a la meilleure quinte
      expect(winners).toContain('p2');
      expect(winners).not.toContain('p1');
      expect(winners.length).toBe(1);
    });

    test('Deux joueurs avec la même paire, kicker différent', () => {
      const board = [
        card('2', 'HEARTS'),
        card('2', 'DIAMONDS'),
        card('4', 'CLUBS'),
        card('5', 'SPADES'),
        card('6', 'HEARTS')
      ];

      const player1: Player = {
        id: 'p1',
        name: 'Joueur1',
        cards: [card('A', 'CLUBS'), card('K', 'DIAMONDS')],
        chips: 1000,
        role: 'PLAYER',
        isActive: true
      };

      const player2: Player = {
        id: 'p2',
        name: 'Joueur2',
        cards: [card('Q', 'SPADES'), card('J', 'HEARTS')],
        chips: 1000,
        role: 'PLAYER',
        isActive: true
      };

      const winner = findWinner([player1, player2], board);
      expect(winner).toBe('p1'); // As en kicker
    });
  });

  describe('resolveShowdown', () => {
    test('findWinner retourne le bon gagnant', () => {
      const board = [
        card('2', 'HEARTS'),
        card('3', 'DIAMONDS'),
        card('4', 'CLUBS'),
        card('5', 'SPADES'),
        card('6', 'HEARTS')
      ];

      const player1: Player = {
        id: 'p1',
        name: 'Joueur1',
        cards: [card('7', 'CLUBS'), card('8', 'DIAMONDS')], // Quinte max
        chips: 1000,
        role: 'PLAYER',
        isActive: true
      };

      const player2: Player = {
        id: 'p2',
        name: 'Joueur2',
        cards: [card('2', 'SPADES'), card('3', 'CLUBS')], // Double paire
        chips: 1000,
        role: 'PLAYER',
        isActive: true
      };

      const winner = findWinner([player1, player2], board);
      expect(winner).toBe('p1');
    });
  });
});