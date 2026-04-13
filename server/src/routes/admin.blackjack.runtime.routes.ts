import express from 'express'
import {
  getBlackjackRecoveryMetrics,
  getBlackjackRoomRuntimeDiagnostic,
} from '../blackjack/recovery/blackjackRecovery.service.js'
import { requireAdminAccess } from '../middleware/admin.middleware.js'

const router = express.Router()

const requireBlackjackRuntimeAdmin = requireAdminAccess({
  routeName: 'admin_blackjack_runtime',
})

router.get('/metrics', requireBlackjackRuntimeAdmin, async (_req, res) => {
  return res.json({
    blackjackRecovery: getBlackjackRecoveryMetrics(),
  })
})

router.get('/diagnostic/:roomId', requireBlackjackRuntimeAdmin, async (req, res) => {
  const roomId = req.params.roomId?.trim()

  if (!roomId) {
    return res.status(400).json({ error: 'roomId requis' })
  }

  const diagnostic = await getBlackjackRoomRuntimeDiagnostic(roomId)
  return res.json(diagnostic)
})

export default router