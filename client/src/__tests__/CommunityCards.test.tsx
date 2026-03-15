/**
 * =============================================================================
 * COMMUNITYCARDS.TEST.TSX — Tests du composant CommunityCards
 * =============================================================================
 *
 * Vérifie le rendu des cartes communes (flop, turn, river), du pot, et du mode
 * daltonien (colorblindMode). Chaque test est commenté de A à Z.
 * =============================================================================
 */

// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CommunityCards } from '../components/CommunityCards';

// Mock du hook useDeviceType pour contrôler mobile/tablet/desktop
vi.mock('../components/ui/use-mobile', () => ({
  useDeviceType: () => 'desktop',
}));

describe('CommunityCards - Rendu de base', () => {
  it('affiche le pot avec la valeur passée en prop', () => {
    render(<CommunityCards cards={[null, null, null, null, null]} pot={250} />);
    expect(screen.getByText(/POT/i)).toBeDefined();
    expect(screen.getByText('250')).toBeDefined();
  });

  it('affiche 5 emplacements pour les cartes (flop, turn, river)', () => {
    render(<CommunityCards cards={[null, null, null, null, null]} pot={0} />);
    const labels = screen.getAllByText(/FLOP|TURN|RIVER/i);
    expect(labels.length).toBeGreaterThanOrEqual(3);
  });
});

describe('CommunityCards - Cartes affichées', () => {
  it('affiche la valeur et le symbole quand une carte est fournie', () => {
    const cards = [
      { suit: 'hearts', value: 'A' },
      null,
      null,
      null,
      null,
    ];
    render(<CommunityCards cards={cards} pot={100} />);
    expect(screen.getAllByText('A').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('♥')).toBeDefined();
  });

  it('accepte des cartes avec value string (J, Q, K, 10)', () => {
    const cards = [
      { suit: 'spades', value: 'J' },
      { suit: 'diamonds', value: '10' },
      null,
      null,
      null,
    ];
    render(<CommunityCards cards={cards} pot={0} />);
    expect(screen.getAllByText('J').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('10').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('♦')).toBeDefined();
  });
});

describe('CommunityCards - Mode daltonien', () => {
  it('rend sans erreur avec colorblindMode=true', () => {
    const cards = [
      { suit: 'hearts', value: '2' },
      null,
      null,
      null,
      null,
    ];
    expect(() =>
      render(<CommunityCards cards={cards} pot={50} colorblindMode />)
    ).not.toThrow();
  });
});
