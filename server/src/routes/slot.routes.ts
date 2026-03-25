import express from 'express'
import { prisma } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { spinSlot, validateSlotBet, SLOT_MIN_BET, SLOT_MAX_BET_CAP } from '../logic/slotMachine.js'
import { intChips } from '../utils/chips.js'
import {
  awardXpInTransaction,
  getEffectiveSlotMaxBet,
  levelFromExperience,
  XP_SLOT_SPIN,
  XP_SLOT_WIN_BONUS,
} from '../logic/gamification.js'

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
        select: { chips: true, experience: true },
      })
      if (!user) {
        throw Object.assign(new Error('USER_NOT_FOUND'), { code: 'USER_NOT_FOUND' })
      }

      const lvl = levelFromExperience(user.experience)
      const maxBetEffective = getEffectiveSlotMaxBet(lvl)
      const chipsBefore = intChips(user.chips)
      const validation = validateSlotBet(betInput, chipsBefore, maxBetEffective)
      if (!validation.ok) {
        throw Object.assign(new Error(validation.code), {
          code: validation.code,
          maxBetEffective,
        })
      }

      const bet = validation.bet
      await tx.user.update({
        where: { id: userId },
        data: { chips: { decrement: bet } },
      })

      const { reels, winAmount } = spinSlot(bet)
      const payout = intChips(winAmount)

      const updated = await tx.user.update({
        where: { id: userId },
        data: { chips: { increment: payout } },
        select: { chips: true },
      })

      const prevCasino = await tx.casinoStats.findUnique({ where: { userId } })
      if (!prevCasino) {
        await tx.casinoStats.create({
          data: { userId, slotSpins: 1, slotBiggestWin: payout },
        })
      } else {
        await tx.casinoStats.update({
          where: { userId },
          data: {
            slotSpins: { increment: 1 },
            slotBiggestWin: Math.max(payout, prevCasino.slotBiggestWin),
          },
        })
      }

      const netPositive = payout > bet
      const xpGain = XP_SLOT_SPIN + (netPositive ? XP_SLOT_WIN_BONUS : 0)
      const gamification = await awardXpInTransaction(tx, userId, xpGain)

      return {
        chips: intChips(updated.chips),
        bet,
        winAmount: payout,
        reels,
        experience: gamification.experience,
        level: gamification.level,
        xpToNext: gamification.xpToNext,
        newBadges: gamification.newBadges,
        maxBetSlot: maxBetEffective,
      }
    })

    return res.json(result)
  } catch (e) {
    const code = (e as { code?: string; maxBetEffective?: number }).code
    const maxEff = (e as { maxBetEffective?: number }).maxBetEffective
    if (code === 'INSUFFICIENT_CHIPS') {
      return res.status(400).json({ error: 'Solde insuffisant', code })
    }
    if (code === 'BET_TOO_LOW') {
      return res.status(400).json({ error: `Mise minimum : ${SLOT_MIN_BET}`, code })
    }
    if (code === 'BET_TOO_HIGH') {
      const cap = typeof maxEff === 'number' ? maxEff : SLOT_MAX_BET_CAP
      return res.status(400).json({ error: `Mise maximum : ${cap}`, code, maxBet: cap })
    }
    if (code === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'Utilisateur introuvable' })
    }
    console.error('[slot] spin error:', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.get('/config', (_req, res) => {
  res.json({
    minBet: SLOT_MIN_BET,
    maxBet: SLOT_MAX_BET_CAP,
    symbols: ['cherry', 'lemon', 'bell', 'seven', 'diamond'],
  })
})

export default router
