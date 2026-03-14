/**
 * =============================================================================
 * DECK.TEST.TS — Tests unitaires du module Deck (jeu de cartes)
 * =============================================================================
 *
 * Ce fichier teste toutes les fonctionnalités de la classe Deck utilisée
 * pour le poker Texas Hold'em : initialisation, mélange, tirage, brûlage,
 * distribution aux joueurs (deal initial, flop, turn, river) et reset.
 *
 * Chaque bloc describe() regroupe des tests par thème.
 * Chaque test() est commenté pour expliquer l’intention et les assertions.
 * =============================================================================
 */

import { Deck } from '../logic/Deck.js';
import type { Player } from '../types/poker.js';

// -----------------------------------------------------------------------------
// INITIALISATION DU DECK
// -----------------------------------------------------------------------------
describe('Deck - Initialisation', () => {
  /**
   * Vérifie qu’un nouveau deck contient exactement 52 cartes (4 couleurs × 13 rangs).
   * getRemainingCards() doit refléter le nombre de cartes encore en main.
   */
  test('initializeDeck génère 52 cartes uniques', () => {
    const deck = new Deck();
    expect(deck.getRemainingCards()).toBe(52);
  });

  /**
   * Après un mélange, le nombre total de cartes ne doit pas changer :
   * shuffle() réorganise l’ordre, il ne retire ni n’ajoute de cartes.
   */
  test('shuffle préserve 52 cartes', () => {
    const deck = new Deck();
    deck.shuffle();
    expect(deck.getRemainingCards()).toBe(52);
  });
});

// -----------------------------------------------------------------------------
// TIRAGE DE CARTES (draw / drawCard)
// -----------------------------------------------------------------------------
describe('Deck - Tirage (draw)', () => {
  /**
   * draw(0) ne doit rien tirer et retourner un tableau vide.
   * Aucune carte ne doit être retirée du deck.
   */
  test('draw(0) retourne un tableau vide et ne modifie pas le deck', () => {
    const deck = new Deck();
    const drawn = deck.draw(0);
    expect(drawn).toEqual([]);
    expect(deck.getRemainingCards()).toBe(52);
  });

  /**
   * draw(count) avec un count négatif doit lever une erreur.
   * Comportement défensif pour éviter des appels invalides.
   */
  test('draw(count négatif) lève une erreur', () => {
    const deck = new Deck();
    expect(() => deck.draw(-1)).toThrow('draw(count) cannot use a negative count');
  });

  /**
   * draw(1) retire une carte et la retourne ; le deck passe à 51 cartes.
   */
  test('draw(1) retire une carte et retourne un tableau d’un élément', () => {
    const deck = new Deck();
    const drawn = deck.draw(1);
    expect(drawn).toHaveLength(1);
    expect(drawn[0]).toHaveProperty('suit');
    expect(drawn[0]).toHaveProperty('rank');
    expect(drawn[0]).toHaveProperty('value');
    expect(deck.getRemainingCards()).toBe(51);
  });

  /**
   * draw(5) retire 5 cartes ; le deck passe à 47.
   */
  test('draw(5) retire 5 cartes', () => {
    const deck = new Deck();
    const drawn = deck.draw(5);
    expect(drawn).toHaveLength(5);
    expect(deck.getRemainingCards()).toBe(47);
  });

  /**
   * Si on demande plus de cartes qu’il n’en reste, une erreur est levée.
   */
  test('draw(count > remaining) lève une erreur', () => {
    const deck = new Deck();
    deck.draw(50);
    expect(() => deck.draw(5)).toThrow(/Not enough cards/);
  });

  /**
   * drawCard() est un alias pour draw(1) ; on vérifie qu’il retourne une carte
   * et que le deck diminue de 1.
   */
  test('drawCard() retourne une carte et réduit le deck de 1', () => {
    const deck = new Deck();
    const card = deck.drawCard();
    expect(card).toBeDefined();
    expect(card).toHaveProperty('suit');
    expect(card).toHaveProperty('rank');
    expect(deck.getRemainingCards()).toBe(51);
  });
});

// -----------------------------------------------------------------------------
// BRÛLAGE (burn)
// -----------------------------------------------------------------------------
describe('Deck - Brûlage (burn)', () => {
  /**
   * burn() retire une carte du deck et l’ajoute à burnedCards.
   * Le nombre de cartes brûlées et le remaining sont mis à jour.
   */
  test('burn: une carte brûlée et remaining diminué', () => {
    const deck = new Deck();
    const burned = deck.burn();
    expect(burned).toBeDefined();
    expect(deck.burnedCards).toHaveLength(1);
    expect(deck.burnedCards[0]).toBe(burned);
    expect(deck.getRemainingCards()).toBe(51);
  });

  /**
   * Plusieurs burn() successifs accumulent les cartes brûlées.
   */
  test('plusieurs burn() accumulent burnedCards', () => {
    const deck = new Deck();
    deck.burn();
    deck.burn();
    deck.burn();
    expect(deck.burnedCards).toHaveLength(3);
    expect(deck.getRemainingCards()).toBe(49);
  });
});

