import express from 'express'
import { prisma } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.middleware.js'

const router = express.Router()

router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20))
    const offset = Math.max(0, parseInt(String(req.query.offset ?? '0'), 10) || 0)

    const rows = await prisma.beloteGameResultPlayer.findMany({
      where: { userId },
      include: {
        result: {
          include: {
            players: {
              select: { username: true, team: true, won: true, userId: true },
            },
          },
        },
      },
      orderBy: { result: { endedAt: 'desc' } },
      take: limit,
      skip: offset,
    })

    const items = rows.map((r) => ({
      gameId: r.result.gameId,
      endedAt: r.result.endedAt,
      won: r.won,
      team: r.team,
      teamAScore: r.result.teamAScore,
      teamBScore: r.result.teamBScore,
      winningTeam: r.result.winningTeam,
      opponents: r.result.players
        .filter((p) => p.userId !== userId)
        .map((p) => ({ username: p.username, team: p.team, won: p.won })),
    }))

    return res.json({ items, limit, offset })
  } catch (e) {
    console.error('[belote-history]', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
