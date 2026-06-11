import type { TournamentGameType } from '../generated/prisma/index.js'

/** Buy-in réel (jetons compte) : aligné sur le stack de départ du tournoi. */
export function tournamentEntryFeeChips(initialStack: number): number {
  const n = Math.floor(Number(initialStack))
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(n, 10_000_000)
}

export function tournamentBuyInForRow(t: {
  gameType: TournamentGameType
  initialStack: number
  beloteBuyIn: number | null
}): number {
  if (t.gameType === 'BELOTE') {
    const n = Math.floor(Number(t.beloteBuyIn ?? 0))
    return Number.isFinite(n) && n >= 0 ? Math.min(n, 10_000_000) : 0
  }
  return tournamentEntryFeeChips(t.initialStack)
}
