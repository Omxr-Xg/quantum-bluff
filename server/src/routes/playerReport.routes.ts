import express from 'express'
import rateLimit from 'express-rate-limit'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { prisma } from '../config/database.js'
import { playerReportCreateSchema } from '../validation/playerReport.validation.js'

const router = express.Router()

const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de signalements. Réessaie plus tard.' },
})

/** POST /api/reports/player — signalement en partie (authentifié joueur). */
router.post('/player', authMiddleware, reportLimiter, async (req, res) => {
  const reporterId = req.userId
  if (!reporterId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  const parsed = playerReportCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() })
  }

  const { reportedUserId, gameId, reason, detail } = parsed.data

  if (reportedUserId === reporterId) {
    return res.status(400).json({ error: 'Tu ne peux pas te signaler toi-même.' })
  }

  const reported = await prisma.user.findUnique({ where: { id: reportedUserId }, select: { id: true } })
  if (!reported) {
    return res.status(404).json({ error: 'Joueur introuvable' })
  }

  try {
    await prisma.playerReport.create({
      data: {
        reporterId,
        reportedUserId,
        gameId: gameId ?? null,
        reason,
        detail: detail?.trim() ? detail.trim() : null,
      },
    })
    return res.status(201).json({ ok: true })
  } catch (e) {
    console.error('[playerReport] create', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
