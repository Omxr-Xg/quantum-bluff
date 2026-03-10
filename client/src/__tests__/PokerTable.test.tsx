// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { PokerTable } from '../components/game/PokerTable';

vi.mock('@/assets/logo-data', () => ({
  logoDataUrl: 'mocked-logo-url'
}));

vi.mock('@/utils/avatars', () => ({
  getPlayerAvatar: () => null
}));

vi.mock('../components/ui/use-mobile', () => ({
  useDeviceType: () => "desktop"
}));

vi.mock('../utils/tablePositions', () => ({
  calculatePlayerPositions: () => [{ x: 0, y: 0 }]
}));

describe('PokerTable', () => {
  it('should render without crashing', () => {
    const players: any[] = [];
    expect(() => render(<PokerTable players={players} />)).not.toThrow();
  });
});
