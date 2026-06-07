import { prisma } from '../config/database.js'

export type HistoryMode = 'all' | 'poker' | 'belote' | 'casino' | 'tournament'

function parsePage(query: Record<string, unknown>) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(String(query.limit ?? '20'), 10) || 20))
  return { page, limit, skip: (page - 1) * limit }
}

export async function getPlayerHistory(
  userId: string,
  opts: { mode?: HistoryMode; page?: number; limit?: number } = {},
) {
  const mode = opts.mode ?? 'all'
  const page = Math.max(1, opts.page ?? 1)
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20))
  const skip = (page - 1) * limit

  type HistoryItem = {
    id: string
    gameType: string
    summary: string
    amount: number | null
    endedAt: string
    meta?: Record<string, unknown>
  }

  const items: HistoryItem[] = []

  if (mode === 'all' || mode === 'poker') {
    const pokerWins = await prisma.gameResult.findMany({
      where: { winnerId: userId },
      orderBy: { endedAt: 'desc' },
      take: mode === 'poker' ? limit : Math.ceil(limit / 2),
      skip: mode === 'poker' ? skip : 0,
    })
    for (const row of pokerWins) {
      items.push({
        id: row.id,
        gameType: 'poker',
        summary: `Victoire — pot ${row.pot}`,
        amount: row.pot,
        endedAt: row.endedAt.toISOString(),
        meta: { gameId: row.gameId, winnerName: row.winnerName },
      })
    }
  }

  if (mode === 'all' || mode === 'belote') {
    const beloteRows = await prisma.beloteGameResultPlayer.findMany({
      where: { userId },
      include: { result: true },
      orderBy: { result: { endedAt: 'desc' } },
      take: mode === 'belote' ? limit : Math.ceil(limit / 2),
      skip: mode === 'belote' ? skip : 0,
    })
    for (const row of beloteRows) {
      items.push({
        id: row.id,
        gameType: 'belote',
        summary: row.won ? 'Victoire belote' : 'Défaite belote',
        amount: null,
        endedAt: row.result.endedAt.toISOString(),
        meta: {
          gameId: row.result.gameId,
          won: row.won,
          team: row.team,
          teamAScore: row.result.teamAScore,
          teamBScore: row.result.teamBScore,
        },
      })
    }
  }

  if (mode === 'all' || mode === 'casino') {
    const walletRows = await prisma.walletLedgerEntry.findMany({
      where: {
        userId,
        gameType: { in: ['slot', 'roulette', 'blackjack', 'crash', 'mines', 'wheel', 'lucky_number'] },
      },
      orderBy: { createdAt: 'desc' },
      take: mode === 'casino' ? limit : Math.ceil(limit / 3),
      skip: mode === 'casino' ? skip : 0,
    })
    for (const row of walletRows) {
      items.push({
        id: row.id,
        gameType: 'casino',
        summary: row.reason,
        amount: row.amount,
        endedAt: row.createdAt.toISOString(),
        meta: { gameType: row.gameType, roundId: row.roundId },
      })
    }
  }

  if (mode === 'all' || mode === 'tournament') {
    const tournamentRewards = await prisma.tournamentRewardLedger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: mode === 'tournament' ? limit : 10,
      skip: mode === 'tournament' ? skip : 0,
    })
    for (const row of tournamentRewards) {
      items.push({
        id: row.id,
        gameType: 'tournament',
        summary: row.kind,
        amount: row.chipsAmount ?? row.xpDelta ?? null,
        endedAt: row.createdAt.toISOString(),
        meta: { tournamentId: row.tournamentId, kind: row.kind },
      })
    }
  }

  items.sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime())

  return {
    items: items.slice(0, limit),
    page,
    limit,
    mode,
  }
}

export type AnalyticsPeriod = '7d' | '30d' | '90d' | 'all'

