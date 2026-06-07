import express from 'express'
import { randomBytes, randomUUID } from 'node:crypto'
import { prisma } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { intChips } from '../utils/chips.js'
import {
  computeMinesPayout,
  generateMinePositions,
  isMineCell,
  maxSafeReveals,
  multiplierForSafeReveals,
  validateMineCount,
  validateMinesBet,
  validateMinesCell,
} from '../logic/mines.js'
import { minesRoundStore } from '../mines/minesRoundStore.js'
import { minesRoundPublicView } from '../mines/minesRoundReconcile.js'
import { createCasinoRoundContext } from '../casino/services/roundContext.service.js'
import { appendWalletLedgerEntry } from '../casino/services/walletLedger.service.js'
import { applyRepaymentOnPositiveWin } from '../services/friendLoan.service.js'

const router = express.Router()

function secureRandomUnit(): number {
  return randomBytes(4).readUInt32BE(0) / 0xffffffff
}

async function creditMinesPayout(params: {
  userId: string
  roundId: string
  actionId: string
  bet: number
  multiplier: number
}): Promise<{ payout: number; chips: number }> {
  const payout = computeMinesPayout(params.bet, params.multiplier)
  const context = createCasinoRoundContext({
    userId: params.userId,
    gameType: 'mines',
    roundId: params.roundId,
    actionId: params.actionId,
  })

  const chipsBeforeStake = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { chips: true },
  })
  const balBefore = intChips(chipsBeforeStake?.chips ?? 0)

  await prisma.$transaction(async (tx) => {
    const loanPay = await applyRepaymentOnPositiveWin(tx, {
      userId: params.userId,
      gameType: 'SLOT',
      grossWinAmount: payout,
      casinoStakeAmount: params.bet,
      sourceReferenceId: context.actionId,
      casinoContext: context,
      balanceBeforeGrossPayout: balBefore,
      payoutLedgerReason: 'MINES_PAYOUT',
    })
    if (!loanPay.hadActiveLoan) {
      const updated = await tx.user.update({
        where: { id: params.userId },
        data: { chips: { increment: payout } },
        select: { chips: true },
      })
      await appendWalletLedgerEntry(
        {
          context,
          reason: 'MINES_PAYOUT',
          amount: payout,
          balanceBefore: balBefore,
          balanceAfter: intChips(updated.chips),
        },
        tx,
      )
    }
  })

  const updated = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { chips: true },
  })

  return {
    payout,
    chips: intChips(updated?.chips ?? balBefore + payout),
  }
}

