import express from 'express'
import {
  getBlackjackRecoveryMetrics,
  getBlackjackRoomRuntimeDiagnostic,
} from '../blackjack/recovery/blackjackRecovery.service.js'

const router = express.Router()

function requireAdminToken(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const configured = process.env.ADMIN_API_TOKEN
  if (!configured) {
    // If not configured, endpoint is disabled by default.
    return res.status(404).json({ error: 'Not found' })
  }
  const token = req.header('x-admin-token')
  if (!token || token !== configured) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  next()
}

router.get('/metrics', requireAdminToken, async (_req, res) => {
  return res.json({
    blackjackRecovery: getBlackjackRecoveryMetrics(),
  })
})

router.get('/diagnostic/:roomId', requireAdminToken, async (req, res) => {
  const roomId = req.params.roomId
  if (!roomId) return res.status(400).json({ error: 'roomId requis' })
  const diag = await getBlackjackRoomRuntimeDiagnostic(roomId)
  return res.json(diag)
})

export default router