function periodStart(period: AnalyticsPeriod): Date | null {
  if (period === 'all') return null
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function classifyGameGain(reason: string, gameType: string | null): keyof typeof EMPTY_GAINS {
  const r = reason.toUpperCase()
  const g = (gameType ?? '').toLowerCase()
  if (r.includes('BELOTE') || g === 'belote') return 'belote'
  if (r.includes('POKER') || g.includes('poker')) return 'poker'
  if (r.includes('TOURNAMENT') || g === 'tournament') return 'tournament'
  if (
    g === 'slot' ||
    g === 'roulette' ||
    g === 'blackjack' ||
    g === 'crash' ||
    g === 'mines' ||
    g === 'wheel' ||
    g === 'lucky_number' ||
    r.includes('SLOT') ||
    r.includes('ROULETTE') ||
    r.includes('BLACKJACK') ||
    r.includes('CRASH') ||
    r.includes('MINES') ||
    r.includes('WHEEL') ||
    r.includes('LUCKY')
  ) {
    return 'casino'
  }
  return 'other'
}

const EMPTY_GAINS = { poker: 0, belote: 0, casino: 0, tournament: 0, other: 0 }

export async function getPlayerAnalytics(userId: string, period: AnalyticsPeriod = '30d') {
  const since = periodStart(period)
  const ledger = await prisma.walletLedgerEntry.findMany({
    where: {
      userId,
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    orderBy: { createdAt: 'asc' },
    select: {
      amount: true,
      balanceAfter: true,
      createdAt: true,
      reason: true,
      gameType: true,
    },
  })

  const chipsByDay = new Map<string, number>()
  const gainsByGame = { ...EMPTY_GAINS }

  for (const row of ledger) {
    const key = dayKey(row.createdAt)
    if (row.balanceAfter != null) {
      chipsByDay.set(key, row.balanceAfter)
    }
    const bucket = classifyGameGain(row.reason, row.gameType)
    gainsByGame[bucket] += row.amount
  }

  const chipsTimeline = [...chipsByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, balance]) => ({ date, balance }))

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { experience: true, level: true, chips: true },
  })

  const xpTimeline = user
    ? [{ date: dayKey(new Date()), xp: user.experience, level: user.level }]
    : []

  const [playerStats, beloteStats, casinoStats] = await Promise.all([
    prisma.playerStats.findUnique({ where: { playerId: userId } }),
    prisma.belotePlayerStats.findUnique({ where: { userId } }),
    prisma.casinoStats.findUnique({ where: { userId } }),
  ])

  const records = {
    biggestWin: playerStats?.biggestWin ?? 0,
    biggestPot: playerStats?.biggestPot ?? 0,
    longestWinStreak: playerStats?.winStreak ?? 0,
    biggestJackpot: Math.max(
      casinoStats?.slotBiggestWin ?? 0,
      casinoStats?.rouletteBiggestWin ?? 0,
      casinoStats?.blackjackBiggestWin ?? 0,
    ),
    beloteWins: beloteStats?.wins ?? 0,
    pokerWins: playerStats?.totalWins ?? 0,
    currentChips: user?.chips ?? 0,
  }

  const totalGain = Object.values(gainsByGame).reduce((a, b) => a + b, 0)
  const gainsByGamePct = Object.fromEntries(
    Object.entries(gainsByGame).map(([k, v]) => [
      k,
      totalGain !== 0 ? Math.round((v / totalGain) * 1000) / 10 : 0,
    ]),
  ) as Record<keyof typeof EMPTY_GAINS, number>

  return {
    period,
    chipsTimeline,
    xpTimeline,
    gainsByGame,
    gainsByGamePct,
    records,
  }
}

export async function getPlayerStats(userId: string) {
  const [user, playerStats, beloteStats, casinoStats, achievementCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { chips: true, level: true, experience: true, loginStreakCount: true },
    }),
    prisma.playerStats.findUnique({ where: { playerId: userId } }),
    prisma.belotePlayerStats.findUnique({ where: { userId } }),
    prisma.casinoStats.findUnique({ where: { userId } }),
    prisma.userAchievement.count({ where: { userId } }),
  ])

  if (!user) return null

  const casinoGames =
    (casinoStats?.slotSpins ?? 0) +
    (casinoStats?.rouletteSpins ?? 0) +
    (casinoStats?.blackjackHandsPlayed ?? 0)

  return {
    chips: user.chips,
    level: user.level,
    experience: user.experience,
    loginStreakCount: user.loginStreakCount,
    achievementsUnlocked: achievementCount,
    poker: {
      totalGames: playerStats?.totalGames ?? 0,
      totalWins: playerStats?.totalWins ?? 0,
      totalHands: playerStats?.totalHands ?? 0,
      biggestPot: playerStats?.biggestPot ?? 0,
      biggestWin: playerStats?.biggestWin ?? 0,
      winStreak: playerStats?.winStreak ?? 0,
      totalChipsWon: playerStats?.totalChipsWon ?? 0,
      totalChipsLost: playerStats?.totalChipsLost ?? 0,
    },
    belote: {
      gamesPlayed: beloteStats?.gamesPlayed ?? 0,
      wins: beloteStats?.wins ?? 0,
      losses: beloteStats?.losses ?? 0,
    },
    casino: {
      totalGames: casinoGames,
      slotSpins: casinoStats?.slotSpins ?? 0,
      rouletteSpins: casinoStats?.rouletteSpins ?? 0,
      blackjackHands: casinoStats?.blackjackHandsPlayed ?? 0,
      slotBiggestWin: casinoStats?.slotBiggestWin ?? 0,
      rouletteBiggestWin: casinoStats?.rouletteBiggestWin ?? 0,
      blackjackBiggestWin: casinoStats?.blackjackBiggestWin ?? 0,
    },
  }
}

export { parsePage }
