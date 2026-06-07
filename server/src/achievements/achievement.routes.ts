import express from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { getUserAchievements } from './achievement.service.js'

const router = express.Router()
router.use(authMiddleware)

router.get('/me', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const payload = await getUserAchievements(userId)
    return res.json(payload)
  } catch (err) {
    console.error('[achievements] GET /me', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
