import express from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { prisma } from '../config/database.js'
import { gameRatingSchema } from '../validation/feedback.validation.js'

const router = express.Router()

router.post('/game-rating', authMiddleware, async (req, res) => {
  const userId = req.userId
  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  const parsed = gameRatingSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() })
  }

  const { stars, message } = parsed.data

  await prisma.gameRating.create({
    data: {
      userId,
      stars,
      message: message ?? null,
    },
  })

  return res.status(201).json({ ok: true })
})

export default router