router.get('/active', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    minesRoundStore.reconcileUser(userId)
    const round = minesRoundStore.getActiveRound(userId)
    if (!round) {
      return res.json({ active: false })
    }

    return res.json({
      active: true,
      ...minesRoundPublicView(round),
    })
  } catch (e) {
    console.error('[mines/active]', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/start', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    minesRoundStore.reconcileUser(userId)
    const activeId = minesRoundStore.getActiveRoundId(userId)
    if (activeId) {
      const round = minesRoundStore.getActiveRound(userId)
      return res.status(409).json({
        error: 'Partie déjà en cours',
        code: 'ACTIVE_MINES_ROUND',
        roundId: activeId,
        ...(round ? minesRoundPublicView(round) : {}),
      })
    }

    const context = createCasinoRoundContext({
      userId,
      gameType: 'mines',
      actionId: req.body?.actionId,
      roundId: req.body?.roundId,
    })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' })

    const chipsBefore = intChips(user.chips)
    const betValidation = validateMinesBet(req.body?.bet, chipsBefore)
    if (!betValidation.ok) {
      return res.status(400).json({ error: betValidation.code, code: betValidation.code })
    }

    const mineValidation = validateMineCount(req.body?.mineCount ?? 5)
    if (!mineValidation.ok) {
      return res.status(400).json({ error: mineValidation.code, code: mineValidation.code })
    }

    const bet = betValidation.bet
    const mineCount = mineValidation.mineCount
    const startedAtMs = Date.now()
    const minePositions = generateMinePositions(mineCount, secureRandomUnit)

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
          reason: 'MINES_STAKE',
          amount: -bet,
          balanceBefore: chipsBefore,
          balanceAfter: chipsBefore - bet,
        },
        tx,
      )
    })

    minesRoundStore.createRound({
      roundId: context.roundId,
      userId,
      bet,
      mineCount,
      minePositions,
      revealedCells: [],
      startedAtMs,
      status: 'running',
      currentMultiplier: 1,
    })

    const updated = await prisma.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })

    return res.json({
      roundId: context.roundId,
      mineCount,
      bet,
      chips: intChips(updated?.chips ?? chipsBefore - bet),
    })
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code === 'INSUFFICIENT_CHIPS') {
      return res.status(409).json({ error: code, code })
    }
    if ((e as Error).message === 'ACTIVE_MINES_ROUND') {
      return res.status(409).json({ error: 'ACTIVE_MINES_ROUND', code: 'ACTIVE_MINES_ROUND' })
    }
    console.error('[mines/start]', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/reveal', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const roundId = String(req.body?.roundId ?? '').trim()
    const cellValidation = validateMinesCell(req.body?.cell)
    if (!cellValidation.ok) {
      return res.status(400).json({ error: cellValidation.code, code: cellValidation.code })
    }

    const round = minesRoundStore.getRound(roundId)
    if (!round || round.userId !== userId) {
      return res.status(404).json({ error: 'ROUND_NOT_FOUND', code: 'ROUND_NOT_FOUND' })
    }
    if (round.status !== 'running') {
      return res.status(409).json({ error: 'ROUND_NOT_RUNNING', code: 'ROUND_NOT_RUNNING' })
    }
    if (round.revealedCells.includes(cellValidation.cell)) {
      return res.status(409).json({ error: 'CELL_ALREADY_REVEALED', code: 'CELL_ALREADY_REVEALED' })
    }

    if (isMineCell(round.minePositions, cellValidation.cell)) {
      minesRoundStore.updateRound(roundId, { status: 'busted', currentMultiplier: 0 })
      return res.json({
        safe: false,
        exploded: true,
        minePositions: round.minePositions,
        lost: round.bet,
      })
    }

    const revealedCells = [...round.revealedCells, cellValidation.cell]
    const multiplier = multiplierForSafeReveals(round.mineCount, revealedCells.length)

    if (revealedCells.length >= maxSafeReveals(round.mineCount)) {
      const actionId = req.body?.actionId ?? randomUUID()
      const { payout, chips } = await creditMinesPayout({
        userId,
        roundId,
        actionId,
        bet: round.bet,
        multiplier,
      })
      minesRoundStore.updateRound(roundId, {
        status: 'cashed_out',
        revealedCells,
        currentMultiplier: multiplier,
        cashoutMultiplier: multiplier,
        payout,
      })
      return res.json({
        safe: true,
        multiplier,
        autoCashout: true,
        gain: payout,
        profit: payout - round.bet,
        chips,
      })
    }

    minesRoundStore.updateRound(roundId, {
      revealedCells,
      currentMultiplier: multiplier,
    })

    return res.json({
      safe: true,
      multiplier,
    })
  } catch (e) {
    console.error('[mines/reveal]', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/cashout', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const roundId = String(req.body?.roundId ?? '').trim()
    const round = minesRoundStore.getRound(roundId)
    if (!round || round.userId !== userId) {
      return res.status(404).json({ error: 'ROUND_NOT_FOUND', code: 'ROUND_NOT_FOUND' })
    }
    if (round.status !== 'running') {
      return res.status(409).json({ error: 'ROUND_NOT_RUNNING', code: 'ROUND_NOT_RUNNING' })
    }
    if (round.revealedCells.length === 0) {
      return res.status(400).json({ error: 'NO_SAFE_REVEALS', code: 'NO_SAFE_REVEALS' })
    }

    const multiplier = round.currentMultiplier
    const actionId = req.body?.actionId ?? randomUUID()
    const { payout, chips } = await creditMinesPayout({
      userId,
      roundId,
      actionId,
      bet: round.bet,
      multiplier,
    })

    minesRoundStore.updateRound(roundId, {
      status: 'cashed_out',
      cashoutMultiplier: multiplier,
      payout,
    })

    return res.json({
      gain: payout,
      multiplier,
      profit: payout - round.bet,
      chips,
    })
  } catch (e) {
    console.error('[mines/cashout]', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const roundId = String(req.body?.roundId ?? '').trim()
    const round = minesRoundStore.getRound(roundId)
    if (!round || round.userId !== userId) {
      return res.status(404).json({ error: 'ROUND_NOT_FOUND', code: 'ROUND_NOT_FOUND' })
    }

    if (round.status === 'cashed_out') {
      return res.json({
        status: 'cashed_out',
        multiplier: round.cashoutMultiplier,
        gain: round.payout,
        revealedCells: round.revealedCells,
        mineCount: round.mineCount,
        bet: round.bet,
      })
    }

    if (round.status === 'busted') {
      return res.json({
        status: 'busted',
        minePositions: round.minePositions,
        revealedCells: round.revealedCells,
        lost: round.bet,
        mineCount: round.mineCount,
      })
    }

    return res.json({
      status: 'running',
      multiplier: round.currentMultiplier,
      revealedCells: round.revealedCells,
      mineCount: round.mineCount,
      bet: round.bet,
    })
  } catch (e) {
    console.error('[mines/status]', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
