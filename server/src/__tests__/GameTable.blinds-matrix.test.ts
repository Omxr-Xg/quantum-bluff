/**
 * Matrice blinds / pot initial / relance min — 2 joueurs, stacks larges.
 */
import { GameTable } from '../logic/GameTable.js'
import type { Player } from '../types/poker.js'

function duo(): Player[] {
  return [
    { id: 'p1', name: 'A', cards: [], chips: 100_000, role: 'PLAYER', isActive: true },
    { id: 'p2', name: 'B', cards: [], chips: 100_000, role: 'PLAYER', isActive: true },
  ]
}

/** 40 paires SB = 1..40, BB = 2×SB + quelques paires non standard */
function buildPairs(): { sb: number; bb: number }[] {
  const out: { sb: number; bb: number }[] = []
  for (let sb = 1; sb <= 40; sb++) out.push({ sb, bb: sb * 2 })
  for (const [sb, bb] of [
    [5, 12],
    [10, 25],
    [25, 50],
    [50, 100],
    [100, 200],
    [1, 3],
    [2, 5],
    [3, 8],
    [4, 10],
    [6, 15],
  ] as [number, number][]) {
    if (!out.some((r) => r.sb === sb && r.bb === bb)) out.push({ sb, bb })
  }
  return out
}

const PAIRS = buildPairs()

describe('GameTable — matrice SB/BB (getMinRaise + pot initial)', () => {
  test.each(PAIRS.map((r) => [r.sb, r.bb] as const))(
    'SB=%i BB=%i → getMinRaise() === BB',
    (sb, bb) => {
      const t = new GameTable(`m-${sb}-${bb}`, duo(), { smallBlind: sb, bigBlind: bb })
      expect(t.getMinRaise()).toBe(bb)
    }
  )

  test.each(PAIRS.map((r) => [r.sb, r.bb] as const))(
    'SB=%i BB=%i → après startHand, pot === SB+BB',
    (sb, bb) => {
      const t = new GameTable(`p-${sb}-${bb}`, duo(), { smallBlind: sb, bigBlind: bb })
      t.startHand()
      expect(t.state.pot).toBe(sb + bb)
    }
  )
})

describe('GameTable — relance min sans main', () => {
  test.each([
    [1, 2],
    [10, 20],
    [100, 200],
  ] as const)('SB=%i BB=%i', (sb, bb) => {
    const t = new GameTable('x', duo(), { smallBlind: sb, bigBlind: bb })
    expect(t.getMinRaise()).toBe(bb)
  })
})
