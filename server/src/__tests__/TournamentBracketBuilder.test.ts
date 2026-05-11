import {
  buildOpeningRound,
  buildRoundFromSurvivors,
  mulberry32,
} from '../tournament/bracket/TournamentBracketBuilder.js'
import { assertTableSizesValid, computeTableSizesForRound } from '../tournament/bracket/tableSizes.js'

/** Golden : partitions attendues pour n joueurs (trier pour comparaison stable). */
const EXPECTED_ROUND1_SIZES: Record<number, number[]> = {
  4: [4],
  5: [5],
  6: [6],
  7: [7],
  8: [8],
  9: [9],
  10: [5, 5],
  11: [6, 5],
  12: [6, 6],
  13: [7, 6],
  14: [7, 7],
  15: [8, 7],
  16: [8, 8],
  17: [9, 8],
  18: [9, 9],
  19: [7, 6, 6],
  20: [7, 7, 6],
}

function sortDesc(a: number[]): number[] {
  return [...a].sort((x, y) => y - x)
}

describe('computeTableSizesForRound golden 4–20', () => {
  for (let n = 4; n <= 20; n++) {
    it(`n=${n}`, () => {
      const sizes = computeTableSizesForRound(n)
      assertTableSizesValid(sizes, n)
      expect(sortDesc(sizes)).toEqual(sortDesc(EXPECTED_ROUND1_SIZES[n]!))
    })
  }
})

describe('buildOpeningRound', () => {
  it('répartit tous les joueurs une fois', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
    const r = buildOpeningRound(ids, 12345)
    const flat = r.tables.flatMap((t) => t.playerIds)
    expect(new Set(flat).size).toBe(10)
    expect(flat.sort()).toEqual([...ids].sort())
  })

  it('est déterministe pour une seed fixe', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `u${i}`)
    const a = buildOpeningRound(ids, 999)
    const b = buildOpeningRound(ids, 999)
    expect(a.tables.map((t) => t.playerIds)).toEqual(b.tables.map((t) => t.playerIds))
  })
})

describe('finale directe à 3', () => {
  it('3 survivants → une table de 3', () => {
    expect(computeTableSizesForRound(3)).toEqual([3])
    const r = buildRoundFromSurvivors(['w1', 'w2', 'w3'], 42)
    expect(r.tables).toHaveLength(1)
    expect(r.tables[0]!.playerIds).toHaveLength(3)
  })
})

describe('mulberry32', () => {
  it('produit des valeurs dans [0,1)', () => {
    const rng = mulberry32(1)
    for (let i = 0; i < 100; i++) {
      const x = rng()
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
  })
})
