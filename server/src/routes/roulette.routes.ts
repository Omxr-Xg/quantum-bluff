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
import {
  abortIdempotentAction,
  buildIdempotencyKey,
  fingerprintStableJson,
  saveIdempotentResult,
  tryBeginIdempotentAction,
} from '../casino/services/idempotency.service.js'
import { createCasinoRoundContext } from '../casino/services/roundContext.service.js'
import { appendWalletLedgerEntry } from '../casino/services/walletLedger.service.js'
import { assertRoundTransition } from '../casino/services/roundStateMachine.service.js'
import { logCasinoAuditEvent } from '../casino/services/casinoAudit.service.js'
import {
  awardXpInTransaction,
  getEffectiveRouletteMaxPerLine,
  getEffectiveRouletteMaxTotalStake,
  levelFromExperience,
  XP_ROULETTE_SPIN,
  XP_ROULETTE_WIN_BONUS,
} from '../logic/gamification.js'
import { addRouletteNetWinProgress } from '../dailyChallenges/dailyChallenge.service.js'

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
  let idemKey: string | undefined
  let idemCommitted = false
  try {
    const userId = req.userId
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' })
    }

    const context = createCasinoRoundContext({
      userId,
      gameType: 'roulette',
      actionId: req.body?.actionId,
      roundId: req.body?.roundId,
    })
    idemKey = buildIdempotencyKey({
      userId,
      gameType: 'roulette',
      actionId: context.actionId,
    })
    const betsFingerprint = fingerprintStableJson(req.body?.bets)
    const idemStart = await tryBeginIdempotentAction(idemKey, { payloadFingerprint: betsFingerprint })
    if (!idemStart.accepted) {
      if (idemStart.reason === 'PAYLOAD_MISMATCH') {
        return res.status(409).json({
          error: 'Rejeu idempotent : mises différentes pour le même actionId',
          code: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
        })
      }
      if (idemStart.storedResult != null) return res.json(idemStart.storedResult)
      return res.status(409).json({ error: 'Action déjà traitée', code: 'DUPLICATE_ACTION' })
    }

    const rawBets = req.body?.bets

    const outcome = await prisma.$transaction(async (tx) => {
      let roundState: import('../casino/domain/casinoRound.types.js').CasinoRoundState = 'CREATED'
      assertRoundTransition(roundState, 'BETTING_OPEN')
      roundState = 'BETTING_OPEN'
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { chips: true, experience: true },
      })
      if (!user) {
        throw Object.assign(new Error('USER_NOT_FOUND'), { code: 'USER_NOT_FOUND' })
      }

      const lvl = levelFromExperience(user.experience)
      const maxPerLine = getEffectiveRouletteMaxPerLine(lvl)
      const maxTotal = getEffectiveRouletteMaxTotalStake(lvl)

      const chipsBefore = intChips(user.chips)
      const validation = validateRouletteBets(rawBets, chipsBefore, {
        maxPerLine,
        maxTotalStake: maxTotal,
      })
      if (!validation.ok) {
        throw Object.assign(new Error(validation.code), {
          code: validation.code,
          maxPerLine,
          maxTotalStake: maxTotal,
        })
      }

      const { bets, totalStake } = validation
      logCasinoAuditEvent({
        event: 'bet_accepted',
        roundId: context.roundId,
        actionId: context.actionId,
        userId,
        gameType: 'roulette',
        details: { totalStake, betsCount: bets.length },
      })
      assertRoundTransition(roundState, 'BETTING_CLOSED')
      roundState = 'BETTING_CLOSED'

      const debitResult = await tx.user.updateMany({
        where: { id: userId, chips: { gte: totalStake } },
        data: { chips: { decrement: totalStake } },
      })
      if (debitResult.count === 0) {
        throw Object.assign(new Error('INSUFFICIENT_CHIPS'), { code: 'INSUFFICIENT_CHIPS' })
      }
      const afterDebit = chipsBefore - totalStake
      await appendWalletLedgerEntry(
        {
          context,
          reason: 'ROULETTE_STAKE',
          amount: -totalStake,
          balanceBefore: chipsBefore,
          balanceAfter: afterDebit,
        },
        tx
      )

      const result = spinWheel()
      assertRoundTransition(roundState, 'SPINNING')
      roundState = 'SPINNING'
      const { breakdown, totalPayout } = resolveSpin(bets, result)
      logCasinoAuditEvent({
        event: 'result_computed',
        roundId: context.roundId,
        actionId: context.actionId,
        userId,
        gameType: 'roulette',
        details: { result, totalPayout },
      })
      assertRoundTransition(roundState, 'RESULT_READY')
      roundState = 'RESULT_READY'

      const updated = await tx.user.update({
        where: { id: userId },
        data: { chips: { increment: totalPayout } },
        select: { chips: true },
      })
      await appendWalletLedgerEntry(
        {
          context,
          reason: 'ROULETTE_PAYOUT',
          amount: totalPayout,
          balanceBefore: afterDebit,
          balanceAfter: intChips(updated.chips),
        },
        tx
      )

      const prevCasino = await tx.casinoStats.findUnique({ where: { userId } })
      if (!prevCasino) {
        await tx.casinoStats.create({
          data: { userId, rouletteSpins: 1, rouletteBiggestWin: totalPayout },
        })
      } else {
        await tx.casinoStats.update({
          where: { userId },
          data: {
            rouletteSpins: { increment: 1 },
            rouletteBiggestWin: Math.max(totalPayout, prevCasino.rouletteBiggestWin),
          },
        })
      }

      const netPositive = totalPayout > totalStake
      const netWin = Math.max(0, totalPayout - totalStake)
      if (netWin > 0) {
        await addRouletteNetWinProgress(userId, netWin, tx)
      }
      const xpGain = XP_ROULETTE_SPIN + (netPositive ? XP_ROULETTE_WIN_BONUS : 0)
      const gamification = await awardXpInTransaction(tx, userId, xpGain)
      assertRoundTransition(roundState, 'SETTLED')
      logCasinoAuditEvent({
        event: 'round_closed',
        roundId: context.roundId,
        actionId: context.actionId,
        userId,
        gameType: 'roulette',
        details: { totalStake, totalPayout, settlement: 'SETTLED' },
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
        experience: gamification.experience,
        level: gamification.level,
        xpToNext: gamification.xpToNext,
        newBadges: gamification.newBadges,
        maxBetPerLine: maxPerLine,
        maxTotalStake: maxTotal,
        roundId: context.roundId,
        actionId: context.actionId,
      }
    })
    await saveIdempotentResult(idemKey, outcome)
    idemCommitted = true

    return res.json(outcome)
  } catch (e) {
    if (idemKey && !idemCommitted) await abortIdempotentAction(idemKey)
    const code = (e as { code?: string }).code
    const extra = e as { maxPerLine?: number; maxTotalStake?: number }
    const messages: Record<string, string> = {
      INSUFFICIENT_CHIPS: 'Solde insuffisant',
      BET_TOO_LOW: `Mise minimum : ${ROULETTE_MIN_BET}`,
      BET_TOO_HIGH: `Mise maximum par ligne : ${typeof extra.maxPerLine === 'number' ? extra.maxPerLine : ROULETTE_MAX_BET_CAP}`,
      TOTAL_STAKE_TOO_HIGH: `Mise totale max par tour : ${typeof extra.maxTotalStake === 'number' ? extra.maxTotalStake : ROULETTE_MAX_TOTAL_STAKE}`,
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
      return res.status(400).json({
        error: messages[code],
        code,
        ...(typeof extra.maxPerLine === 'number' ? { maxBetPerLine: extra.maxPerLine } : {}),
        ...(typeof extra.maxTotalStake === 'number' ? { maxTotalStake: extra.maxTotalStake } : {}),
      })
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
