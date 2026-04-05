import express from 'express'
import { assessPokerRuntimeReadiness } from '../poker/recovery/pokerRuntimeHealth.service.js'
import { getPokerRecoveryMetrics } from '../poker/recovery/pokerRecovery.service.js'
import { requireAdminAccess } from '../middleware/admin.middleware.js'

const router = express.Router()

const requirePokerRuntimeAdmin = requireAdminAccess({
  routeName: 'admin_poker_runtime',
})

router.get('/metrics', requirePokerRuntimeAdmin, (_req, res) => {
  return res.json({
    pokerRecovery: getPokerRecoveryMetrics(),
  })
})

router.get('/readiness/:gameId', requirePokerRuntimeAdmin, async (req, res) => {
  const gameId = req.params.gameId?.trim()

  if (!gameId) {
    return res.status(400).json({ error: 'gameId requis' })
  }

  const assessment = await assessPokerRuntimeReadiness(gameId)
  return res.json(assessment)
})

export default router