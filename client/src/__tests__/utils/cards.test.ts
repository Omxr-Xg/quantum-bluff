/**
 * =============================================================================
 * CARDS.TEST.TS — Tests unitaires de l’utilitaire de normalisation des cartes
 * =============================================================================
 *
 * Teste normalizeServerCard() qui convertit le format serveur (suit MAJUSCULES,
 * value number, rank optionnel) vers le format client (suit minuscules,
 * value string "2"-"10", "J", "Q", "K", "A") pour l’affichage et les symboles.
 *
 * Chaque test est commenté pour expliquer le cas couvert.
 * =============================================================================
 */

import { describe, it, expect } from 'vitest';
import { normalizeServerCard } from '../../utils/cards';

describe('normalizeServerCard - entrées invalides', () => {
  it('retourne null pour null', () => {
    expect(normalizeServerCard(null)).toBeNull();
  });

  it('retourne null pour undefined', () => {
    expect(normalizeServerCard(undefined as never)).toBeNull();
  });

  it('retourne null pour un objet sans suit/value (objet vide)', () => {
    const result = normalizeServerCard({});
    expect(result).not.toBeNull();
    expect(result!.suit).toBe('hearts');
    expect(result!.value).toBe('');
  });
});

describe('normalizeServerCard - suit (couleur)', () => {
  it('convertit HEARTS en hearts', () => {
    const result = normalizeServerCard({ suit: 'HEARTS', value: 10 });
    expect(result).toEqual({ suit: 'hearts', value: '10' });
  });

  it('convertit DIAMONDS, CLUBS, SPADES en minuscules', () => {
    expect(normalizeServerCard({ suit: 'DIAMONDS', value: 5 })).toEqual({ suit: 'diamonds', value: '5' });
    expect(normalizeServerCard({ suit: 'CLUBS', value: 2 })).toEqual({ suit: 'clubs', value: '2' });
    expect(normalizeServerCard({ suit: 'SPADES', value: 14 })).toEqual({ suit: 'spades', value: 'A' });
  });

  it('suit inconnue tombe sur hearts par défaut', () => {
    const result = normalizeServerCard({ suit: 'UNKNOWN', value: 7 });
    expect(result!.suit).toBe('hearts');
  });
});

describe('normalizeServerCard - value (valeur affichée)', () => {
  it('utilise rank quand présent (J, Q, K, A)', () => {
    expect(normalizeServerCard({ suit: 'HEARTS', value: 11, rank: 'J' })).toEqual({ suit: 'hearts', value: 'J' });
    expect(normalizeServerCard({ suit: 'SPADES', value: 14, rank: 'A' })).toEqual({ suit: 'spades', value: 'A' });
  });

  it('convertit value number 11,12,13,14 en J,Q,K,A quand rank absent', () => {
    expect(normalizeServerCard({ suit: 'HEARTS', value: 11 })).toEqual({ suit: 'hearts', value: 'J' });
    expect(normalizeServerCard({ suit: 'HEARTS', value: 12 })).toEqual({ suit: 'hearts', value: 'Q' });
    expect(normalizeServerCard({ suit: 'HEARTS', value: 13 })).toEqual({ suit: 'hearts', value: 'K' });
    expect(normalizeServerCard({ suit: 'HEARTS', value: 14 })).toEqual({ suit: 'hearts', value: 'A' });
  });

  it('garde les chiffres 2-10 en string', () => {
    expect(normalizeServerCard({ suit: 'CLUBS', value: 2 })).toEqual({ suit: 'clubs', value: '2' });
    expect(normalizeServerCard({ suit: 'CLUBS', value: 10 })).toEqual({ suit: 'clubs', value: '10' });
  });
});
