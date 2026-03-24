/**
 * Jetons de jeu : toujours des entiers ≥ 0 (pas de mises à virgule).
 */
export function intChips(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.floor(n))
}
