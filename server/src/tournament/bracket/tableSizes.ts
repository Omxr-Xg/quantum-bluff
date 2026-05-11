/**
 * Répartition équilibrée des joueurs sur plusieurs tables (max 9 par table, min 2 si possible).
 * Utilisé pour l’ouverture et les tours suivants jusqu’à la finale.
 */
export function computeTableSizesForRound(playerCount: number): number[] {
  const m = Math.floor(playerCount)
  if (m <= 1) return []
  if (m <= 9) return [m]

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
