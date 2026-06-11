import type { Prisma, PrismaClient } from '../generated/prisma/index.js'
import { createWalletLedgerMovement } from '../casino/services/walletLedger.service.js'
import { levelFromExperience } from '../logic/gamification.js'
import { rootLogger } from '../observability/logger.js'
import { tournamentBuyInForRow } from './tournament.entryFee.js'

export const XP_TOURNAMENT_1ST = 500
export const XP_TOURNAMENT_2ND = 400
export const XP_TOURNAMENT_3RD = 300
export const XP_TOURNAMENT_OTHER = 50

export function xpForFinalRank(rank: number | null): number {
  if (rank == null) return XP_TOURNAMENT_OTHER
  if (rank === 1) return XP_TOURNAMENT_1ST
  if (rank === 2) return XP_TOURNAMENT_2ND
  if (rank === 3) return XP_TOURNAMENT_3RD
  return XP_TOURNAMENT_OTHER
}

/**
 * Idempotent : une ligne `TournamentRewardLedger` par (tournamentId, userId, kind).
 * Retourne `granted` si crédit appliqué, `already` si la ligne existait.
 */
export async function grantLedgerRow(
  prisma: PrismaClient | Prisma.TransactionClient,
  row: {
    tournamentId: string
    userId: string
    kind: 'CHIPS_WINNER' | 'XP_PLACEMENT'
    chipsAmount?: number | null
    xpDelta?: number | null
  },
): Promise<'granted' | 'already'> {
  try {
    await prisma.tournamentRewardLedger.create({
      data: {
        tournamentId: row.tournamentId,
        userId: row.userId,
        kind: row.kind,
        chipsAmount: row.chipsAmount ?? null,
        xpDelta: row.xpDelta ?? null,
      },
    })
    return 'granted'
  } catch (e: unknown) {
    const code = (e as { code?: string }).code
    if (code === 'P2002') return 'already'
    throw e
  }
}

export async function applyXpPlacementIfMissing(
  prisma: PrismaClient | Prisma.TransactionClient,
  tournamentId: string,
  userId: string,
  xpDelta: number,
): Promise<void> {
  if (xpDelta === 0) return
  const ins = await grantLedgerRow(prisma, {
    tournamentId,
    userId,
    kind: 'XP_PLACEMENT',
    xpDelta,
  })
  if (ins === 'already') return
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { experience: true } })
  const nextXp = Math.max(0, (u?.experience ?? 0) + xpDelta)
  const lvl = levelFromExperience(nextXp)
  await prisma.user.update({
    where: { id: userId },
    data: { experience: nextXp, level: lvl },
  })
}

export async function applyChipsWinnerIfMissing(
  prisma: PrismaClient | Prisma.TransactionClient,
  tournamentId: string,
  winnerUserId: string,
  chipsAmount: number,
): Promise<'granted' | 'already'> {
  if (chipsAmount <= 0) return 'already'
  const ins = await grantLedgerRow(prisma, {
    tournamentId,
    userId: winnerUserId,
    kind: 'CHIPS_WINNER',
    chipsAmount,
  })
  if (ins === 'already') {
    rootLogger.info({ msg: 'tournament_reward_chips_already_applied', tournamentId, winnerUserId })
    return 'already'
  }
  const beforeRow = await prisma.user.findUnique({
    where: { id: winnerUserId },
    select: { chips: true },
  })
  const balanceBefore = beforeRow?.chips ?? 0
  await prisma.user.update({
    where: { id: winnerUserId },
    data: { chips: { increment: chipsAmount } },
  })
  const afterRow = await prisma.user.findUnique({
    where: { id: winnerUserId },
    select: { chips: true },
  })
  const balanceAfter = afterRow?.chips ?? balanceBefore + chipsAmount
  await createWalletLedgerMovement(prisma, {
    userId: winnerUserId,
    reason: 'TOURNAMENT_PRIZE',
    balanceBefore,
    balanceAfter,
    gameType: 'tournament',
    roundId: tournamentId,
  })
  return 'granted'
}

/**
 * À appeler quand le tournoi est `COMPLETED` : XP pour tous + chips vainqueur
 * (= somme des buy-in : chaque inscrit × `initialStack`, idempotent via ledger).
 */
export async function grantTournamentRewardsIfMissing(prisma: PrismaClient, tournamentId: string): Promise<void> {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      players: { select: { userId: true, finalRank: true, status: true } },
    },
  })
  if (!t || t.status !== 'COMPLETED') return
  const fee = tournamentBuyInForRow(t)
  const participantCount = t.players.length
  const prize = participantCount * fee
  const winner =
    t.players.find((p) => p.finalRank === 1) ?? t.players.find((p) => p.status === 'WINNER')
  if (!winner) {
    rootLogger.warn({ msg: 'tournament_reward_no_winner_row', tournamentId })
    return
  }
  await prisma.$transaction(async (tx) => {
    for (const p of t.players) {
      const rank = p.finalRank
      const xp = xpForFinalRank(rank)
      await applyXpPlacementIfMissing(tx, tournamentId, p.userId, xp)
    }
    if (typeof prize === 'number' && prize > 0) {
      await applyChipsWinnerIfMissing(tx, tournamentId, winner.userId, prize)
    }
  })
}
