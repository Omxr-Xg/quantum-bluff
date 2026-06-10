import { randomBytes, randomUUID } from 'node:crypto'
import { prisma } from '../config/database.js'
import { intChips } from '../utils/chips.js'
import {
  computeCrashPayout,
  generateCrashPoint,
  isRoundCrashed,
  multiplierAtElapsedSeconds,
  resolveCashoutMultiplier,
  validateCrashBet,
} from '../logic/crash.js'
import { crashRoundStore } from './crashRoundStore.js'
import { crashRoundPublicView, elapsedCrashSec } from './crashRoundReconcile.js'
import { createCasinoRoundContext } from '../casino/services/roundContext.service.js'
import { appendWalletLedgerEntry } from '../casino/services/walletLedger.service.js'
import { applyRepaymentOnPositiveWin } from '../services/friendLoan.service.js'
import { markCrashCashout, markCrashRoundStarted } from '../dailyChallenges/dailyChallenge.service.js'

function secureRandomUnit(): number {
  return randomBytes(4).readUInt32BE(0) / 0xffffffff
}

export type CrashTickResult =
  | {
      status: 'running'
      roundId: string
      bet: number
      startedAt: number
      multiplier: number
      serverNow: number
    }
  | {
      status: 'cashed_out'
      roundId: string
      multiplier: number
      payout: number
      profit: number
      crashPoint: number
      chips?: number
      serverNow: number
    }
  | {
      status: 'crashed'
      roundId: string
      crashPoint: number
      lost: number
      chips?: number
      serverNow: number
    }

export const crashService = {
  getActive(userId: string) {
    crashRoundStore.reconcileUser(userId)
    const round = crashRoundStore.getActiveRound(userId)
    if (!round) return { active: false as const }
    const serverNow = Date.now()
    return {
      active: true as const,
      serverNow,
      ...crashRoundPublicView(round, serverNow),
    }
  },

  async start(
    userId: string,
    body: { bet?: unknown; actionId?: string; roundId?: string },
  ) {
    crashRoundStore.reconcileUser(userId)
    const activeId = crashRoundStore.getActiveRoundId(userId)
    if (activeId) {
      const round = crashRoundStore.getActiveRound(userId)
      const serverNow = Date.now()
      const err = new Error('ACTIVE_CRASH_ROUND') as Error & {
        code: string
        status: number
        payload: Record<string, unknown>
      }
      err.code = 'ACTIVE_CRASH_ROUND'
      err.status = 409
      err.payload = {
        error: 'Partie déjà en cours',
        code: 'ACTIVE_CRASH_ROUND',
        roundId: activeId,
        serverNow,
        ...(round ? crashRoundPublicView(round, serverNow) : {}),
      }
      throw err
    }

    const context = createCasinoRoundContext({
      userId,
      gameType: 'crash',
      actionId: body.actionId,
      roundId: body.roundId,
    })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })
    if (!user) {
      const err = new Error('USER_NOT_FOUND') as Error & { code: string; status: number }
      err.code = 'USER_NOT_FOUND'
      err.status = 404
      throw err
    }

    const chipsBefore = intChips(user.chips)
    const validation = validateCrashBet(body.bet, chipsBefore)
    if (!validation.ok) {
      const err = new Error(validation.code) as Error & { code: string; status: number }
      err.code = validation.code
      err.status = 400
      throw err
    }

    const bet = validation.bet
    const crashPoint = generateCrashPoint(secureRandomUnit)

    await prisma.$transaction(async (tx) => {
      const debit = await tx.user.updateMany({
        where: { id: userId, chips: { gte: bet } },
        data: { chips: { decrement: bet } },
      })
      if (debit.count === 0) {
        const e = new Error('INSUFFICIENT_CHIPS') as Error & { code: string; status: number }
        e.code = 'INSUFFICIENT_CHIPS'
        e.status = 409
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

    const startedAtMs = Date.now()
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

    return {
      roundId: context.roundId,
      startedAt: startedAtMs,
      serverNow: startedAtMs,
      multiplier: 1,
      bet,
      chips: intChips(updated?.chips ?? chipsBefore - bet),
    }
  },

  async cashout(userId: string, roundId: string, actionId?: string) {
    const round = crashRoundStore.getRound(roundId)
    if (!round || round.userId !== userId) {
      const err = new Error('ROUND_NOT_FOUND') as Error & { code: string; status: number }
      err.code = 'ROUND_NOT_FOUND'
      err.status = 404
      throw err
    }
    if (round.status !== 'running') {
      const err = new Error('ROUND_NOT_RUNNING') as Error & { code: string; status: number }
      err.code = 'ROUND_NOT_RUNNING'
      err.status = 409
      throw err
    }

    const serverNow = Date.now()
    const elapsed = elapsedCrashSec(round.startedAtMs, serverNow)
    const cashoutCheck = resolveCashoutMultiplier(elapsed, round.crashPoint)
    if (!cashoutCheck.ok) {
      const err = new Error(cashoutCheck.code) as Error & { code: string; status: number }
      err.code = cashoutCheck.code
      err.status = 400
      throw err
    }

    const multiplier = cashoutCheck.multiplier
    const payout = computeCrashPayout(round.bet, multiplier)
    const context = createCasinoRoundContext({
      userId,
      gameType: 'crash',
      roundId,
      actionId: actionId ?? randomUUID(),
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

    return {
      multiplier,
      payout,
      profit: payout - round.bet,
      crashPoint: round.crashPoint,
      serverNow,
      chips: intChips(updated?.chips ?? balBefore + payout),
    }
  },

  async tick(userId: string, roundId: string): Promise<CrashTickResult> {
    const round = crashRoundStore.getRound(roundId)
    if (!round || round.userId !== userId) {
      const err = new Error('ROUND_NOT_FOUND') as Error & { code: string; status: number }
      err.code = 'ROUND_NOT_FOUND'
      err.status = 404
      throw err
    }

    const serverNow = Date.now()

    if (round.status === 'cashed_out') {
      return {
        status: 'cashed_out',
        roundId,
        multiplier: round.cashoutMultiplier ?? 1,
        payout: round.payout ?? 0,
        profit: (round.payout ?? 0) - round.bet,
        crashPoint: round.crashPoint,
        serverNow,
      }
    }

    if (round.status === 'crashed') {
      return {
        status: 'crashed',
        roundId,
        crashPoint: round.crashPoint,
        lost: round.bet,
        serverNow,
      }
    }

    const elapsed = elapsedCrashSec(round.startedAtMs, serverNow)
    const currentMult = multiplierAtElapsedSeconds(elapsed)

    if (!isRoundCrashed(elapsed, round.crashPoint)) {
      return {
        status: 'running',
        roundId,
        bet: round.bet,
        startedAt: round.startedAtMs,
        multiplier: currentMult,
        serverNow,
      }
    }

    crashRoundStore.updateRound(roundId, { status: 'crashed' })

    const updated = await prisma.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })

    return {
      status: 'crashed',
      roundId,
      crashPoint: round.crashPoint,
      lost: round.bet,
      serverNow: Date.now(),
      chips: intChips(updated?.chips ?? 0),
    }
  },
}
