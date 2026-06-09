import { prisma } from '../config/database.js'
import { createWalletLedgerMovement } from '../casino/services/walletLedger.service.js'
import { grantManualBadge } from '../logic/gamification.js'
import { createNotification } from '../notifications/notification.service.js'

const SEASON_1_ID = 'season-1'
const MS_PER_DAY = 86_400_000
const SEASON_DURATION_MONTHS = 3

type SeasonRewardTier = {
  tier: string
  minRank: number
  maxRank: number
  chips: number
}

const SEASON_REWARD_TIERS: SeasonRewardTier[] = [
  { tier: 'top1', minRank: 1, maxRank: 1, chips: 50_000 },
  { tier: 'top3', minRank: 2, maxRank: 3, chips: 25_000 },
  { tier: 'top10', minRank: 4, maxRank: 10, chips: 10_000 },
  { tier: 'participant', minRank: 11, maxRank: 999_999, chips: 2_000 },
]

let seasonSeedPromise: Promise<void> | null = null

export async function ensureSeasonSeeded(): Promise<void> {
  if (!seasonSeedPromise) {
    seasonSeedPromise = (async () => {
      const existing = await prisma.season.findUnique({ where: { number: 1 } })
      if (existing) return

      const startsAt = new Date('2026-07-01T00:00:00.000Z')
      const endsAt = new Date('2026-09-30T23:59:59.000Z')
      await prisma.season.create({
        data: {
          id: SEASON_1_ID,
          number: 1,
          name: 'Saison 1',
          startsAt,
          endsAt,
          status: 'UPCOMING',
        },
      })
    })().catch((err) => {
      seasonSeedPromise = null
      throw err
    })
  }
  await seasonSeedPromise
}

export function daysRemainingInSeason(endsAt: Date, now = new Date()): number {
  const diff = endsAt.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / MS_PER_DAY))
}

function seasonBadgeId(seasonNumber: number, rank: number): string | null {
  if (rank === 1) return `season_${seasonNumber}_champion`
  if (rank <= 3) return `season_${seasonNumber}_podium`
  if (rank <= 10) return `season_${seasonNumber}_elite`
  return null
}

async function createNextSeasonAfterClose(closedSeason: {
  number: number
  endsAt: Date
}): Promise<void> {
  const nextNumber = closedSeason.number + 1
  const existing = await prisma.season.findUnique({ where: { number: nextNumber } })
  if (existing) return

  const startsAt = new Date(closedSeason.endsAt.getTime() + 1000)
  const endsAt = new Date(startsAt)
  endsAt.setUTCMonth(endsAt.getUTCMonth() + SEASON_DURATION_MONTHS)
  endsAt.setUTCHours(23, 59, 59, 0)

  await prisma.season.create({
    data: {
      id: `season-${nextNumber}`,
      number: nextNumber,
      name: `Saison ${nextNumber}`,
      startsAt,
      endsAt,
      status: 'UPCOMING',
    },
  })
}

export async function getActiveSeason() {
  await ensureSeasonSeeded()
  const now = new Date()
  const active = await prisma.season.findFirst({
    where: {
      status: 'ACTIVE',
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    orderBy: { number: 'desc' },
  })
  if (active) return active

  const upcoming = await prisma.season.findFirst({
    where: { status: 'UPCOMING' },
    orderBy: { number: 'asc' },
  })
  return upcoming
}

export async function incrementSeasonScore(
  userId: string,
  delta: { xp?: number; pokerWins?: number; beloteWins?: number },
) {
  const season = await getActiveSeason()
  if (!season || season.status !== 'ACTIVE') return null

  const xp = Math.max(0, Math.floor(delta.xp ?? 0))
  const pokerWins = Math.max(0, Math.floor(delta.pokerWins ?? 0))
  const beloteWins = Math.max(0, Math.floor(delta.beloteWins ?? 0))
  if (xp === 0 && pokerWins === 0 && beloteWins === 0) return null

  return prisma.seasonScore.upsert({
    where: { seasonId_userId: { seasonId: season.id, userId } },
    create: {
      seasonId: season.id,
      userId,
      xpEarned: xp,
      pokerWins,
      beloteWins,
    },
    update: {
      xpEarned: { increment: xp },
      pokerWins: { increment: pokerWins },
      beloteWins: { increment: beloteWins },
    },
  })
}

export async function getSeasonLeaderboard(seasonId: string, limit = 50) {
  const capped = Math.min(100, Math.max(1, limit))
  const rows = await prisma.seasonScore.findMany({
    where: { seasonId },
    orderBy: [{ xpEarned: 'desc' }, { pokerWins: 'desc' }, { beloteWins: 'desc' }],
    take: capped,
    include: { user: { select: { id: true, username: true, avatarUrl: true } } },
  })
  return rows.map((row, index) => ({
    rank: index + 1,
    userId: row.userId,
    username: row.user.username,
    avatarUrl: row.user.avatarUrl,
    xpEarned: row.xpEarned,
    pokerWins: row.pokerWins,
    beloteWins: row.beloteWins,
  }))
}

function tierForRank(rank: number): SeasonRewardTier | null {
  return SEASON_REWARD_TIERS.find((t) => rank >= t.minRank && rank <= t.maxRank) ?? null
}

export async function closeSeason(seasonId: string): Promise<{ rewarded: number }> {
  const season = await prisma.season.findUnique({ where: { id: seasonId } })
  if (!season) return { rewarded: 0 }

  if (season.status === 'ENDED') {
    return { rewarded: 0 }
  }

  await prisma.season.update({
    where: { id: seasonId },
    data: { status: 'ENDED' },
  })

  const leaderboard = await getSeasonLeaderboard(seasonId, 100)
  let rewarded = 0

  for (const entry of leaderboard) {
    const tierDef = tierForRank(entry.rank)
    if (!tierDef || tierDef.chips <= 0) continue

    const claim = await prisma.seasonRewardClaim.createMany({
      data: [{ seasonId, userId: entry.userId, tier: tierDef.tier }],
      skipDuplicates: true,
    })
    if (claim.count === 0) continue

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: entry.userId },
        select: { chips: true },
      })
      if (!user) return

      const balanceBefore = user.chips
      const balanceAfter = balanceBefore + tierDef.chips
      await tx.user.update({
        where: { id: entry.userId },
        data: { chips: balanceAfter },
      })
      await createWalletLedgerMovement(tx, {
        userId: entry.userId,
        reason: 'SEASON_REWARD',
        balanceBefore,
        balanceAfter,
        gameType: 'season',
        roundId: `${seasonId}:${tierDef.tier}`,
      })

      const badgeId = seasonBadgeId(season.number, entry.rank)
      if (badgeId) {
        await grantManualBadge(tx, entry.userId, badgeId)
      }
    })

    await createNotification(entry.userId, 'SEASON_ENDED', {
      seasonId,
      seasonName: season.name,
      tier: tierDef.tier,
      chips: tierDef.chips,
      rank: entry.rank,
    })
    rewarded++
  }

  await createNextSeasonAfterClose(season)

  return { rewarded }
}

/** Active les saisons dont la date de début est passée ; clôture celles expirées. */
export async function syncSeasonStatuses(): Promise<void> {
  await ensureSeasonSeeded()
  const now = new Date()

  await prisma.season.updateMany({
    where: { status: 'UPCOMING', startsAt: { lte: now } },
    data: { status: 'ACTIVE' },
  })

  const ended = await prisma.season.findMany({
    where: { status: 'ACTIVE', endsAt: { lt: now } },
    select: { id: true },
  })
  for (const s of ended) {
    await closeSeason(s.id)
  }
}
