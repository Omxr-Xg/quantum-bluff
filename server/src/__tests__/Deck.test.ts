
// ------------------------------
// TESTS (src/__tests__/Deck.test.ts)
// ------------------------------

import { Deck } from '../logic/Deck.js';
import type { Player } from '../types/poker.js';

test('initializeDeck génère 52 cartes uniques', () => {
  const deck = new Deck();
  expect(deck.getRemainingCards()).toBe(52);
});

test('shuffle préserve 52 cartes', () => {
  const deck = new Deck();
  deck.shuffle();
  expect(deck.getRemainingCards()).toBe(52);
});

test('dealInitialCards donne 2 cartes par joueur', () => {
  const players: Player[] = [
    { id: 'p1', name: 'J1', chips: 1000, cards: [], role: 'PLAYER', isActive: true },
    { id: 'p2', name: 'J2', chips: 1000, cards: [], role: 'PLAYER', isActive: true }
  ];
  const deck = new Deck();
  deck.dealInitialCards(players);
  expect(players[0].cards!.length).toBe(2);
  expect(players[1].cards!.length).toBe(2);
  expect(deck.getRemainingCards()).toBe(48);
});

test('dealFlop: burn + 3 cartes', () => {
  const deck = new Deck();
  const flop = deck.dealFlop();
  expect(flop.length).toBe(3);
  expect(deck.burnedCards.length).toBe(1);
  expect(deck.getRemainingCards()).toBe(48);
});

