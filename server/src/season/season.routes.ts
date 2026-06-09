import express from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { daysRemainingInSeason, getActiveSeason, getSeasonLeaderboard } from './season.service.js'

const router = express.Router()

router.get('/active', authMiddleware, async (req, res) => {
  try {
    const season = await getActiveSeason()
    if (!season) return res.json({ season: null })
    const now = new Date()
    const daysRemaining =
      season.status === 'ACTIVE' ? daysRemainingInSeason(season.endsAt, now) : null

    return res.json({
      season: {
        id: season.id,
        number: season.number,
        name: season.name,
        startsAt: season.startsAt.toISOString(),
        endsAt: season.endsAt.toISOString(),
        status: season.status,
        daysRemaining,
      },
    })
  } catch (err) {
    console.error('[seasons] GET /active', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.get('/:id/leaderboard', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(String(req.query.limit ?? '50'), 10) || 50
    const entries = await getSeasonLeaderboard(req.params.id, limit)
    return res.json({ entries })
  } catch (err) {
    console.error('[seasons] GET /:id/leaderboard', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
