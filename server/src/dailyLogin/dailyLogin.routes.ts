import express from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import {
  claimDailyLogin,
  getDailyLoginStatus,
  isDailyLoginError,
} from './dailyLogin.service.js'

const router = express.Router()

router.use(authMiddleware)

/** GET /api/daily-login/me — état du streak et récompense disponible aujourd'hui. */
router.get('/me', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const payload = await getDailyLoginStatus(userId)
    return res.json(payload)
  } catch (error) {
    if (isDailyLoginError(error)) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code })
    }
    console.error('[dailyLogin] GET /me error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** POST /api/daily-login/claim — réclame la récompense du jour (si pas encore prise). */
router.post('/claim', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const payload = await claimDailyLogin(userId)
    return res.json({ success: true, ...payload })
  } catch (error) {
    if (isDailyLoginError(error)) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code })
    }
    console.error('[dailyLogin] POST /claim error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