// -----------------------------------------------------------------------------
// DISTRIBUTION INITIALE (dealInitialCards)
// -----------------------------------------------------------------------------
describe('Deck - Distribution initiale (dealInitialCards)', () => {
  /**
   * Chaque joueur reçoit exactement 2 cartes (2 tours de distribution).
   * Le deck diminue de 2 * nombre de joueurs.
   */
  test('dealInitialCards donne 2 cartes par joueur', () => {
    const players: Player[] = [
      { id: 'p1', name: 'J1', chips: 1000, cards: [], role: 'PLAYER', isActive: true },
      { id: 'p2', name: 'J2', chips: 1000, cards: [], role: 'PLAYER', isActive: true },
    ];
    const deck = new Deck();
    deck.dealInitialCards(players);
    expect(players[0].cards!).toHaveLength(2);
    expect(players[1].cards!).toHaveLength(2);
    expect(deck.getRemainingCards()).toBe(48);
  });

  /**
   * Si un joueur a déjà un tableau cards, il est complété (pas écrasé).
   * dealInitialCards initialise p.cards à [] si ce n’est pas un tableau.
   */
  test('dealInitialCards initialise cards si non-tableau', () => {
    const players: Player[] = [
      { id: 'p1', name: 'J1', chips: 1000, cards: [] as never[], role: 'PLAYER', isActive: true },
    ];
    const deck = new Deck();
    deck.dealInitialCards(players);
    expect(players[0].cards).toHaveLength(2);
  });
});

// -----------------------------------------------------------------------------
// FLOP / TURN / RIVER
// -----------------------------------------------------------------------------
describe('Deck - Flop, Turn, River', () => {
  /**
   * dealFlop() : 1 carte brûlée + 3 cartes retournées.
   * burnedCards.length === 1 et le deck diminue de 4 au total.
   */
  test('dealFlop: burn + 3 cartes', () => {
    const deck = new Deck();
    const flop = deck.dealFlop();
    expect(flop).toHaveLength(3);
    expect(deck.burnedCards).toHaveLength(1);
    expect(deck.getRemainingCards()).toBe(48);
  });

  /**
   * dealTurn() : 1 carte brûlée + 1 carte (turn).
   * Après dealFlop il reste 48 cartes ; dealTurn enlève 2 (burn + turn) => 46.
   */
  test('dealTurn: burn + 1 carte', () => {
    const deck = new Deck();
    deck.dealFlop();
    const turn = deck.dealTurn();
    expect(turn).toBeDefined();
    expect(deck.burnedCards).toHaveLength(2);
    expect(deck.getRemainingCards()).toBe(46);
  });

  /**
   * dealRiver() : 1 carte brûlée + 1 carte (river).
   * Après dealFlop + dealTurn il reste 46 cartes ; dealRiver enlève 2 => 44.
   */
  test('dealRiver: burn + 1 carte', () => {
    const deck = new Deck();
    deck.dealFlop();
    deck.dealTurn();
    const river = deck.dealRiver();
    expect(river).toBeDefined();
    expect(deck.burnedCards).toHaveLength(3);
    expect(deck.getRemainingCards()).toBe(44);
  });
});

// -----------------------------------------------------------------------------
// RESET ET DEBUG
// -----------------------------------------------------------------------------
describe('Deck - Reset et debug', () => {
  /**
   * reset() réinitialise le deck à 52 cartes, vide burnedCards et dealtCount.
   */
  test('reset() remet le deck à 52 cartes et vide burnedCards', () => {
    const deck = new Deck();
    deck.draw(10);
    deck.burn();
    deck.reset();
    expect(deck.getRemainingCards()).toBe(52);
    expect(deck.burnedCards).toHaveLength(0);
  });

  /**
   * debug() retourne un résumé lisible : total 52, remaining, burned, dealt.
   */
  test('debug() retourne total, remaining, burned, dealt', () => {
    const deck = new Deck();
    deck.draw(5);
    deck.burn();
    const info = deck.debug();
    expect(info).toEqual({
      total: 52,
      remaining: 46,
      burned: 1,
      dealt: 6,
    });
  });
});
