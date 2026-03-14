import express from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { activeGames } from '../shared/activeGames.js'

const router = express.Router()

const botActionLimiter = rateLimit({
  windowMs: 1000,
  max: 10,
  message: { error: 'Trop de requêtes bot, réessaie dans un instant' },
  standardHeaders: true,
  legacyHeaders: false
})

const botActionSchema = z.object({
  gameId: z.string().min(1),
  playerId: z.string().min(1),
  action: z.enum(['FOLD', 'CALL', 'RAISE', 'CHECK']),
  amount: z.number().int().positive().optional()
})

router.post('/action', botActionLimiter, (req, res) => {
  const parsed = botActionSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors })
  }

  const { gameId, playerId, action, amount } = parsed.data

  const game = activeGames.get(gameId)

  if (!game) {
    return res.status(404).json({ error: 'Partie introuvable' })
  }

  const player = game.getPlayerState(playerId)

  if (!player) {
    return res.status(404).json({ error: 'Bot introuvable' })
  }

  const isBot =
    player.name?.toLowerCase().includes('bot') ||
    player.id?.toLowerCase().includes('bot')

  if (!isBot) {
    return res.status(403).json({ error: 'Ce joueur n’est pas un bot' })
  }

  try {
    game.handlePlayerAction(playerId, action, amount)

    return res.json({
      success: true,
      state: game.getSanitizedState()
    })
  } catch (error) {
    return res.status(400).json({
      error: (error as Error).message
    })
  }
})

export default router