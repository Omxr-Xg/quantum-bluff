import express from 'express'
import type { Prisma } from '../generated/prisma/index.js'
import { prisma } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import {
  createShoe,
  shuffleShoe,
  drawCard,
  handValue,
  isNaturalBlackjack,
  playDealerHand,
  settleRound,
  validateBlackjackBet,
  cardToPublic,
  BLACKJACK_MAX_BET_CAP,
  type Card,
} from '../logic/blackjack.js'
import { getSession, setSession, clearSession } from '../logic/blackjackSessionStore.js'
import { intChips } from '../utils/chips.js'
import {
  awardXpInTransaction,
  getEffectiveBlackjackMaxBet,
  levelFromExperience,
  XP_BLACKJACK_HAND,
  XP_BLACKJACK_WIN_BONUS,
} from '../logic/gamification.js'
import {
  abortIdempotentAction,
  buildIdempotencyKey,
  fingerprintStableJson,
  saveIdempotentResult,
  tryBeginIdempotentAction,
} from '../casino/services/idempotency.service.js'
import { createCasinoRoundContext } from '../casino/services/roundContext.service.js'
import { appendWalletLedgerEntry } from '../casino/services/walletLedger.service.js'
import type { CasinoRoundContext } from '../casino/domain/casinoRound.types.js'
import { applyRepaymentOnPositiveWin } from '../services/friendLoan.service.js'
import { emitToUsers, FRIEND_LOAN_SOCKET } from '../services/friendLoan.emit.js'

const router = express.Router()

function emitLoanSocketsIfNeeded(req: express.Request, loanPay?: Awaited<ReturnType<typeof applyRepaymentOnPositiveWin>>): void {
  const io = req.app.get('io') as import('socket.io').Server | undefined
  if (loanPay?.socketRepayment) {
    emitToUsers(
      io,
      [loanPay.socketRepayment.borrowerId, loanPay.socketRepayment.lenderId],
      FRIEND_LOAN_SOCKET.LOAN_REPAYMENT_PROGRESS,
      loanPay.socketRepayment
    )
  }
  if (loanPay?.socketCompleted) {
    emitToUsers(
      io,
      [loanPay.socketCompleted.borrowerId, loanPay.socketCompleted.lenderId],
      FRIEND_LOAN_SOCKET.LOAN_COMPLETED,
      loanPay.socketCompleted
    )
  }
}

function publicCards(cards: Card[]) {
  return cards.map(cardToPublic)
}

async function finalizeHand(
  tx: Prisma.TransactionClient,
  userId: string,
  player: Card[],
  dealer: Card[],
  totalBet: number,
  casinoContext: CasinoRoundContext
): Promise<{
  payout: number
  reason: string
  chips: number
  experience: number
  level: number
  xpToNext: number
  newBadges: string[]
  maxBetBlackjack: number
  loanPay?: Awaited<ReturnType<typeof applyRepaymentOnPositiveWin>>
}> {
  const { payout, reason } = settleRound(player, dealer, totalBet)

  const beforeRow = await tx.user.findUnique({
    where: { id: userId },
    select: { chips: true, experience: true },
  })
  if (!beforeRow) {
    throw Object.assign(new Error('USER_NOT_FOUND'), { code: 'USER_NOT_FOUND' })
  }
  const balanceBeforePayout = intChips(beforeRow.chips)

  let loanPay: Awaited<ReturnType<typeof applyRepaymentOnPositiveWin>> | undefined
  let updated: { chips: number; experience: number }

  if (payout > 0) {
    loanPay = await applyRepaymentOnPositiveWin(tx, {
      userId,
      gameType: 'BLACKJACK_SOLO',
      grossWinAmount: payout,
      sourceReferenceId: casinoContext.actionId,
      casinoContext,
      balanceBeforeGrossPayout: balanceBeforePayout,
      payoutLedgerReason: 'BLACKJACK_PAYOUT',
    })
    if (!loanPay.hadActiveLoan) {
      updated = await tx.user.update({
        where: { id: userId },
        data: { chips: { increment: payout } },
        select: { chips: true, experience: true },
      })
      await appendWalletLedgerEntry(
        {
          context: casinoContext,
          reason: 'BLACKJACK_PAYOUT',
          amount: payout,
          balanceBefore: balanceBeforePayout,
          balanceAfter: intChips(updated.chips),
        },
        tx
      )
    } else {
      updated = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { chips: true, experience: true },
      })
    }
  } else {
    updated = beforeRow
  }

  const prevCasino = await tx.casinoStats.findUnique({ where: { userId } })
  if (!prevCasino) {
    await tx.casinoStats.create({
      data: {
        userId,
        blackjackHandsPlayed: 1,
        blackjackBiggestWin: payout,
      },
    })
  } else {
    await tx.casinoStats.update({
      where: { userId },
      data: {
        blackjackHandsPlayed: { increment: 1 },
        blackjackBiggestWin: Math.max(payout, prevCasino.blackjackBiggestWin),
      },
    })
  }

  const winBonus = payout > totalBet ? XP_BLACKJACK_WIN_BONUS : 0
  const gamification = await awardXpInTransaction(tx, userId, XP_BLACKJACK_HAND + winBonus)
  const lvl = levelFromExperience(updated.experience)
  const maxBetBlackjack = getEffectiveBlackjackMaxBet(lvl)

  return {
    payout,
    reason,
    chips: intChips(updated.chips),
    experience: gamification.experience,
    level: gamification.level,
    xpToNext: gamification.xpToNext,
    newBadges: gamification.newBadges,
    maxBetBlackjack,
    ...(loanPay ? { loanPay } : {}),
  }
}

