import express from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { activeGames } from '../shared/activeGames.js'
import { CashGameController } from '../logic/CashGameController.js'
import { quoteHiddenBet } from '../poker/hiddenBets/services/hiddenBetQuote.service.js'
import { placeHiddenBet } from '../poker/hiddenBets/services/hiddenBetPlace.service.js'
import { listMarketsForPhase } from '../poker/hiddenBets/services/hiddenBetMarkets.service.js'
import type { HiddenBetMarketPhase } from '../poker/hiddenBets/types.js'
import { prisma } from '../config/database.js'
import { rootLogger } from '../observability/logger.js'

const router = express.Router()

const PHASES: HiddenBetMarketPhase[] = ['PRE_HAND', 'LIVE_FLOP', 'LIVE_TURN', 'LIVE_RIVER']

function parseMarketPhase(raw: unknown): HiddenBetMarketPhase | null {
  if (typeof raw !== 'string') return null
  return PHASES.includes(raw as HiddenBetMarketPhase) ? (raw as HiddenBetMarketPhase) : null
}

router.post('/quote', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const gameId = req.body?.gameId as string
    if (!gameId) return res.status(400).json({ error: 'gameId requis' })
    const marketPhase = parseMarketPhase(req.body?.marketPhase)
    if (!marketPhase) return res.status(400).json({ error: 'marketPhase invalide' })
    const game = await activeGames.get(gameId)
    if (!game || !(game instanceof CashGameController)) {
      return res.status(404).json({ error: 'Partie cash introuvable' })
    }
    const out = quoteHiddenBet(game, gameId, { ...req.body, marketPhase })
    rootLogger.info({
      msg: 'hidden_bet_quote_requested',
      userId,
      gameId,
      handId: req.body?.targetHandId ?? req.body?.handId,
      marketPhase,
    })
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
    const marketPhase = parseMarketPhase(req.body?.marketPhase)
    if (!marketPhase) return res.status(400).json({ error: 'marketPhase invalide' })
    const game = await activeGames.get(gameId)
    if (!game || !(game instanceof CashGameController)) {
      return res.status(404).json({ error: 'Partie cash introuvable' })
    }
    const result = await placeHiddenBet(game, gameId, userId, {
      targetHandId: req.body?.targetHandId,
      handId: req.body?.handId,
      marketPhase,
      stake: req.body?.stake,
      combinator: req.body?.combinator ?? 'SINGLE',
      selections: req.body?.selections,
      actionId: req.body?.actionId,
      quoteHash: req.body?.quoteHash,
      expectedPricingVersion: req.body?.pricingVersion,
      quoteExpiresAt: req.body?.quoteExpiresAt,
    })
    rootLogger.info({ msg: 'hidden_bet_placed_http', userId, gameId, marketPhase })
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

router.get('/markets', authMiddleware, async (req, res) => {
  const userId = req.userId
  if (!userId) return res.status(401).json({ error: 'Non authentifié' })
  const gameId = req.query.gameId as string
  if (!gameId) return res.status(400).json({ error: 'gameId requis' })
  const game = await activeGames.get(gameId)
  if (!game || !(game instanceof CashGameController)) {
    return res.status(404).json({ error: 'Partie cash introuvable' })
  }
  const phaseQ = req.query.phase as string | undefined
  const phase: HiddenBetMarketPhase | 'ALL' =
    phaseQ && PHASES.includes(phaseQ as HiddenBetMarketPhase) ? (phaseQ as HiddenBetMarketPhase) : 'ALL'
  const markets = listMarketsForPhase(phase)
  res.json({ markets, gameId })
})

router.get('/history', authMiddleware, async (req, res) => {
  const userId = req.userId
  if (!userId) return res.status(401).json({ error: 'Non authentifié' })
  const take = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50))

  const gameIdQ = req.query.gameId as string | undefined
  if (gameIdQ) {
    const game = await activeGames.get(gameIdQ)
    if (!game || !(game instanceof CashGameController)) {
      return res.status(404).json({ error: 'Partie cash introuvable' })
    }
    const state = game.getSanitizedState(userId)
    const hasSeat = state.cashSeats?.some((s) => s.userId === userId)
    if (!hasSeat) return res.status(403).json({ error: 'Accès refusé' })

    const tickets = await prisma.hiddenBetTicket.findMany({
      where: { gameId: gameIdQ, resolvedAt: { not: null } },
      orderBy: { resolvedAt: 'desc' },
      take,
      include: {
        user: { select: { id: true, username: true } },
        selections: true,
      },
    })
    return res.json({ tickets })
  }

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
