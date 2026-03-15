/**
 * =============================================================================
 * EVALUATOR.EXTENDED.TEST.TS — Tests étendus de l’évaluateur de mains
 * =============================================================================
 *
 * Complète Evaluator.test.ts en couvrant :
 * - getHandInfo() (catégorie + nom de main en français)
 * - findWinnerWithHand() (gagnant + infos de la main gagnante)
 * - findWinners() (ex-aequo, split pot)
 * - Classe Evaluator (evaluateHand, compareHands)
 * - Cas limites : liste de joueurs vide, moins de 5 cartes
 *
 * Tous les tests sont commentés de A à Z.
 * =============================================================================
 */

import {
  getHandValue,
  getHandInfo,
  findWinner,
  findWinnerWithHand,
  findWinners,
  Evaluator,
  HandRank,
} from '../logic/Evaluator.js';
import type { Card, Player, Rank, Suit } from '../types/poker.js';

/** Helper : crée une carte à partir d’un rang et d’une couleur (chaînes). */
function card(rank: string, suit: string): Card {
  const value =
    rank === 'J' ? 11 : rank === 'Q' ? 12 : rank === 'K' ? 13 : rank === 'A' ? 14 : parseInt(rank, 10);
  return { rank: rank as Rank, suit: suit as Suit, value };
}

/** Helper : crée un joueur avec deux cartes. */
function player(id: string, name: string, cards: Card[]): Player {
  return { id, name, cards, chips: 1000, role: 'PLAYER', isActive: true };
}

// -----------------------------------------------------------------------------
// getHandInfo
// -----------------------------------------------------------------------------
describe('Evaluator - getHandInfo', () => {
  test('retourne category et handName pour une paire', () => {
    const cards = [
      card('2', 'HEARTS'),
      card('2', 'DIAMONDS'),
      card('6', 'CLUBS'),
      card('8', 'SPADES'),
      card('10', 'HEARTS'),
    ];
    const info = getHandInfo(cards);
    expect(info).toHaveProperty('category');
    expect(info).toHaveProperty('handName');
    expect(typeof info.category).toBe('number');
    expect(info.category).toBeGreaterThanOrEqual(0);
    expect(info.handName).toBe('Paire');
  });

  test('retourne un nom de main en français pour quinte flush', () => {
    const cards = [
      card('2', 'HEARTS'),
      card('3', 'HEARTS'),
      card('4', 'HEARTS'),
      card('5', 'HEARTS'),
      card('6', 'HEARTS'),
    ];
    const info = getHandInfo(cards);
    expect(info.handName).toBe('Quinte flush');
    expect(info.category).toBe(8);
  });

  test('fonctionne avec moins de 5 cartes (haute carte)', () => {
    const cards = [card('A', 'SPADES'), card('K', 'HEARTS')];
    const info = getHandInfo(cards);
    expect(info).toHaveProperty('handName');
    expect(info.category).toBe(0);
  });
});

// -----------------------------------------------------------------------------
// findWinnerWithHand
// -----------------------------------------------------------------------------
describe('Evaluator - findWinnerWithHand', () => {
  test('retourne winnerId, category et handName du gagnant', () => {
    const board = [
      card('2', 'HEARTS'),
      card('3', 'DIAMONDS'),
      card('4', 'CLUBS'),
      card('5', 'SPADES'),
      card('6', 'HEARTS'),
    ];
    const p1 = player('p1', 'J1', [card('7', 'CLUBS'), card('8', 'DIAMONDS')]);
    const p2 = player('p2', 'J2', [card('10', 'SPADES'), card('J', 'HEARTS')]);
    const result = findWinnerWithHand([p1, p2], board);
    expect(result).toHaveProperty('winnerId');
    expect(result).toHaveProperty('category');
    expect(result).toHaveProperty('handName');
    expect(result.winnerId).toBe('p1');
    expect(result.category).toBe(4);
    expect(result.handName).toBe('Quinte');
  });

  test('lève une erreur si la liste de joueurs est vide', () => {
    const board = [card('2', 'HEARTS'), card('3', 'HEARTS'), card('4', 'HEARTS'), card('5', 'HEARTS'), card('6', 'HEARTS')];
    expect(() => findWinnerWithHand([], board)).toThrow('findWinnerWithHand: players list is empty');
  });
});

// -----------------------------------------------------------------------------
// findWinner (cas limites)
// -----------------------------------------------------------------------------
describe('Evaluator - findWinner cas limites', () => {
  test('findWinner lève si players est vide', () => {
    const board = [card('A', 'HEARTS'), card('K', 'HEARTS'), card('Q', 'HEARTS'), card('J', 'HEARTS'), card('10', 'HEARTS')];
    expect(() => findWinner([], board)).toThrow('findWinner: players list is empty');
  });

  test('findWinner avec un seul joueur retourne son id', () => {
    const board = [card('2', 'HEARTS'), card('3', 'DIAMONDS'), card('4', 'CLUBS'), card('5', 'SPADES'), card('6', 'CLUBS')];
    const p1 = player('only', 'Solo', [card('7', 'HEARTS'), card('8', 'SPADES')]);
    expect(findWinner([p1], board)).toBe('only');
  });
});

