/**
 * Routes pour les paris cachés « vainqueur de tournoi » (parimutuel dynamique).
 * Toutes les routes nécessitent une authentification.
 */
import express, { type Request } from 'express'
import type { Server } from 'socket.io'
import { authMiddleware } from '../middleware/auth.middleware.js'
import {
  TOURNAMENT_WINNER_BET_MAX_STAKE,
  TOURNAMENT_WINNER_BET_MIN_STAKE,
  getMyTournamentWinnerBets,
  getTournamentWinnerBetPool,
  placeTournamentWinnerBet,
} from '../tournament/winnerBets/tournamentWinnerBet.service.js'

const router = express.Router({ mergeParams: true })

function getIo(req: Request): Server | undefined {
  return req.app.get('io') as Server | undefined
}

/** Pot global + cotes par candidat (snapshot temps réel). Lecture publique authentifiée. */
router.get('/:id/bets/pool', authMiddleware, async (req, res) => {
  try {
    const snap = await getTournamentWinnerBetPool(req.params.id)
    if (!snap) return res.status(404).json({ error: 'Tournoi introuvable' })
    res.json(snap)
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

/** Mes paris sur ce tournoi (placés, gagnés, perdus, remboursés). */
router.get('/:id/bets/mine', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const rows = await getMyTournamentWinnerBets(userId, req.params.id)
    res.json({ bets: rows })
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

/** Place un pari (PENDING) et débite la mise. Renvoie le nouveau solde. */
router.post('/:id/bets', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const body = (req.body ?? {}) as Record<string, unknown>
    const predictedWinnerUserId = String(body.predictedWinnerUserId ?? '').trim()
    const stake = Math.floor(Number(body.stake))
    if (!predictedWinnerUserId) return res.status(400).json({ error: 'predictedWinnerUserId requis' })
    if (!Number.isFinite(stake) || stake < TOURNAMENT_WINNER_BET_MIN_STAKE || stake > TOURNAMENT_WINNER_BET_MAX_STAKE) {
      return res.status(400).json({
        error: `Mise invalide (${TOURNAMENT_WINNER_BET_MIN_STAKE}–${TOURNAMENT_WINNER_BET_MAX_STAKE})`,
      })
    }
    const result = await placeTournamentWinnerBet({
      bettorUserId: userId,
      tournamentId: req.params.id,
      predictedWinnerUserId,
      stake,
    })
    const io = getIo(req)
    if (io) {
      io.to(`tournament:${req.params.id}`).emit('TOURNAMENT_WINNER_BET_POOL_UPDATED', {
        tournamentId: req.params.id,
      })
    }
    res.status(201).json({ ok: true, bet: result.bet, newBalance: result.newBalance })
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

export default router
