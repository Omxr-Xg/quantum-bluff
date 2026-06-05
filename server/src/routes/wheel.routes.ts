import express from 'express'
import { randomBytes, randomUUID } from 'node:crypto'
import { prisma } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { intChips } from '../utils/chips.js'
import {
  computeFinalAngle,
  computeWheelPayout,
  getWheelSegment,
  pickWheelSegmentIndex,
  validateWheelBet,
} from '../logic/wheel.js'
import { wheelSpinLock } from '../wheel/wheelSpinLock.js'
import { createCasinoRoundContext } from '../casino/services/roundContext.service.js'
import { appendWalletLedgerEntry } from '../casino/services/walletLedger.service.js'
import { applyRepaymentOnPositiveWin } from '../services/friendLoan.service.js'

const router = express.Router()

function secureRandomUnit(): number {
  return randomBytes(4).readUInt32BE(0) / 0xffffffff
}

router.post('/spin', authMiddleware, async (req, res) => {
  const userId = req.userId
  if (!userId) return res.status(401).json({ error: 'Non authentifié' })

  if (!wheelSpinLock.tryAcquire(userId)) {
    return res.status(409).json({ error: 'Partie déjà en cours', code: 'ACTIVE_WHEEL_SPIN' })
  }

  try {
    const context = createCasinoRoundContext({
      userId,
      gameType: 'wheel',
      actionId: req.body?.actionId,
      roundId: req.body?.roundId,
    })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' })

    const chipsBefore = intChips(user.chips)
    const validation = validateWheelBet(req.body?.bet, chipsBefore)
    if (!validation.ok) {
      return res.status(400).json({ error: validation.code, code: validation.code })
    }

    const bet = validation.bet
    const segmentIndex = pickWheelSegmentIndex(secureRandomUnit)
    const segment = getWheelSegment(segmentIndex)
    const multiplier = segment.multiplier
    const payout = computeWheelPayout(bet, multiplier)
    const finalAngle = computeFinalAngle(segmentIndex, secureRandomUnit)
    const profit = payout - bet

    await prisma.$transaction(async (tx) => {
      const debit = await tx.user.updateMany({
        where: { id: userId, chips: { gte: bet } },
        data: { chips: { decrement: bet } },
      })
      if (debit.count === 0) {
        const e = new Error('INSUFFICIENT_CHIPS') as Error & { code: string }
        e.code = 'INSUFFICIENT_CHIPS'
        throw e
      }

      await appendWalletLedgerEntry(
        {
          context,
          reason: 'WHEEL_STAKE',
          amount: -bet,
          balanceBefore: chipsBefore,
          balanceAfter: chipsBefore - bet,
        },
        tx,
      )

      if (payout > 0) {
        const balAfterDebit = chipsBefore - bet
        const loanPay = await applyRepaymentOnPositiveWin(tx, {
          userId,
          gameType: 'SLOT',
          grossWinAmount: payout,
          casinoStakeAmount: bet,
          sourceReferenceId: context.actionId,
          casinoContext: context,
          balanceBeforeGrossPayout: balAfterDebit,
          payoutLedgerReason: 'WHEEL_PAYOUT',
        })
        if (!loanPay.hadActiveLoan) {
          const updated = await tx.user.update({
            where: { id: userId },
            data: { chips: { increment: payout } },
            select: { chips: true },
          })
          await appendWalletLedgerEntry(
            {
              context,
              reason: 'WHEEL_PAYOUT',
              amount: payout,
              balanceBefore: balAfterDebit,
              balanceAfter: intChips(updated.chips),
            },
            tx,
          )
        }
      }
    })

    const updated = await prisma.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })

    return res.json({
      roundId: context.roundId,
      segmentIndex,
      result: segment.label,
      multiplier,
      gain: payout,
      profit,
      finalAngle,
      chips: intChips(updated?.chips ?? chipsBefore - bet + payout),
    })
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code === 'INSUFFICIENT_CHIPS') {
      return res.status(409).json({ error: code, code })
    }
    console.error('[wheel/spin]', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  } finally {
    wheelSpinLock.release(userId)
  }
})

export default router