/** POST /start — nouvelle main (débite la mise). */
router.post('/start', authMiddleware, async (req, res) => {
  let idemKey: string | undefined
  let idemCommitted = false
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const context = createCasinoRoundContext({
      userId,
      gameType: 'blackjack',
      actionId: req.body?.actionId,
      roundId: req.body?.roundId,
    })
    idemKey = buildIdempotencyKey({
      userId,
      gameType: 'blackjack:start',
      actionId: context.actionId,
    })
    const startFingerprint = fingerprintStableJson({ bet: req.body?.bet })
    const idemStart = await tryBeginIdempotentAction(idemKey, { payloadFingerprint: startFingerprint })
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

    if (getSession(userId)) {
      await abortIdempotentAction(idemKey)
      return res.status(409).json({ error: 'Une main est déjà en cours', code: 'SESSION_ACTIVE' })
    }

    const rawBet = req.body?.bet
    const outcome = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { chips: true, experience: true },
      })
      if (!user) {
        throw Object.assign(new Error('USER_NOT_FOUND'), { code: 'USER_NOT_FOUND' })
      }

      const lvl = levelFromExperience(user.experience)
      const maxBetEffective = Math.min(BLACKJACK_MAX_BET_CAP, getEffectiveBlackjackMaxBet(lvl))
      const chipsBefore = intChips(user.chips)
      const validation = validateBlackjackBet(rawBet, chipsBefore, maxBetEffective)
      if (!validation.ok) {
        throw Object.assign(new Error(validation.code), {
          code: validation.code,
          maxBetEffective,
        })
      }
      const bet = validation.bet

      const debit = await tx.user.updateMany({
        where: { id: userId, chips: { gte: bet } },
        data: { chips: { decrement: bet } },
      })
      if (debit.count === 0) {
        throw Object.assign(new Error('INSUFFICIENT_CHIPS'), { code: 'INSUFFICIENT_CHIPS' })
      }
      await appendWalletLedgerEntry(
        {
          context,
          reason: 'BLACKJACK_STAKE',
          amount: -bet,
          balanceBefore: chipsBefore,
          balanceAfter: chipsBefore - bet,
        },
        tx
      )

      const shoe = createShoe()
      shuffleShoe(shoe)
      const player: Card[] = [drawCard(shoe), drawCard(shoe)]
      const dealer: Card[] = [drawCard(shoe), drawCard(shoe)]

      if (isNaturalBlackjack(player)) {
        const fin = await finalizeHand(tx, userId, player, dealer, bet, context)
        const { loanPay, ...finClient } = fin
        return {
          type: 'complete' as const,
          player: publicCards(player),
          dealer: publicCards(dealer),
          ...finClient,
          totalBet: bet,
          roundId: context.roundId,
          actionId: context.actionId,
          loanPay,
        }
      }

      return {
        type: 'player_turn' as const,
        bet,
        shoe,
        player,
        dealer,
        maxBetEffective,
        roundId: context.roundId,
        actionId: context.actionId,
      }
    })

    if (outcome.type === 'complete') {
      const { type: _t, loanPay, ...rest } = outcome
      await saveIdempotentResult(idemKey, rest)
      idemCommitted = true
      emitLoanSocketsIfNeeded(req, loanPay)
      return res.json(rest)
    }

    const { shoe, player, dealer, bet, maxBetEffective, roundId, actionId } = outcome
    setSession(userId, {
      shoe,
      player,
      dealer,
      initialBet: bet,
      totalBet: bet,
      updatedAt: Date.now(),
      roundId,
      actionId,
    })

    const uAfter = await prisma.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })
    const chipsAfter = intChips(uAfter?.chips ?? 0)

    const response = {
      phase: 'player',
      player: publicCards(player),
      dealerUp: publicCards([dealer[0]!]),
      dealerHole: true,
      canDouble: chipsAfter >= bet,
      chips: chipsAfter,
      totalBet: bet,
      maxBetBlackjack: maxBetEffective,
      roundId: outcome.roundId,
      actionId: outcome.actionId,
    }
    await saveIdempotentResult(idemKey, response)
    idemCommitted = true
    return res.json(response)
  } catch (e) {
    if (idemKey && !idemCommitted) await abortIdempotentAction(idemKey)
    const code = (e as { code?: string }).code
    const maxBetEffective = (e as { maxBetEffective?: number }).maxBetEffective
    if (code === 'INSUFFICIENT_CHIPS') {
      return res.status(400).json({ error: 'Solde insuffisant', code })
    }
    if (code === 'BET_TOO_LOW' || code === 'BET_TOO_HIGH' || code === 'BET_INVALID') {
      return res.status(400).json({ error: 'Mise invalide', code, maxBetBlackjack: maxBetEffective })
    }
    if (code === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'Utilisateur introuvable' })
    }
    console.error('[blackjack/start]', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** POST /action — hit | stand | double */
router.post('/action', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const session = getSession(userId)
    if (!session) {
      return res.status(404).json({ error: 'Aucune main en cours', code: 'NO_SESSION' })
    }

    const bjCtx = createCasinoRoundContext({
      userId,
      gameType: 'blackjack',
      roundId: session.roundId,
      actionId: session.actionId,
    })

    const action = typeof req.body?.action === 'string' ? req.body.action.toLowerCase() : ''
    if (!['hit', 'stand', 'double'].includes(action)) {
      return res.status(400).json({ error: 'Action invalide' })
    }

    if (action === 'double') {
      if (session.player.length !== 2) {
        return res.status(400).json({ error: 'Double impossible', code: 'DOUBLE_NOT_ALLOWED' })
      }
      if (session.totalBet !== session.initialBet) {
        return res.status(400).json({ error: 'Double impossible', code: 'DOUBLE_NOT_ALLOWED' })
      }

      let result: {
        player: ReturnType<typeof publicCards>
        dealer: ReturnType<typeof publicCards>
        payout: number
        reason: string
        chips: number
        experience: number
        level: number
        xpToNext: number
        newBadges: string[]
        maxBetBlackjack: number
        totalBet: number
        loanPay?: Awaited<ReturnType<typeof applyRepaymentOnPositiveWin>>
      }
      try {
        result = await prisma.$transaction(async (tx) => {
          const user = await tx.user.findUnique({
            where: { id: userId },
            select: { chips: true },
          })
          if (!user) throw new Error('USER_NOT_FOUND')
          if (intChips(user.chips) < session.initialBet) {
            throw Object.assign(new Error('INSUFFICIENT_CHIPS'), { code: 'INSUFFICIENT_CHIPS' })
          }
          await tx.user.update({
            where: { id: userId },
            data: { chips: { decrement: session.initialBet } },
          })
          session.totalBet = session.initialBet * 2
          session.player.push(drawCard(session.shoe))
          const pv = handValue(session.player)
          if (pv.bust) {
            const fin = await finalizeHand(tx, userId, session.player, session.dealer, session.totalBet, bjCtx)
            const { loanPay, ...finRest } = fin
            return {
              player: publicCards(session.player),
              dealer: publicCards(session.dealer),
              ...finRest,
              totalBet: session.totalBet,
              loanPay,
            }
          }
          playDealerHand(session.dealer, session.shoe)
          const fin = await finalizeHand(tx, userId, session.player, session.dealer, session.totalBet, bjCtx)
          const { loanPay, ...finRest } = fin
          return {
            player: publicCards(session.player),
            dealer: publicCards(session.dealer),
            ...finRest,
            totalBet: session.totalBet,
            loanPay,
          }
        })
      } catch (err) {
        if ((err as { code?: string }).code === 'INSUFFICIENT_CHIPS') {
          return res.status(400).json({ error: 'Solde insuffisant pour doubler', code: 'INSUFFICIENT_CHIPS' })
        }
        throw err
      }
      const { loanPay, ...restDouble } = result
      clearSession(userId)
      emitLoanSocketsIfNeeded(req, loanPay)
      return res.json({ phase: 'complete', ...restDouble })
    }

    if (action === 'hit') {
      session.player.push(drawCard(session.shoe))
      const pv = handValue(session.player)
      if (pv.bust) {
        const result = await prisma.$transaction(async (tx) => {
          return finalizeHand(tx, userId, session.player, session.dealer, session.totalBet, bjCtx)
        })
        const { loanPay, ...r } = result
        clearSession(userId)
        emitLoanSocketsIfNeeded(req, loanPay)
        return res.json({
          phase: 'complete',
          player: publicCards(session.player),
          dealer: publicCards(session.dealer),
          ...r,
          totalBet: session.totalBet,
        })
      }
      setSession(userId, session)
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { chips: true, experience: true } })
      const lvl = levelFromExperience(u?.experience ?? 0)
      return res.json({
        phase: 'player',
        player: publicCards(session.player),
        dealerUp: publicCards([session.dealer[0]!]),
        dealerHole: true,
        canDouble: false,
        chips: intChips(u?.chips ?? 0),
        totalBet: session.totalBet,
        maxBetBlackjack: getEffectiveBlackjackMaxBet(lvl),
      })
    }

    // stand
    playDealerHand(session.dealer, session.shoe)
    const result = await prisma.$transaction(async (tx) => {
      return finalizeHand(tx, userId, session.player, session.dealer, session.totalBet, bjCtx)
    })
    const { loanPay, ...rStand } = result
    clearSession(userId)
    emitLoanSocketsIfNeeded(req, loanPay)

    return res.json({
      phase: 'complete',
      player: publicCards(session.player),
      dealer: publicCards(session.dealer),
      ...rStand,
      totalBet: session.totalBet,
    })
  } catch (e) {
    console.error('[blackjack/action]', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
