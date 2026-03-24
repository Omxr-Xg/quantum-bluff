import express from 'express'
import { prisma } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import {
  spinWheel,
  validateRouletteBets,
  resolveSpin,
  resultColor,
  EUROPEAN_WHEEL_ORDER,
  ROULETTE_MIN_BET,
  ROULETTE_MAX_BET_CAP,
  ROULETTE_MAX_TOTAL_STAKE,
  ROULETTE_MAX_BETS_PER_SPIN,
  type RouletteBetNormalized,
} from '../logic/roulette.js'
import { intChips } from '../utils/chips.js'

const router = express.Router()

function betToJson(b: RouletteBetNormalized): Record<string, unknown> {
  switch (b.type) {
    case 'straight':
      return { type: b.type, n: b.n, amount: b.amount }
    case 'split':
      return { type: b.type, a: b.a, b: b.b, amount: b.amount }
    case 'street':
      return { type: b.type, base: b.base, amount: b.amount }
    case 'corner':
      return { type: b.type, n1: b.nums[0], n2: b.nums[1], n3: b.nums[2], n4: b.nums[3], amount: b.amount }
    case 'sixLine':
      return { type: b.type, base: b.base, amount: b.amount }
    case 'dozen':
      return { type: b.type, which: b.which, amount: b.amount }
    case 'column':
      return { type: b.type, which: b.which, amount: b.amount }
    default:
      return { type: b.type, amount: b.amount }
  }
}

router.post('/spin', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' })
    }

    const rawBets = req.body?.bets

    const outcome = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { chips: true },
      })
      if (!user) {
        throw Object.assign(new Error('USER_NOT_FOUND'), { code: 'USER_NOT_FOUND' })
      }

      const chipsBefore = intChips(user.chips)
      const validation = validateRouletteBets(rawBets, chipsBefore)
      if (!validation.ok) {
        throw Object.assign(new Error(validation.code), { code: validation.code })
      }

      const { bets, totalStake } = validation

      await tx.user.update({
        where: { id: userId },
        data: { chips: { decrement: totalStake } },
      })

      const result = spinWheel()
      const { breakdown, totalPayout } = resolveSpin(bets, result)

      const updated = await tx.user.update({
        where: { id: userId },
        data: { chips: { increment: totalPayout } },
        select: { chips: true },
      })

      return {
        chips: intChips(updated.chips),
        result,
        resultColor: resultColor(result),
        totalStake,
        totalPayout,
        betsResolved: breakdown.map((row) => ({
          bet: betToJson(row.bet),
          stake: row.stake,
          payout: row.payout,
        })),
      }
    })

    return res.json(outcome)
  } catch (e) {
    const code = (e as { code?: string }).code
    const messages: Record<string, string> = {
      INSUFFICIENT_CHIPS: 'Solde insuffisant',
      BET_TOO_LOW: `Mise minimum : ${ROULETTE_MIN_BET}`,
      BET_TOO_HIGH: `Mise maximum par ligne : ${ROULETTE_MAX_BET_CAP}`,
      TOTAL_STAKE_TOO_HIGH: `Mise totale max par tour : ${ROULETTE_MAX_TOTAL_STAKE}`,
      NO_BETS: 'Aucune mise',
      BETS_NOT_ARRAY: 'Format des mises invalide',
      TOO_MANY_BETS: `Trop de mises (max ${ROULETTE_MAX_BETS_PER_SPIN})`,
      INVALID_BET: 'Mise invalide',
      INVALID_AMOUNT: 'Montant invalide',
      INVALID_NUMBER: 'Numéro invalide',
      INVALID_SPLIT: 'Cheval invalide',
      INVALID_STREET: 'Transversale invalide',
      INVALID_CORNER: 'Carré invalide',
      INVALID_SIXLINE: 'Sixain invalide',
      INVALID_DOZEN: 'Douzaine invalide',
      INVALID_COLUMN: 'Colonne invalide',
      UNKNOWN_BET_TYPE: 'Type de pari inconnu',
    }
    if (code && messages[code]) {
      return res.status(400).json({ error: messages[code], code })
    }
    if (code === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'Utilisateur introuvable' })
    }
    console.error('[roulette] spin error:', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.get('/config', (_req, res) => {
  res.json({
    minBet: ROULETTE_MIN_BET,
    maxBetPerLine: ROULETTE_MAX_BET_CAP,
    maxTotalStake: ROULETTE_MAX_TOTAL_STAKE,
    maxBetsPerSpin: ROULETTE_MAX_BETS_PER_SPIN,
    wheelOrder: [...EUROPEAN_WHEEL_ORDER],
    betTypes: [
      'straight',
      'split',
      'street',
      'corner',
      'sixLine',
      'dozen',
      'column',
      'red',
      'black',
      'even',
      'odd',
      'low',
      'high',
    ],
  })
})

export default router
