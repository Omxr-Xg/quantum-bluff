import express from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import {
  claimFreeRecharge,
  getFreeRechargeStatus,
  isFreeRechargeError,
} from './freeRecharge.service.js'

const router = express.Router()

router.use(authMiddleware)

/**
 * GET /api/free-recharge/status
 * Récupère le statut de la recharge gratuite de l'utilisateur
 * - canRecharge: booléen indiquant si une recharge est possible
 * - nextRechargeAt: timestamp ISO de la prochaine recharge disponible (null si maintenant)
 * - hoursUntilRecharge / minutesUntilRecharge: temps restant
 * - lastRechargeAt: timestamp ISO de la dernière recharge
 */
router.get('/status', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' })
    }

    const status = await getFreeRechargeStatus(userId)
    return res.json(status)
  } catch (error) {
    if (isFreeRechargeError(error)) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code })
    }
    console.error('[freeRecharge] GET /status error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/**
 * POST /api/free-recharge/claim
 * Effectue une recharge gratuite (1000 jetons)
 * - Vérifie que le cooldown est expiré
 * - Ajoute les jetons
 * - Retourne le nouveau solde et le cooldown
 */
router.post('/claim', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' })
    }

    const result = await claimFreeRecharge(userId)
    return res.json(result)
  } catch (error) {
    if (isFreeRechargeError(error)) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code })
    }
    console.error('[freeRecharge] POST /claim error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
