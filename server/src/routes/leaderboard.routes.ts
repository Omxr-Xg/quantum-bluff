import express from 'express'
import { prisma } from '../config/database.js'
import { verifyToken } from '../auth/jwt.service.js'
import { Prisma } from '../generated/prisma/index.js'

const router = express.Router()

const LEADERBOARD_MAX_LIMIT = 50

function parseLimitOffset(q: express.Request['query']): { limit: number; offset: number } {
  const limit = Math.min(
    LEADERBOARD_MAX_LIMIT,
    Math.max(1, parseInt(String(q.limit ?? '50'), 10) || 50)
  )
  const offset = Math.max(0, parseInt(String(q.offset ?? '0'), 10) || 0)
  return { limit, offset }
}

function optionalUserId(req: express.Request): string | undefined {
  const h = req.headers.authorization
  if (!h?.startsWith('Bearer ')) return undefined
  const token = h.slice(7).trim()
  if (!token) return undefined
  try {
    const p = verifyToken(token) as { userId?: string }
    return typeof p.userId === 'string' ? p.userId : undefined
  } catch {
    return undefined
  }
}

router.get('/', async (req, res) => {
  const category = String(req.query.category ?? 'xp').toLowerCase()
  const seasonParam = req.query.season != null ? String(req.query.season) : null
  const { limit, offset } = parseLimitOffset(req.query)
  const userId = optionalUserId(req)

  try {
    if (seasonParam) {
      const { getSeasonLeaderboard, getActiveSeason } = await import('../season/season.service.js')
      let seasonId = seasonParam
      if (seasonParam === 'active') {
        const active = await getActiveSeason()
        if (!active) return res.json({ items: [], season: null, totalPlayers: 0 })
        seasonId = active.id
      }
      const items = await getSeasonLeaderboard(seasonId, limit)
      return res.json({
        category: 'season_xp',
        season: seasonId,
        items: items.map((r) => ({
          username: r.username,
          rank: r.rank,
          value: r.xpEarned,
          pokerWins: r.pokerWins,
          beloteWins: r.beloteWins,
        })),
        totalPlayers: items.length,
      })
    }

    const totalPlayers = await prisma.user.count()
    let items: { username: string; rank: number; value: number; level?: number }[] = []
    let myRank: number | undefined

    const rankBase = offset + 1

    if (category === 'xp' || category === 'general') {
      const rows = await prisma.$queryRaw<{ username: string; experience: number; level: number }[]>(
        Prisma.sql`
        SELECT username, experience, level FROM "User"
        ORDER BY experience DESC, username ASC
        LIMIT ${limit} OFFSET ${offset}
      `
      )
      items = rows.map((r, i) => ({
        username: r.username,
        rank: rankBase + i,
        value: r.experience,
        level: r.level,
      }))
      if (userId) {
        const u = await prisma.user.findUnique({
          where: { id: userId },
          select: { experience: true, username: true },
        })
        if (u) {
          const cnt = await prisma.$queryRaw<[{ c: bigint }]>(
            Prisma.sql`
            SELECT COUNT(*)::bigint AS c FROM "User" x
            WHERE x.experience > ${u.experience}
               OR (x.experience = ${u.experience} AND x.username < ${u.username})
          `
          )
          myRank = Number(cnt[0].c) + 1
        }
      }
    } else if (category === 'chips') {
      const rows = await prisma.$queryRaw<{ username: string; chips: number; level: number }[]>(
        Prisma.sql`
        SELECT username, chips, level FROM "User"
        ORDER BY chips DESC, username ASC
        LIMIT ${limit} OFFSET ${offset}
      `
      )
      items = rows.map((r, i) => ({
        username: r.username,
        rank: rankBase + i,
        value: r.chips,
        level: r.level,
      }))
      if (userId) {
        const u = await prisma.user.findUnique({
          where: { id: userId },
          select: { chips: true, username: true },
        })
        if (u) {
          const cnt = await prisma.$queryRaw<[{ c: bigint }]>(
            Prisma.sql`
            SELECT COUNT(*)::bigint AS c FROM "User" x
            WHERE x.chips > ${u.chips}
               OR (x.chips = ${u.chips} AND x.username < ${u.username})
          `
          )
          myRank = Number(cnt[0].c) + 1
        }
      }
    } else if (category === 'poker_wins') {
      const rows = await prisma.$queryRaw<{ username: string; value: number; level: number }[]>(
        Prisma.sql`
        SELECT u.username,
               COALESCE(p."totalWins", 0)::int AS value,
               u.level
        FROM "User" u
        LEFT JOIN "PlayerStats" p ON p."playerId" = u.id
        ORDER BY value DESC, u.username ASC
        LIMIT ${limit} OFFSET ${offset}
      `
      )
      items = rows.map((r, i) => ({
        username: r.username,
        rank: rankBase + i,
        value: r.value,
        level: r.level,
      }))
      if (userId) {
        const u = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true, playerStats: { select: { totalWins: true } } },
        })
        if (u) {
          const myWins = u.playerStats?.totalWins ?? 0
          const cnt = await prisma.$queryRaw<[{ c: bigint }]>(
            Prisma.sql`
            SELECT COUNT(*)::bigint AS c
            FROM "User" ux
            LEFT JOIN "PlayerStats" px ON px."playerId" = ux.id
            WHERE COALESCE(px."totalWins", 0) > ${myWins}
               OR (COALESCE(px."totalWins", 0) = ${myWins} AND ux.username < ${u.username})
          `
          )
          myRank = Number(cnt[0].c) + 1
        }
      }
    } else if (category === 'slot_biggest') {
      const rows = await prisma.$queryRaw<{ username: string; value: number; level: number }[]>(
        Prisma.sql`
        SELECT u.username,
               COALESCE(c."slotBiggestWin", 0)::int AS value,
               u.level
        FROM "User" u
        LEFT JOIN casino_stats c ON c."userId" = u.id
        ORDER BY value DESC, u.username ASC
        LIMIT ${limit} OFFSET ${offset}
      `
      )
      items = rows.map((r, i) => ({
        username: r.username,
        rank: rankBase + i,
        value: r.value,
        level: r.level,
      }))
      if (userId) {
        const u = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true, casinoStats: { select: { slotBiggestWin: true } } },
        })
        if (u) {
          const myV = u.casinoStats?.slotBiggestWin ?? 0
          const cnt = await prisma.$queryRaw<[{ c: bigint }]>(
            Prisma.sql`
            SELECT COUNT(*)::bigint AS c
            FROM "User" ux
            LEFT JOIN casino_stats cx ON cx."userId" = ux.id
            WHERE COALESCE(cx."slotBiggestWin", 0) > ${myV}
               OR (COALESCE(cx."slotBiggestWin", 0) = ${myV} AND ux.username < ${u.username})
          `
          )
          myRank = Number(cnt[0].c) + 1
        }
      }
    } else if (category === 'roulette_biggest') {
      const rows = await prisma.$queryRaw<{ username: string; value: number; level: number }[]>(
        Prisma.sql`
        SELECT u.username,
               COALESCE(c."rouletteBiggestWin", 0)::int AS value,
               u.level
        FROM "User" u
        LEFT JOIN casino_stats c ON c."userId" = u.id
        ORDER BY value DESC, u.username ASC
        LIMIT ${limit} OFFSET ${offset}
      `
      )
      items = rows.map((r, i) => ({
        username: r.username,
        rank: rankBase + i,
        value: r.value,
        level: r.level,
      }))
      if (userId) {
        const u = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true, casinoStats: { select: { rouletteBiggestWin: true } } },
        })
        if (u) {
          const myV = u.casinoStats?.rouletteBiggestWin ?? 0
          const cnt = await prisma.$queryRaw<[{ c: bigint }]>(
            Prisma.sql`
            SELECT COUNT(*)::bigint AS c
            FROM "User" ux
            LEFT JOIN casino_stats cx ON cx."userId" = ux.id
            WHERE COALESCE(cx."rouletteBiggestWin", 0) > ${myV}
               OR (COALESCE(cx."rouletteBiggestWin", 0) = ${myV} AND ux.username < ${u.username})
          `
          )
          myRank = Number(cnt[0].c) + 1
        }
      }
    } else if (category === 'belote_wins') {
      const rows = await prisma.$queryRaw<{ username: string; value: number; level: number }[]>(
        Prisma.sql`
        SELECT u.username,
               COALESCE(b.wins, 0)::int AS value,
               u.level
        FROM "User" u
        LEFT JOIN belote_player_stats b ON b."userId" = u.id
        ORDER BY value DESC, u.username ASC
        LIMIT ${limit} OFFSET ${offset}
      `
      )
      items = rows.map((r, i) => ({
        username: r.username,
        rank: rankBase + i,
        value: r.value,
        level: r.level,
      }))
      if (userId) {
        const u = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true, belotePlayerStats: { select: { wins: true } } },
        })
        if (u) {
          const myWins = u.belotePlayerStats?.wins ?? 0
          const cnt = await prisma.$queryRaw<[{ c: bigint }]>(
            Prisma.sql`
            SELECT COUNT(*)::bigint AS c
            FROM "User" ux
            LEFT JOIN belote_player_stats bx ON bx."userId" = ux.id
            WHERE COALESCE(bx.wins, 0) > ${myWins}
               OR (COALESCE(bx.wins, 0) = ${myWins} AND ux.username < ${u.username})
          `
          )
          myRank = Number(cnt[0].c) + 1
        }
      }
    } else if (category === 'blackjack_biggest') {
      const rows = await prisma.$queryRaw<{ username: string; value: number; level: number }[]>(
        Prisma.sql`
        SELECT u.username,
               COALESCE(c."blackjackBiggestWin", 0)::int AS value,
               u.level
        FROM "User" u
        LEFT JOIN casino_stats c ON c."userId" = u.id
        ORDER BY value DESC, u.username ASC
        LIMIT ${limit} OFFSET ${offset}
      `
      )
      items = rows.map((r, i) => ({
        username: r.username,
        rank: rankBase + i,
        value: r.value,
        level: r.level,
      }))
      if (userId) {
        const u = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true, casinoStats: { select: { blackjackBiggestWin: true } } },
        })
        if (u) {
          const myV = u.casinoStats?.blackjackBiggestWin ?? 0
          const cnt = await prisma.$queryRaw<[{ c: bigint }]>(
            Prisma.sql`
            SELECT COUNT(*)::bigint AS c
            FROM "User" ux
            LEFT JOIN casino_stats cx ON cx."userId" = ux.id
            WHERE COALESCE(cx."blackjackBiggestWin", 0) > ${myV}
               OR (COALESCE(cx."blackjackBiggestWin", 0) = ${myV} AND ux.username < ${u.username})
          `
          )
          myRank = Number(cnt[0].c) + 1
        }
      }
    } else {
      return res.status(400).json({
        error: 'Catégorie invalide',
        valid: [
          'xp',
          'general',
          'chips',
          'poker_wins',
          'belote_wins',
          'slot_biggest',
          'roulette_biggest',
          'blackjack_biggest',
        ],
      })
    }

    res.json({
      category,
      items,
      totalPlayers,
      offset,
      limit,
      ...(myRank !== undefined ? { myRank } : {}),
    })
  } catch (e) {
    console.error('[leaderboard]', e)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
