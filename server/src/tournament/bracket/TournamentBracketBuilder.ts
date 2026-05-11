import { computeTableSizesForRound } from './tableSizes.js'

export type BracketOpeningTable = {
  tableIndex: number
  /** Ordre d’assignation des sièges (0..n-1). */
  playerIds: string[]
}

export type BracketOpeningRound = {
  tables: BracketOpeningTable[]
}

/**
 * RNG déterministe (mulberry32) pour reproductibilité des tests.
 */
export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffleWithRng<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Construit le premier tour : tailles de tables + répartition des joueurs (shuffle seedé).
 */
export function buildOpeningRound(playerIds: string[], seed: number): BracketOpeningRound {
  const n = playerIds.length
  if (n < 4 || n > 20) {
    throw new Error(`player count must be 4..20, got ${n}`)
  }
  const rng = mulberry32(seed >>> 0)
  const shuffled = shuffleWithRng(playerIds, rng)
  const sizes = computeTableSizesForRound(n)
  const tables: BracketOpeningTable[] = []
  let offset = 0
  for (let t = 0; t < sizes.length; t++) {
    const sz = sizes[t]!
    tables.push({
      tableIndex: t,
      playerIds: shuffled.slice(offset, offset + sz),
    })
    offset += sz
  }
  return { tables }
}

/**
 * Prochain tour : entrée = gagnants du tour précédent (dans l’ordre des tables complétées).
 */
export function buildRoundFromSurvivors(survivorIdsInOrder: string[], seed: number): BracketOpeningRound {
  const m = survivorIdsInOrder.length
  if (m < 2) {
    throw new Error('need at least 2 survivors')
  }
  const rng = mulberry32(seed >>> 0)
  const shuffled = shuffleWithRng(survivorIdsInOrder, rng)
  const sizes = computeTableSizesForRound(m)
  const tables: BracketOpeningTable[] = []
  let offset = 0
  for (let t = 0; t < sizes.length; t++) {
    const sz = sizes[t]!
    tables.push({
      tableIndex: t,
      playerIds: shuffled.slice(offset, offset + sz),
    })
    offset += sz
  }
  return { tables }
}
