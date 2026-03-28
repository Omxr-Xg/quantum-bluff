import express from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { activeGames } from '../shared/activeGames.js'
import { CashGameController } from '../logic/CashGameController.js'
import { quoteHiddenBet, placeHiddenBet } from '../poker/hiddenBets/hiddenBetPlacement.service.js'
import { prisma } from '../config/database.js'
import { rootLogger } from '../observability/logger.js'

const router = express.Router()

router.post('/quote', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const gameId = req.body?.gameId as string
    if (!gameId) return res.status(400).json({ error: 'gameId requis' })
    const game = await activeGames.get(gameId)
    if (!game || !(game instanceof CashGameController)) {
      return res.status(404).json({ error: 'Partie cash introuvable' })
    }
    const out = quoteHiddenBet(game, gameId, req.body)
    rootLogger.info({ msg: 'hidden_bet_quote_requested', userId, gameId, handId: req.body?.handId })
    res.json(out)
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

router.post('/place', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const gameId = req.body?.gameId as string
    if (!gameId) return res.status(400).json({ error: 'gameId requis' })
    const game = await activeGames.get(gameId)
    if (!game || !(game instanceof CashGameController)) {
      return res.status(404).json({ error: 'Partie cash introuvable' })
    }
    const result = await placeHiddenBet(game, gameId, userId, {
      handId: req.body?.handId,
      stake: req.body?.stake,
      combinator: req.body?.combinator ?? 'SINGLE',
      selections: req.body?.selections,
      actionId: req.body?.actionId,
      quoteHash: req.body?.quoteHash,
      expectedPricingVersion: req.body?.pricingVersion,
      quoteExpiresAt: req.body?.quoteExpiresAt,
    })
    rootLogger.info({ msg: 'hidden_bet_placed_http', userId, gameId })
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

router.get('/history', authMiddleware, async (req, res) => {
  const userId = req.userId
  if (!userId) return res.status(401).json({ error: 'Non authentifié' })
  const take = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50))
  const tickets = await prisma.hiddenBetTicket.findMany({
    where: { userId },
    orderBy: { placedAt: 'desc' },
    take,
    include: { selections: true },
  })
  res.json({ tickets })
})

router.get('/:ticketId', authMiddleware, async (req, res) => {
  const userId = req.userId
  if (!userId) return res.status(401).json({ error: 'Non authentifié' })
  const t = await prisma.hiddenBetTicket.findFirst({
    where: { id: req.params.ticketId, userId },
    include: { selections: true },
  })
  if (!t) return res.status(404).json({ error: 'Ticket introuvable' })
  res.json(t)
})

export default router
