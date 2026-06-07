import express from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import type { AnalyticsPeriod, HistoryMode } from './player.service.js'
import { getPlayerAnalytics, getPlayerHistory, getPlayerStats } from './player.service.js'

const router = express.Router()
router.use(authMiddleware)

const HISTORY_MODES = new Set<HistoryMode>(['all', 'poker', 'belote', 'casino', 'tournament'])
const ANALYTICS_PERIODS = new Set<AnalyticsPeriod>(['7d', '30d', '90d', 'all'])

router.get('/history', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const rawMode = String(req.query.mode ?? 'all')
    const mode = HISTORY_MODES.has(rawMode as HistoryMode) ? (rawMode as HistoryMode) : 'all'
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20))

    const payload = await getPlayerHistory(userId, { mode, page, limit })
    return res.json(payload)
  } catch (err) {
    console.error('[player] GET /history', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.get('/analytics', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const rawPeriod = String(req.query.period ?? '30d')
    const period = ANALYTICS_PERIODS.has(rawPeriod as AnalyticsPeriod)
      ? (rawPeriod as AnalyticsPeriod)
      : '30d'

    const payload = await getPlayerAnalytics(userId, period)
    return res.json(payload)
  } catch (err) {
    console.error('[player] GET /analytics', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.get('/stats', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const stats = await getPlayerStats(userId)
    if (!stats) return res.status(404).json({ error: 'Utilisateur introuvable' })
    return res.json(stats)
  } catch (err) {
    console.error('[player] GET /stats', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
