import express from 'express'
import { randomBytes } from 'node:crypto'
import { prisma } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { intChips } from '../utils/chips.js'
import {
  computeLuckyNumberPayout,
  isLuckyNumberWin,
  pickLuckyNumber,
  validateLuckyNumberBet,
  validateSelectedNumber,
  LUCKY_NUMBER_WIN_MULTIPLIER,
} from '../logic/luckyNumber.js'
import { luckyNumberPlayLock } from '../luckyNumber/luckyNumberPlayLock.js'
import { createCasinoRoundContext } from '../casino/services/roundContext.service.js'
import { appendWalletLedgerEntry } from '../casino/services/walletLedger.service.js'
import { applyRepaymentOnPositiveWin } from '../services/friendLoan.service.js'
import { markLuckyNumberRound } from '../dailyChallenges/dailyChallenge.service.js'

const router = express.Router()

function secureRandomUnit(): number {
  return randomBytes(4).readUInt32BE(0) / 0xffffffff
}

router.post('/play', authMiddleware, async (req, res) => {
  const userId = req.userId
  if (!userId) return res.status(401).json({ error: 'Non authentifié' })

  if (!luckyNumberPlayLock.tryAcquire(userId)) {
    return res.status(409).json({ error: 'Partie déjà en cours', code: 'ACTIVE_LUCKY_NUMBER_PLAY' })
  }

  try {
    const context = createCasinoRoundContext({
      userId,
      gameType: 'lucky_number',
      actionId: req.body?.actionId,
      roundId: req.body?.roundId,
    })

    const numberValidation = validateSelectedNumber(req.body?.selectedNumber)
    if (!numberValidation.ok) {
      return res.status(400).json({ error: numberValidation.code, code: numberValidation.code })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' })

    const chipsBefore = intChips(user.chips)
    const validation = validateLuckyNumberBet(req.body?.bet, chipsBefore)
    if (!validation.ok) {
      return res.status(400).json({ error: validation.code, code: validation.code })
    }

    const bet = validation.bet
    const selectedNumber = numberValidation.selectedNumber
    const drawnNumber = pickLuckyNumber(secureRandomUnit)
    const win = isLuckyNumberWin(selectedNumber, drawnNumber)
    const multiplier = win ? LUCKY_NUMBER_WIN_MULTIPLIER : 0
    const gain = computeLuckyNumberPayout(bet, win)
    const profit = gain - bet

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
          reason: 'LUCKY_NUMBER_STAKE',
          amount: -bet,
          balanceBefore: chipsBefore,
          balanceAfter: chipsBefore - bet,
        },
        tx,
      )

      if (gain > 0) {
        const balAfterDebit = chipsBefore - bet
        const loanPay = await applyRepaymentOnPositiveWin(tx, {
          userId,
          gameType: 'SLOT',
          grossWinAmount: gain,
          casinoStakeAmount: bet,
          sourceReferenceId: context.actionId,
          casinoContext: context,
          balanceBeforeGrossPayout: balAfterDebit,
          payoutLedgerReason: 'LUCKY_NUMBER_PAYOUT',
        })
        if (!loanPay.hadActiveLoan) {
          const updated = await tx.user.update({
            where: { id: userId },
            data: { chips: { increment: gain } },
            select: { chips: true },
          })
          await appendWalletLedgerEntry(
            {
              context,
              reason: 'LUCKY_NUMBER_PAYOUT',
              amount: gain,
              balanceBefore: balAfterDebit,
              balanceAfter: intChips(updated.chips),
            },
            tx,
          )
        }
      }
      await markLuckyNumberRound(userId, tx)
    })

    const updated = await prisma.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })
    const newBalance = intChips(updated?.chips ?? chipsBefore - bet + gain)

    return res.json({
      roundId: context.roundId,
      selectedNumber,
      drawnNumber,
      win,
      multiplier,
      gain,
      profit,
      chips: newBalance,
      newBalance,
    })
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code === 'INSUFFICIENT_CHIPS') {
      return res.status(409).json({ error: code, code })
    }
    console.error('[lucky-number/play]', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  } finally {
    luckyNumberPlayLock.release(userId)
  }
})

export default router
