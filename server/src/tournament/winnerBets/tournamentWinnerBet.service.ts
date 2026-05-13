/**
 * Paris cachés sur le vainqueur d'un tournoi (parimutuel dynamique).
 *
 * Modèle économique :
 * - Chaque mise est créditée immédiatement dans un pot virtuel (somme des stakes PENDING du tournoi).
 * - À la résolution (finalize), chaque parieur qui a misé sur le vrai vainqueur reçoit
 *   `(stake / poolGagnant) * poolTotal` (entier, arrondi bas), où `poolGagnant` = somme des stakes
 *   sur le vainqueur effectif et `poolTotal` = somme des stakes du tournoi.
 * - Cote affichée temps réel pour un candidat = `poolTotal / poolSurCeCandidat`.
 * - Cas dégénéré : `poolGagnant == 0` (personne n'a parié sur le vainqueur) ⇒ tous les paris
 *   PENDING du tournoi sont REFUNDED (la maison ne garde rien).
 * - Annulation du tournoi ⇒ refund intégral à tous les parieurs PENDING.
 *
 * Marché : toujours ouvert tant que le tournoi n'est pas `COMPLETED` ou `CANCELLED`.
 * On peut parier sur n'importe quel inscrit (REGISTERED/ACTIVE/WAITING_NEXT_ROUND), y compris soi-même.
 */

import type { Prisma, PrismaClient } from '../../generated/prisma/index.js'
import { prisma } from '../../config/database.js'
import { createWalletLedgerMovement } from '../../casino/services/walletLedger.service.js'

export const TOURNAMENT_WINNER_BET_MIN_STAKE = 10
export const TOURNAMENT_WINNER_BET_MAX_STAKE = 5000

/** Statuts d'inscription d'un joueur éligibles comme « cible » d'un pari (encore en course). */
const ELIGIBLE_PREDICTED_STATUSES = ['REGISTERED', 'ACTIVE', 'WAITING_NEXT_ROUND'] as const

/** Statuts terminaux d'un tournoi : plus aucun pari acceptable. */
const TERMINAL_TOURNAMENT_STATUSES = ['COMPLETED', 'CANCELLED'] as const

export type TournamentBetCandidate = {
  userId: string
  username: string | null
  avatarUrl: string | null
  status: string
  totalStake: number
  betCount: number
  /** `null` si aucun pari sur ce candidat (cote indéfinie). */
  odds: number | null
  /** Part du pot misée sur ce candidat (0–1). */
  share: number
}

export type TournamentBetPoolSnapshot = {
  tournamentId: string
  status: string
  marketOpen: boolean
  totalPool: number
  totalBets: number
  candidates: TournamentBetCandidate[]
}

export type MyTournamentBetRow = {
  id: string
  tournamentId: string
  predictedWinnerUserId: string
  predictedWinnerUsername: string | null
  predictedWinnerAvatarUrl: string | null
  stake: number
  status: 'PENDING' | 'WON' | 'LOST' | 'REFUNDED'
  payout: number | null
  oddsSnapshot: number | null
  placedAt: Date
  resolvedAt: Date | null
}

/** Calcule la cote dynamique = poolTotal / poolSurCandidat (sans précision excessive, 2 décimales). */
function computeOdds(totalPool: number, candidateStake: number): number | null {
  if (candidateStake <= 0 || totalPool <= 0) return null
  return Math.round((totalPool / candidateStake) * 100) / 100
}

/** Snapshot complet du pari mutuel : pot total, candidats éligibles avec cotes/parts. */
export async function getTournamentWinnerBetPool(
  tournamentId: string,
): Promise<TournamentBetPoolSnapshot | null> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, status: true },
  })
  if (!tournament) return null

  /* Tous les joueurs jamais inscrits : on liste comme candidats, mais on flague les éliminés.
   * La cote n'est calculée que sur le pool *PENDING* (les paris résolus n'entrent pas). */
  const players = await prisma.tournamentPlayer.findMany({
    where: { tournamentId },
    include: { user: { select: { id: true, username: true, avatarUrl: true } } },
  })

  const bets = await prisma.tournamentWinnerBet.findMany({
    where: { tournamentId, status: 'PENDING' },
    select: { predictedWinnerUserId: true, stake: true },
  })

  let totalPool = 0
  const byCandidate = new Map<string, { totalStake: number; betCount: number }>()
  for (const b of bets) {
    totalPool += b.stake
    const cur = byCandidate.get(b.predictedWinnerUserId)
    if (cur) {
      cur.totalStake += b.stake
      cur.betCount += 1
    } else {
      byCandidate.set(b.predictedWinnerUserId, { totalStake: b.stake, betCount: 1 })
    }
  }

  const candidates: TournamentBetCandidate[] = players.map((p) => {
    const agg = byCandidate.get(p.userId) ?? { totalStake: 0, betCount: 0 }
    return {
      userId: p.userId,
      username: p.user?.username ?? null,
      avatarUrl: p.user?.avatarUrl ?? null,
      status: p.status,
      totalStake: agg.totalStake,
      betCount: agg.betCount,
      odds: computeOdds(totalPool, agg.totalStake),
      share: totalPool > 0 ? agg.totalStake / totalPool : 0,
    }
  })

  candidates.sort((a, b) => {
    if (b.totalStake !== a.totalStake) return b.totalStake - a.totalStake
    return (a.username ?? '').localeCompare(b.username ?? '')
  })

  return {
    tournamentId,
    status: tournament.status,
    marketOpen: !(TERMINAL_TOURNAMENT_STATUSES as readonly string[]).includes(tournament.status),
    totalPool,
    totalBets: bets.length,
    candidates,
  }
}

