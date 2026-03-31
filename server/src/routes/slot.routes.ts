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
import { addSlotNetWinProgress } from '../dailyChallenges/dailyChallenge.service.js'
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

const router = express.Router()

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
      gameType: 'slot',
      actionId: req.body?.actionId,
      roundId: req.body?.roundId,
    })
    idemKey = buildIdempotencyKey({
      userId,
      gameType: 'slot',
      actionId: context.actionId,
    })
    const betFingerprint = fingerprintStableJson({ bet: req.body?.bet })
    const idemStart = await tryBeginIdempotentAction(idemKey, { payloadFingerprint: betFingerprint })
    if (!idemStart.accepted) {
      if (idemStart.reason === 'PAYLOAD_MISMATCH') {
        return res.status(409).json({
          error: 'Rejeu idempotent : mise différente pour le même actionId',
          code: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
        })
      }
      if (idemStart.storedResult != null) return res.json(idemStart.storedResult)
      return res.status(409).json({ error: 'Action déjà traitée', code: 'DUPLICATE_ACTION' })
    }

    const rawBet = req.body?.bet
    const betInput = typeof rawBet === 'number' ? rawBet : Number(rawBet)

    const result = await prisma.$transaction(async (tx) => {
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
      logCasinoAuditEvent({
        event: 'bet_accepted',
        roundId: context.roundId,
        actionId: context.actionId,
        userId,
        gameType: 'slot',
        details: { bet },
      })
      assertRoundTransition(roundState, 'BETTING_CLOSED')
      roundState = 'BETTING_CLOSED'
      const debit = await tx.user.updateMany({
        where: { id: userId, chips: { gte: bet } },
        data: { chips: { decrement: bet } },
      })
      if (debit.count === 0) {
        throw Object.assign(new Error('INSUFFICIENT_CHIPS'), { code: 'INSUFFICIENT_CHIPS' })
      }
      const afterDebit = chipsBefore - bet
      await appendWalletLedgerEntry(
        {
          context,
          reason: 'SLOT_STAKE',
          amount: -bet,
          balanceBefore: chipsBefore,
          balanceAfter: afterDebit,
        },
        tx
      )

      const { reels, winAmount } = spinSlot(bet)
      assertRoundTransition(roundState, 'SPINNING')
      roundState = 'SPINNING'
      const payout = intChips(winAmount)
      logCasinoAuditEvent({
        event: 'result_computed',
        roundId: context.roundId,
        actionId: context.actionId,
        userId,
        gameType: 'slot',
        details: { reels, payout },
      })
      assertRoundTransition(roundState, 'RESULT_READY')
      roundState = 'RESULT_READY'

      const updated = await tx.user.update({
        where: { id: userId },
        data: { chips: { increment: payout } },
        select: { chips: true },
      })
      await appendWalletLedgerEntry(
        {
          context,
          reason: 'SLOT_PAYOUT',
          amount: payout,
          balanceBefore: afterDebit,
          balanceAfter: intChips(updated.chips),
        },
        tx
      )

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
      const netWin = Math.max(0, payout - bet)
      if (netWin > 0) {
        await addSlotNetWinProgress(userId, netWin, tx)
      }
      const xpGain = XP_SLOT_SPIN + (netPositive ? XP_SLOT_WIN_BONUS : 0)
      const gamification = await awardXpInTransaction(tx, userId, xpGain)
      assertRoundTransition(roundState, 'SETTLED')
      logCasinoAuditEvent({
        event: 'round_closed',
        roundId: context.roundId,
        actionId: context.actionId,
        userId,
        gameType: 'slot',
        details: { bet, payout, settlement: 'SETTLED' },
      })

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
        roundId: context.roundId,
        actionId: context.actionId,
      }
    })
    await saveIdempotentResult(idemKey, result)
    idemCommitted = true

    return res.json(result)
  } catch (e) {
    if (idemKey && !idemCommitted) await abortIdempotentAction(idemKey)
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
