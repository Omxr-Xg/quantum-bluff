/**
 * Répartition des joueurs sur plusieurs tables (max 9 par table, min 2).
 * 4–9 : plusieurs tables dès que possible (ex. 4 → 2+2, 5 → 3+2) pour des demi-finales puis finale à 2.
 * 10+ : découpage par plafond 9 joueurs / table.
 */
export function computeTableSizesForRound(playerCount: number): number[] {
  const m = Math.floor(playerCount)
  if (m <= 1) return []
  if (m === 2) return [2]
  if (m === 3) return [3]
  if (m === 4) return [2, 2]
  if (m === 5) return [3, 2]
  if (m === 6) return [3, 3]
  if (m === 7) return [4, 3]
  if (m === 8) return [4, 4]
  if (m === 9) return [5, 4]

  const numTables = Math.ceil(m / 9)
  const base = Math.floor(m / numTables)
  let rem = m % numTables
  const sizes: number[] = []
  for (let i = 0; i < numTables; i++) {
    sizes.push(base + (rem > 0 ? 1 : 0))
    if (rem > 0) rem -= 1
  }
  return sizes
}

/** Vérifie les invariants (tests golden). */
export function assertTableSizesValid(sizes: number[], total: number): void {
  const sum = sizes.reduce((a, b) => a + b, 0)
  if (sum !== total) {
    throw new Error(`table sizes sum ${sum} !== ${total}`)
  }
  for (const s of sizes) {
    if (s < 2 || s > 9) {
      throw new Error(`invalid table size ${s}`)
    }
  }
}