export async function getMyTournamentWinnerBets(
  userId: string,
  tournamentId: string,
): Promise<MyTournamentBetRow[]> {
  const rows = await prisma.tournamentWinnerBet.findMany({
    where: { tournamentId, bettorUserId: userId },
    include: { predictedWinner: { select: { username: true, avatarUrl: true } } },
    orderBy: [{ placedAt: 'desc' }],
  })
  return rows.map((r) => ({
    id: r.id,
    tournamentId: r.tournamentId,
    predictedWinnerUserId: r.predictedWinnerUserId,
    predictedWinnerUsername: r.predictedWinner?.username ?? null,
    predictedWinnerAvatarUrl: r.predictedWinner?.avatarUrl ?? null,
    stake: r.stake,
    status: r.status as 'PENDING' | 'WON' | 'LOST' | 'REFUNDED',
    payout: r.payout ?? null,
    oddsSnapshot: r.oddsSnapshot ?? null,
    placedAt: r.placedAt,
    resolvedAt: r.resolvedAt,
  }))
}

export type PlaceTournamentWinnerBetInput = {
  bettorUserId: string
  tournamentId: string
  predictedWinnerUserId: string
  stake: number
}

export type PlaceTournamentWinnerBetResult = {
  bet: {
    id: string
    stake: number
    predictedWinnerUserId: string
    oddsSnapshot: number | null
    placedAt: Date
  }
  newBalance: number
}

/**
 * Place un pari sur le vainqueur du tournoi.
 * Débit immédiat des chips ; le bet reste PENDING jusqu'au finalize/cancel.
 */
export async function placeTournamentWinnerBet(
  input: PlaceTournamentWinnerBetInput,
): Promise<PlaceTournamentWinnerBetResult> {
  const stake = Math.floor(Number(input.stake))
  if (!Number.isFinite(stake) || stake < TOURNAMENT_WINNER_BET_MIN_STAKE || stake > TOURNAMENT_WINNER_BET_MAX_STAKE) {
    throw new Error(
      `Mise invalide (${TOURNAMENT_WINNER_BET_MIN_STAKE}–${TOURNAMENT_WINNER_BET_MAX_STAKE})`,
    )
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: input.tournamentId },
    select: { id: true, status: true },
  })
  if (!tournament) throw new Error('Tournoi introuvable')
  if ((TERMINAL_TOURNAMENT_STATUSES as readonly string[]).includes(tournament.status)) {
    throw new Error('Marché fermé : tournoi terminé')
  }

  const predicted = await prisma.tournamentPlayer.findFirst({
    where: { tournamentId: input.tournamentId, userId: input.predictedWinnerUserId },
    select: { status: true },
  })
  if (!predicted) throw new Error('Joueur cible non inscrit à ce tournoi')
  if (!(ELIGIBLE_PREDICTED_STATUSES as readonly string[]).includes(predicted.status)) {
    throw new Error('Joueur cible plus en course')
  }

  /* Snapshot de cote AVANT le débit pour l'historique (référence informative).
   * Le calcul final ignore ce snapshot et se base sur les pools réels au finalize. */
  const snapshot = await getTournamentWinnerBetPool(input.tournamentId)
  const candidateStake =
    snapshot?.candidates.find((c) => c.userId === input.predictedWinnerUserId)?.totalStake ?? 0
  const oddsSnapshot = computeOdds((snapshot?.totalPool ?? 0) + stake, candidateStake + stake)

  return prisma.$transaction(async (tx) => {
    const before = await tx.user.findUnique({
      where: { id: input.bettorUserId },
      select: { chips: true },
    })
    if (!before) throw new Error('Compte introuvable')
    if (before.chips < stake) throw new Error('Solde insuffisant')

    const updated = await tx.user.update({
      where: { id: input.bettorUserId },
      data: { chips: { decrement: stake } },
      select: { chips: true },
    })

    const bet = await tx.tournamentWinnerBet.create({
      data: {
        tournamentId: input.tournamentId,
        bettorUserId: input.bettorUserId,
        predictedWinnerUserId: input.predictedWinnerUserId,
        stake,
        oddsSnapshot,
      },
      select: { id: true, stake: true, predictedWinnerUserId: true, oddsSnapshot: true, placedAt: true },
    })

    await createWalletLedgerMovement(tx, {
      userId: input.bettorUserId,
      reason: 'TOURNAMENT_WINNER_BET_STAKE',
      balanceBefore: before.chips,
      balanceAfter: updated.chips,
      gameType: 'tournament_winner_bet',
      roundId: bet.id,
    })

    return {
      bet,
      newBalance: updated.chips,
    }
  })
}

