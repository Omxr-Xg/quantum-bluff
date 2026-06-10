import express from 'express'
import { randomBytes, randomUUID } from 'node:crypto'
import { prisma } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { intChips } from '../utils/chips.js'
import {
  computeCrashPayout,
  generateCrashPoint,
  isRoundCrashed,
  multiplierAtElapsedSeconds,
  validateCashoutMultiplier,
  validateCrashBet,
} from '../logic/crash.js'

function secureRandomUnit(): number {
  return randomBytes(4).readUInt32BE(0) / 0xffffffff
}
import { crashRoundStore } from '../crash/crashRoundStore.js'
import { crashRoundPublicView } from '../crash/crashRoundReconcile.js'
import { createCasinoRoundContext } from '../casino/services/roundContext.service.js'
import { appendWalletLedgerEntry } from '../casino/services/walletLedger.service.js'
import { applyRepaymentOnPositiveWin } from '../services/friendLoan.service.js'
import { markCrashCashout, markCrashRoundStarted } from '../dailyChallenges/dailyChallenge.service.js'

const router = express.Router()

function elapsedSec(startedAtMs: number): number {
  return Math.max(0, (Date.now() - startedAtMs) / 1000)
}

router.get('/active', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    crashRoundStore.reconcileUser(userId)
    const round = crashRoundStore.getActiveRound(userId)
    if (!round) {
      return res.json({ active: false })
    }

    return res.json({
      active: true,
      serverNow: Date.now(),
      ...crashRoundPublicView(round),
    })
  } catch (e) {
    console.error('[crash/active]', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/start', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    crashRoundStore.reconcileUser(userId)
    const activeId = crashRoundStore.getActiveRoundId(userId)
    if (activeId) {
      const round = crashRoundStore.getActiveRound(userId)
      return res.status(409).json({
        error: 'Partie déjà en cours',
        code: 'ACTIVE_CRASH_ROUND',
        roundId: activeId,
        serverNow: Date.now(),
        ...(round ? crashRoundPublicView(round) : {}),
      })
    }

    const context = createCasinoRoundContext({
      userId,
      gameType: 'crash',
      actionId: req.body?.actionId,
      roundId: req.body?.roundId,
    })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' })

    const chipsBefore = intChips(user.chips)
    const validation = validateCrashBet(req.body?.bet, chipsBefore)
    if (!validation.ok) {
      return res.status(400).json({ error: validation.code, code: validation.code })
    }

    const bet = validation.bet
    const startedAtMs = Date.now()
    const crashPoint = generateCrashPoint(secureRandomUnit)

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
          reason: 'CRASH_STAKE',
          amount: -bet,
          balanceBefore: chipsBefore,
          balanceAfter: chipsBefore - bet,
        },
        tx,
      )
    })

    crashRoundStore.createRound({
      roundId: context.roundId,
      userId,
      bet,
      crashPoint,
      startedAtMs,
      status: 'running',
    })
    await markCrashRoundStarted(userId)

    const updated = await prisma.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })

    return res.json({
      roundId: context.roundId,
      startedAt: startedAtMs,
      serverNow: Date.now(),
      bet,
      chips: intChips(updated?.chips ?? chipsBefore - bet),
    })
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code === 'INSUFFICIENT_CHIPS') {
      return res.status(409).json({ error: code, code })
    }
    if ((e as Error).message === 'ACTIVE_CRASH_ROUND') {
      return res.status(409).json({ error: 'ACTIVE_CRASH_ROUND', code: 'ACTIVE_CRASH_ROUND' })
    }
    console.error('[crash/start]', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/cashout', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const roundId = String(req.body?.roundId ?? '').trim()
    const requestedMult = Number(req.body?.multiplier)
    const round = crashRoundStore.getRound(roundId)
    if (!round || round.userId !== userId) {
      return res.status(404).json({ error: 'ROUND_NOT_FOUND', code: 'ROUND_NOT_FOUND' })
    }
    if (round.status !== 'running') {
      return res.status(409).json({ error: 'ROUND_NOT_RUNNING', code: 'ROUND_NOT_RUNNING' })
    }

    const elapsed = elapsedSec(round.startedAtMs)
    const serverMult = multiplierAtElapsedSeconds(elapsed)
    const effectiveRequested = Number.isFinite(requestedMult) ? requestedMult : serverMult
    const cashoutCheck = validateCashoutMultiplier(effectiveRequested, elapsed, round.crashPoint)
    if (!cashoutCheck.ok) {
      return res.status(400).json({ error: cashoutCheck.code, code: cashoutCheck.code })
    }

    const multiplier = cashoutCheck.multiplier
    const payout = computeCrashPayout(round.bet, multiplier)
    const context = createCasinoRoundContext({
      userId,
      gameType: 'crash',
      roundId,
      actionId: req.body?.actionId ?? randomUUID(),
    })

    const chipsBeforeStake = await prisma.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })
    const balBefore = intChips(chipsBeforeStake?.chips ?? 0)

    await prisma.$transaction(async (tx) => {
      const loanPay = await applyRepaymentOnPositiveWin(tx, {
        userId,
        gameType: 'SLOT',
        grossWinAmount: payout,
        casinoStakeAmount: round.bet,
        sourceReferenceId: context.actionId,
        casinoContext: context,
        balanceBeforeGrossPayout: balBefore,
        payoutLedgerReason: 'CRASH_PAYOUT',
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
            reason: 'CRASH_PAYOUT',
            amount: payout,
            balanceBefore: balBefore,
            balanceAfter: intChips(updated.chips),
          },
          tx,
        )
      }
    })

    crashRoundStore.updateRound(roundId, {
      status: 'cashed_out',
      cashoutMultiplier: multiplier,
      payout,
    })
    await markCrashCashout(userId, multiplier)

    const updated = await prisma.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })

    return res.json({
      multiplier,
      payout,
      profit: payout - round.bet,
      crashPoint: round.crashPoint,
      serverNow: Date.now(),
      chips: intChips(updated?.chips ?? balBefore + payout),
    })
  } catch (e) {
    console.error('[crash/cashout]', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/settle', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const roundId = String(req.body?.roundId ?? '').trim()
    const round = crashRoundStore.getRound(roundId)
    if (!round || round.userId !== userId) {
      return res.status(404).json({ error: 'ROUND_NOT_FOUND', code: 'ROUND_NOT_FOUND' })
    }

    const serverNow = Date.now()

    if (round.status === 'cashed_out') {
      return res.json({
        status: 'cashed_out',
        multiplier: round.cashoutMultiplier,
        payout: round.payout,
        crashPoint: round.crashPoint,
        serverNow,
      })
    }

    if (round.status === 'crashed') {
      return res.json({
        status: 'crashed',
        crashPoint: round.crashPoint,
        lost: round.bet,
        serverNow,
      })
    }

    const elapsed = elapsedSec(round.startedAtMs)
    const currentMult = multiplierAtElapsedSeconds(elapsed)

    if (!isRoundCrashed(elapsed, round.crashPoint)) {
      return res.json({
        status: 'running',
        multiplier: currentMult,
        serverNow,
      })
    }

    crashRoundStore.updateRound(roundId, { status: 'crashed' })

    const updated = await prisma.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })

    return res.json({
      status: 'crashed',
      crashPoint: round.crashPoint,
      lost: round.bet,
      serverNow: Date.now(),
      chips: intChips(updated?.chips ?? 0),
    })
  } catch (e) {
    console.error('[crash/settle]', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