// -----------------------------------------------------------------------------
// findWinners (ex-aequo)
// -----------------------------------------------------------------------------
describe('Evaluator - findWinners (ex-aequo)', () => {
  test('deux joueurs même main retournent les deux ids', () => {
    const board = [
      card('2', 'HEARTS'),
      card('2', 'DIAMONDS'),
      card('4', 'CLUBS'),
      card('6', 'SPADES'),
      card('8', 'HEARTS'),
    ];
    const p1 = player('p1', 'J1', [card('A', 'CLUBS'), card('K', 'DIAMONDS')]);
    const p2 = player('p2', 'J2', [card('A', 'SPADES'), card('K', 'HEARTS')]);
    const winners = findWinners([p1, p2], board);
    expect(winners).toContain('p1');
    expect(winners).toContain('p2');
    expect(winners).toHaveLength(2);
  });

  test('un seul gagnant quand les mains diffèrent', () => {
    const board = [
      card('2', 'HEARTS'),
      card('3', 'DIAMONDS'),
      card('4', 'CLUBS'),
      card('5', 'SPADES'),
      card('6', 'HEARTS'),
    ];
    const p1 = player('p1', 'J1', [card('7', 'CLUBS'), card('8', 'DIAMONDS')]);
    const p2 = player('p2', 'J2', [card('2', 'SPADES'), card('3', 'CLUBS')]);
    const winners = findWinners([p1, p2], board);
    expect(winners).toEqual(['p1']);
  });
});

// -----------------------------------------------------------------------------
// getHandValue - cas limites
// -----------------------------------------------------------------------------
describe('Evaluator - getHandValue cas limites', () => {
  test('moins de 5 cartes retourne un score positif (haute carte)', () => {
    const cards = [card('A', 'HEARTS'), card('K', 'SPADES')];
    const score = getHandValue(cards);
    expect(score).toBeGreaterThan(0);
  });

  test('7 cartes (2 hole + 5 board) utilise les 5 meilleures', () => {
    const cards = [
      card('A', 'HEARTS'),
      card('A', 'DIAMONDS'),
      card('K', 'CLUBS'),
      card('K', 'SPADES'),
      card('Q', 'HEARTS'),
      card('J', 'DIAMONDS'),
      card('10', 'CLUBS'),
    ];
    const score = getHandValue(cards);
    expect(score).toBeGreaterThan(6000);
  });
});

// -----------------------------------------------------------------------------
// Classe Evaluator (rétrocompatibilité)
// -----------------------------------------------------------------------------
describe('Evaluator - Classe statique', () => {
  test('Evaluator.evaluateHand retourne rank et value', () => {
    const cards = [
      card('2', 'HEARTS'),
      card('2', 'DIAMONDS'),
      card('6', 'CLUBS'),
      card('8', 'SPADES'),
      card('10', 'HEARTS'),
    ];
    const result = Evaluator.evaluateHand(cards);
    expect(result).toHaveProperty('rank');
    expect(result).toHaveProperty('value');
    expect(Object.values(HandRank)).toContain(result.rank);
    expect(result.value).toBeGreaterThan(0);
  });

  test('Evaluator.compareHands retourne 1 si hand1 > hand2', () => {
    const hand1 = [
      card('A', 'HEARTS'),
      card('A', 'DIAMONDS'),
      card('K', 'CLUBS'),
      card('Q', 'SPADES'),
      card('J', 'HEARTS'),
    ];
    const hand2 = [
      card('K', 'HEARTS'),
      card('K', 'DIAMONDS'),
      card('Q', 'CLUBS'),
      card('J', 'SPADES'),
      card('10', 'HEARTS'),
    ];
    expect(Evaluator.compareHands(hand1, hand2)).toBe(1);
  });

  test('Evaluator.compareHands retourne -1 si hand1 < hand2', () => {
    const hand1 = [
      card('K', 'HEARTS'),
      card('K', 'DIAMONDS'),
      card('Q', 'CLUBS'),
      card('J', 'SPADES'),
      card('10', 'HEARTS'),
    ];
    const hand2 = [
      card('A', 'HEARTS'),
      card('A', 'DIAMONDS'),
      card('K', 'CLUBS'),
      card('Q', 'SPADES'),
      card('J', 'HEARTS'),
    ];
    expect(Evaluator.compareHands(hand1, hand2)).toBe(-1);
  });

  test('Evaluator.compareHands retourne 0 pour mains égales', () => {
    const hand = [
      card('A', 'HEARTS'),
      card('K', 'DIAMONDS'),
      card('Q', 'CLUBS'),
      card('J', 'SPADES'),
      card('10', 'HEARTS'),
    ];
    expect(Evaluator.compareHands(hand, [...hand])).toBe(0);
  });
});
