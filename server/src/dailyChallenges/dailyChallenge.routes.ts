import express from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import {
  claimDailyChallenge,
  getMyDailyChallenges,
  isDailyChallengeError,
} from './dailyChallenge.service.js'

const router = express.Router()

router.use(authMiddleware)

router.get('/me', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const payload = await getMyDailyChallenges(userId)
    return res.json(payload)
  } catch (error) {
    console.error('[dailyChallenges] GET /me error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/:challengeCode/claim', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const { challengeCode } = req.params
    const payload = await claimDailyChallenge(userId, challengeCode)
    return res.json({ success: true, ...payload })
  } catch (error) {
    if (isDailyChallengeError(error)) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code })
    }
    console.error('[dailyChallenges] POST /:challengeCode/claim error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
