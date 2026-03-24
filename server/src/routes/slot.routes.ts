import express from 'express'
import { prisma } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { spinSlot, validateSlotBet, SLOT_MIN_BET, SLOT_MAX_BET_CAP } from '../logic/slotMachine.js'
import { intChips } from '../utils/chips.js'

const router = express.Router()

router.post('/spin', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' })
    }

    const rawBet = req.body?.bet
    const betInput = typeof rawBet === 'number' ? rawBet : Number(rawBet)

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { chips: true },
      })
      if (!user) {
        throw Object.assign(new Error('USER_NOT_FOUND'), { code: 'USER_NOT_FOUND' })
      }

      const chipsBefore = intChips(user.chips)
      const validation = validateSlotBet(betInput, chipsBefore)
      if (!validation.ok) {
        throw Object.assign(new Error(validation.code), { code: validation.code })
      }

      const bet = validation.bet
      // 1) Débiter la mise (perte totale si la machine ne verse rien).
      await tx.user.update({
        where: { id: userId },
        data: { chips: { decrement: bet } },
      })

      const { reels, winAmount } = spinSlot(bet)
      // 2) Créditer le versement machine : 0 si perdu ; sinon total rendu (ex. paire = remboursement de la mise ; brelan = mise × multiplicateur, qui inclut déjà la récupération de la mise au sens « argent rendu »).
      const payout = intChips(winAmount)

      const updated = await tx.user.update({
        where: { id: userId },
        data: { chips: { increment: payout } },
        select: { chips: true },
      })

      return {
        chips: intChips(updated.chips),
        bet,
        /** Total crédité sur ce spin après la mise (0, ou mise en paire, ou plus si combinaison). */
        winAmount: payout,
        reels,
      }
    })

    return res.json(result)
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code === 'INSUFFICIENT_CHIPS') {
      return res.status(400).json({ error: 'Solde insuffisant', code })
    }
    if (code === 'BET_TOO_LOW') {
      return res.status(400).json({ error: `Mise minimum : ${SLOT_MIN_BET}`, code })
    }
    if (code === 'BET_TOO_HIGH') {
      return res.status(400).json({ error: `Mise maximum : ${SLOT_MAX_BET_CAP}`, code })
    }
    if (code === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'Utilisateur introuvable' })
    }
    console.error('[slot] spin error:', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** Métadonnées pour le client (bornes, symboles). */
router.get('/config', (_req, res) => {
  res.json({
    minBet: SLOT_MIN_BET,
    maxBet: SLOT_MAX_BET_CAP,
    symbols: ['cherry', 'lemon', 'bell', 'seven', 'diamond'],
  })
})

export default router
