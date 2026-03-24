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

const router = express.Router()

function publicCards(cards: Card[]) {
  return cards.map(cardToPublic)
}

async function finalizeHand(
  tx: Prisma.TransactionClient,
  userId: string,
  player: Card[],
  dealer: Card[],
  totalBet: number
): Promise<{
  payout: number
  reason: string
  chips: number
  experience: number
  level: number
  xpToNext: number
  newBadges: string[]
  maxBetBlackjack: number
}> {
  const { payout, reason } = settleRound(player, dealer, totalBet)

  const updated = await tx.user.update({
    where: { id: userId },
    data: { chips: { increment: payout } },
    select: { chips: true, experience: true },
  })

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
  }
}

/** POST /start — nouvelle main (débite la mise). */
router.post('/start', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    if (getSession(userId)) {
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

      await tx.user.update({
        where: { id: userId },
        data: { chips: { decrement: bet } },
      })

      const shoe = createShoe()
      shuffleShoe(shoe)
      const player: Card[] = [drawCard(shoe), drawCard(shoe)]
      const dealer: Card[] = [drawCard(shoe), drawCard(shoe)]

      if (isNaturalBlackjack(player)) {
        const fin = await finalizeHand(tx, userId, player, dealer, bet)
        return {
          type: 'complete' as const,
          player: publicCards(player),
          dealer: publicCards(dealer),
          ...fin,
          totalBet: bet,
          maxBetBlackjack: fin.maxBetBlackjack,
        }
      }

      return {
        type: 'player_turn' as const,
        bet,
        shoe,
        player,
        dealer,
        maxBetEffective,
      }
    })

    if (outcome.type === 'complete') {
      const { type: _t, ...rest } = outcome
      return res.json(rest)
    }

    const { shoe, player, dealer, bet, maxBetEffective } = outcome
    setSession(userId, {
      shoe,
      player,
      dealer,
      initialBet: bet,
      totalBet: bet,
      updatedAt: Date.now(),
    })

    const uAfter = await prisma.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })
    const chipsAfter = intChips(uAfter?.chips ?? 0)

    return res.json({
      phase: 'player',
      player: publicCards(player),
      dealerUp: publicCards([dealer[0]!]),
      dealerHole: true,
      canDouble: chipsAfter >= bet,
      chips: chipsAfter,
      totalBet: bet,
      maxBetBlackjack: maxBetEffective,
    })
  } catch (e) {
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
            const fin = await finalizeHand(tx, userId, session.player, session.dealer, session.totalBet)
            return {
              player: publicCards(session.player),
              dealer: publicCards(session.dealer),
              ...fin,
              totalBet: session.totalBet,
            }
          }
          playDealerHand(session.dealer, session.shoe)
          const fin = await finalizeHand(tx, userId, session.player, session.dealer, session.totalBet)
          return {
            player: publicCards(session.player),
            dealer: publicCards(session.dealer),
            ...fin,
            totalBet: session.totalBet,
          }
        })
      } catch (err) {
        if ((err as { code?: string }).code === 'INSUFFICIENT_CHIPS') {
          return res.status(400).json({ error: 'Solde insuffisant pour doubler', code: 'INSUFFICIENT_CHIPS' })
        }
        throw err
      }
      clearSession(userId)
      return res.json({ phase: 'complete', ...result })
    }

    if (action === 'hit') {
      session.player.push(drawCard(session.shoe))
      const pv = handValue(session.player)
      if (pv.bust) {
        const result = await prisma.$transaction(async (tx) => {
          return finalizeHand(tx, userId, session.player, session.dealer, session.totalBet)
        })
        clearSession(userId)
        return res.json({
          phase: 'complete',
          player: publicCards(session.player),
          dealer: publicCards(session.dealer),
          ...result,
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
      return finalizeHand(tx, userId, session.player, session.dealer, session.totalBet)
    })
    clearSession(userId)

    return res.json({
      phase: 'complete',
      player: publicCards(session.player),
      dealer: publicCards(session.dealer),
      ...result,
      totalBet: session.totalBet,
    })
  } catch (e) {
    console.error('[blackjack/action]', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