type TxLike = Prisma.TransactionClient | PrismaClient

/**
 * Résout TOUS les paris PENDING d'un tournoi (parimutuel).
 * - Le pool total = somme des stakes PENDING.
 * - Si `poolWinner` > 0 : chaque parieur sur le vrai vainqueur reçoit
 *   `floor((stake / poolWinner) * poolTotal)`. Les autres paris sont LOST.
 *   Les arrondis perdus restent dans la maison (négligeable, < n_winners chips).
 * - Si `poolWinner == 0` : aucun parieur n'a deviné juste ⇒ tous remboursés.
 */
export async function resolveTournamentWinnerBets(
  tx: TxLike,
  tournamentId: string,
  winnerUserId: string,
): Promise<{ resolvedCount: number; totalPaidOut: number }> {
  const pending = await tx.tournamentWinnerBet.findMany({
    where: { tournamentId, status: 'PENDING' },
    select: { id: true, bettorUserId: true, predictedWinnerUserId: true, stake: true },
  })
  if (pending.length === 0) return { resolvedCount: 0, totalPaidOut: 0 }

  let totalPool = 0
  let poolWinner = 0
  for (const b of pending) {
    totalPool += b.stake
    if (b.predictedWinnerUserId === winnerUserId) poolWinner += b.stake
  }

  const now = new Date()
  let totalPaidOut = 0

  if (poolWinner === 0) {
    /* Pot orphelin : refund intégral (la maison ne prend rien). */
    return refundPendingTournamentBetsForCancellation(tx, tournamentId, 'WINNER_BET_NO_WINNERS')
  }

  for (const bet of pending) {
    if (bet.predictedWinnerUserId === winnerUserId) {
      const payout = Math.floor((bet.stake / poolWinner) * totalPool)
      const before = await tx.user.findUnique({
        where: { id: bet.bettorUserId },
        select: { chips: true },
      })
      const balanceBefore = before?.chips ?? 0
      const after = await tx.user.update({
        where: { id: bet.bettorUserId },
        data: { chips: { increment: payout } },
        select: { chips: true },
      })
      await tx.tournamentWinnerBet.update({
        where: { id: bet.id },
        data: { status: 'WON', payout: payout - bet.stake, resolvedAt: now },
      })
      await createWalletLedgerMovement(tx, {
        userId: bet.bettorUserId,
        reason: 'TOURNAMENT_WINNER_BET_PAYOUT',
        balanceBefore,
        balanceAfter: after.chips,
        gameType: 'tournament_winner_bet',
        roundId: bet.id,
      })
      totalPaidOut += payout
    } else {
      await tx.tournamentWinnerBet.update({
        where: { id: bet.id },
        data: { status: 'LOST', payout: -bet.stake, resolvedAt: now },
      })
    }
  }

  return { resolvedCount: pending.length, totalPaidOut }
}

/**
 * Rembourse tous les paris PENDING d'un tournoi (annulation OU pot orphelin).
 * Chaque parieur récupère exactement sa mise.
 */
export async function refundPendingTournamentBetsForCancellation(
  tx: TxLike,
  tournamentId: string,
  ledgerReason:
    | 'TOURNAMENT_WINNER_BET_REFUND_CANCEL'
    | 'WINNER_BET_NO_WINNERS' = 'TOURNAMENT_WINNER_BET_REFUND_CANCEL',
): Promise<{ resolvedCount: number; totalPaidOut: number }> {
  const reason =
    ledgerReason === 'WINNER_BET_NO_WINNERS'
      ? 'TOURNAMENT_WINNER_BET_REFUND_NO_WINNERS'
      : 'TOURNAMENT_WINNER_BET_REFUND_CANCEL'

  const pending = await tx.tournamentWinnerBet.findMany({
    where: { tournamentId, status: 'PENDING' },
    select: { id: true, bettorUserId: true, stake: true },
  })
  if (pending.length === 0) return { resolvedCount: 0, totalPaidOut: 0 }

  const now = new Date()
  let totalPaidOut = 0

  for (const bet of pending) {
    const before = await tx.user.findUnique({
      where: { id: bet.bettorUserId },
      select: { chips: true },
    })
    const balanceBefore = before?.chips ?? 0
    const after = await tx.user.update({
      where: { id: bet.bettorUserId },
      data: { chips: { increment: bet.stake } },
      select: { chips: true },
    })
    await tx.tournamentWinnerBet.update({
      where: { id: bet.id },
      data: { status: 'REFUNDED', payout: 0, resolvedAt: now },
    })
    await createWalletLedgerMovement(tx, {
      userId: bet.bettorUserId,
      reason,
      balanceBefore,
      balanceAfter: after.chips,
      gameType: 'tournament_winner_bet',
      roundId: bet.id,
    })
    totalPaidOut += bet.stake
  }

  return { resolvedCount: pending.length, totalPaidOut }
}
