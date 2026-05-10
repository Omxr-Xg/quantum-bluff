import {
  getOpeningRoundTableSizes,
  TOURNAMENT_MIN_START_PLAYERS,
} from '../services/tournament.service.js';

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

describe('getOpeningRoundTableSizes', () => {
  it('rejette moins de 4 joueurs', () => {
    expect(() => getOpeningRoundTableSizes(3)).toThrow('4 joueurs');
  });

  it('4 → [2, 2]', () => {
    expect(getOpeningRoundTableSizes(4)).toEqual([2, 2]);
  });

  it('5 → [2, 3]', () => {
    expect(getOpeningRoundTableSizes(5)).toEqual([2, 3]);
  });

  it('6 → [3, 3]', () => {
    expect(getOpeningRoundTableSizes(6)).toEqual([3, 3]);
  });

  it('7 → [4, 3] (équilibré, max 6/table)', () => {
    expect(getOpeningRoundTableSizes(7)).toEqual([4, 3]);
  });

  it('8 → [4, 4]', () => {
    expect(getOpeningRoundTableSizes(8)).toEqual([4, 4]);
  });

  it('12 → [6, 6]', () => {
    expect(getOpeningRoundTableSizes(12)).toEqual([6, 6]);
  });

  it('somme des tailles = n pour n de 4 à 24', () => {
    for (let n = 4; n <= 24; n++) {
      const sizes = getOpeningRoundTableSizes(n);
      expect(sum(sizes)).toBe(n);
      expect(sizes.length).toBeGreaterThanOrEqual(1);
      sizes.forEach((s) => {
        expect(s).toBeGreaterThanOrEqual(2);
        expect(s).toBeLessThanOrEqual(6);
      });
    }
  });

  it('constante min start', () => {
    expect(TOURNAMENT_MIN_START_PLAYERS).toBe(4);
  });
});
