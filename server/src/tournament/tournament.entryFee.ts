/** Buy-in réel (jetons compte) : aligné sur le stack de départ du tournoi. */
export function tournamentEntryFeeChips(initialStack: number): number {
  const n = Math.floor(Number(initialStack))
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(n, 10_000_000)
}
