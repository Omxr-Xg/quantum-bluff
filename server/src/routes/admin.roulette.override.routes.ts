import express from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { prisma } from '../config/database.js'
import {
  resolveSpin,
  resultColor,
  validateRouletteBets,
  type RouletteBetNormalized,
} from '../logic/roulette.js'
import { intChips } from '../utils/chips.js'
import { createCasinoRoundContext } from '../casino/services/roundContext.service.js'
import {
  appendWalletLedgerEntry,
} from '../casino/services/walletLedger.service.js'
import { logCasinoAuditEvent } from '../casino/services/casinoAudit.service.js'

const router = express.Router()

function clientIp(req: express.Request): string {
  const raw = req.ip || req.socket.remoteAddress || ''
  return String(raw)
}

function isLocalhostRequest(req: express.Request): boolean {
  const ip = clientIp(req)
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip === 'localhost'
  )
}

/** Non-prod, opt-in, localhost + jeton admin uniquement (jamais exposé en prod : route 404). */
function isAllowed(req: express.Request): boolean {
  if (process.env.NODE_ENV === 'production') return false
  if (process.env.ENABLE_ADMIN_ROULETTE_OVERRIDE !== 'true') return false
  const configured = process.env.ADMIN_API_TOKEN
  if (!configured || configured.length < 8) return false
  if (!isLocalhostRequest(req)) return false
  return req.header('X-Admin-Token') === configured
}

function betToJson(b: RouletteBetNormalized): Record<string, unknown> {
  return { ...b }
}

router.post('/spin', authMiddleware, async (req, res) => {
  if (!isAllowed(req)) return res.status(404).json({ error: 'Not found' })
  const userId = req.userId
  if (!userId) return res.status(401).json({ error: 'Non authentifié' })
  const forced = Number(req.body?.forceResult)
  if (!Number.isInteger(forced) || forced < 0 || forced > 36) {
    return res.status(400).json({ error: 'forceResult invalide' })
  }

  const context = createCasinoRoundContext({
    userId,
    gameType: 'roulette',
    actionId: req.body?.actionId,
    roundId: req.body?.roundId,
  })

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })
    if (!user) throw new Error('USER_NOT_FOUND')
    const chipsBefore = intChips(user.chips)
    const validation = validateRouletteBets(req.body?.bets, chipsBefore)
    if (!validation.ok) throw new Error(validation.code)
    const { bets, totalStake } = validation

    const debited = await tx.user.updateMany({
      where: { id: userId, chips: { gte: totalStake } },
      data: { chips: { decrement: totalStake } },
    })
    if (debited.count === 0) throw new Error('INSUFFICIENT_CHIPS')
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

    const resolved = resolveSpin(bets, forced)
    logCasinoAuditEvent({
      event: 'admin_override',
      roundId: context.roundId,
      actionId: context.actionId,
      userId,
      gameType: 'roulette',
      details: { forcedResult: forced, totalStake, totalPayout: resolved.totalPayout },
    })
    const credited = await tx.user.update({
      where: { id: userId },
      data: { chips: { increment: resolved.totalPayout } },
      select: { chips: true },
    })
    await appendWalletLedgerEntry(
      {
        context,
        reason: 'ROULETTE_PAYOUT',
        amount: resolved.totalPayout,
        balanceBefore: afterDebit,
        balanceAfter: intChips(credited.chips),
      },
      tx
    )
    return {
      chips: intChips(credited.chips),
      result: forced,
      resultColor: resultColor(forced),
      totalStake,
      totalPayout: resolved.totalPayout,
      betsResolved: resolved.breakdown.map((row) => ({
        bet: betToJson(row.bet),
        stake: row.stake,
        payout: row.payout,
      })),
      audit: {
        roundId: context.roundId,
        actionId: context.actionId,
        note: 'ADMIN_OVERRIDE',
      },
    }
  })
  return res.json(result)
})

export default router

