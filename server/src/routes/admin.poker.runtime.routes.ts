import express from 'express'
import { assessPokerRuntimeReadiness } from '../poker/recovery/pokerRuntimeHealth.service.js'
import { getPokerRecoveryMetrics } from '../poker/recovery/pokerRecovery.service.js'

const router = express.Router()

function isAllowed(req: express.Request): boolean {
  const configured = process.env.ADMIN_API_TOKEN
  if (!configured) return false
  return req.header('X-Admin-Token') === configured
}

router.get('/metrics', (req, res) => {
  if (!isAllowed(req)) return res.status(404).json({ error: 'Not found' })
  res.json(getPokerRecoveryMetrics())
})

router.get('/readiness/:gameId', async (req, res) => {
  if (!isAllowed(req)) return res.status(404).json({ error: 'Not found' })
  const assessment = await assessPokerRuntimeReadiness(req.params.gameId)
  res.json(assessment)
})

export default router

