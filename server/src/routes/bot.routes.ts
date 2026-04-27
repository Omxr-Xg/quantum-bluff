import express from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { findWinners, getHandInfo } from '../logic/Evaluator.js'
import type { Card, Player } from '../types/poker.js'
import {
  decideBotAction,
  type BotActionRequest,
  type BotDifficulty,
} from '../logic/botAI.js'
import { sanitizeBotDecision } from '../logic/botDecisionSanitize.js'
import { logSuspiciousAction } from '../utils/securityLogger.js'

const router = express.Router()

const botActionLimiter = rateLimit({
  windowMs: 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logSuspiciousAction('TOO_MANY_ACTIONS', {
      details: {
        route: '/api/bot/action',
        ip: req.ip,
        timestamp: new Date().toISOString()
      }
    })

    return res.status(429).json({
      error: 'Trop de requêtes bot. Maximum 10 par seconde.'
    })
  }
})

const cardSchema = z.object({
  suit: z.string().optional(),
  rank: z.string().optional(),
  value: z.union([z.string(), z.number()]).optional()
})

const botActionBodySchema = z.object({
  playerCards: z.array(cardSchema).min(2),
  communityCards: z.array(cardSchema).optional().default([]),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
  currentBet: z.number().int().min(0),
  playerChips: z.number().int().min(0),
  callAmount: z.number().int().min(0),
  minRaise: z.number().int().min(1),
  potSize: z.number().int().min(0),
  position: z.number().int().min(0),
  playersCount: z.number().int().min(2)
})

const evaluateWinnerBodySchema = z.object({
  players: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().optional(),
      cards: z.array(cardSchema).optional().default([])
    })
  ).min(1),
  communityCards: z.array(cardSchema)
})

const SUIT_MAP: Record<string, Card['suit']> = {
  hearts: 'HEARTS',
  diamonds: 'DIAMONDS',
  clubs: 'CLUBS',
  spades: 'SPADES',
  HEARTS: 'HEARTS',
  DIAMONDS: 'DIAMONDS',
  CLUBS: 'CLUBS',
  SPADES: 'SPADES',
}

const RANK_MAP: Record<string, Card['rank']> = {
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  J: 'J',
  Q: 'Q',
  K: 'K',
  A: 'A',
  j: 'J',
  q: 'Q',
  k: 'K',
  a: 'A',
}

const RANK_VALUE: Record<string, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
}

const NUM_TO_RANK: Record<number, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
}

function normalizeCard(c: { suit?: string; rank?: string; value?: string | number }): Card {
  const suitStr = (c.suit ?? '').toLowerCase()
  const suit = SUIT_MAP[suitStr] ?? 'HEARTS'

  let rank: Card['rank']
  let value: number

  if (c.rank && RANK_MAP[String(c.rank)]) {
    rank = RANK_MAP[String(c.rank)]
    value = typeof c.value === 'number' ? c.value : RANK_VALUE[rank] ?? 2
  } else if (typeof c.value === 'number') {
    rank = (RANK_MAP[NUM_TO_RANK[c.value] ?? ''] ?? '2') as Card['rank']
    value = c.value
  } else {
    rank = (RANK_MAP[String(c.value)] ?? '2') as Card['rank']
    value = RANK_VALUE[rank] ?? 2
  }

  return { suit, rank, value }
}

router.post('/action', botActionLimiter, (req, res) => {
  const startBotTime = Date.now()

  try {
    const parsed = botActionBodySchema.safeParse(req.body)

    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues.map(issue => issue.message).join(', ')
      })
    }

    const raw = parsed.data

    const botRequest: BotActionRequest = {
      ...raw,
      difficulty: raw.difficulty as BotDifficulty,
      playerCards: raw.playerCards.map(normalizeCard),
      communityCards: raw.communityCards.map(normalizeCard),
    }

    const rawDecision = decideBotAction(botRequest)
    const decision = sanitizeBotDecision(rawDecision, botRequest)

    const duration = Date.now() - startBotTime
    console.log('[Monitoring QoS] 🤖 Décision bot calculée', {
      difficulty: botRequest.difficulty,
      durationMs: duration,
      target: '<500ms',
    })

    if (duration > 500) {
      console.warn(`[Alerte Réseau] ⚠️ Le bot a dépassé la limite de latence (${duration}ms)`)
    }

    res.json(decision)
  } catch (error) {
    console.error('Erreur bot API:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/evaluate-winner', (req, res) => {
  try {
    const parsed = evaluateWinnerBodySchema.safeParse(req.body)

    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues.map(issue => issue.message).join(', ')
      })
    }

    const raw = parsed.data

    const players: Player[] = raw.players.map((p) => ({
      id: p.id,
      name: p.name ?? '',
      cards: (p.cards ?? []).map(normalizeCard),
      chips: 0,
      role: 'PLAYER',
      isActive: false,
    }))

    const board = raw.communityCards.map(normalizeCard)
    const winnerIds = findWinners(players, board)
    const isSplit = winnerIds.length > 1
    const winnerId = winnerIds[0]
    const firstWinner = players.find((p) => p.id === winnerId)

    const handInfo = firstWinner
      ? getHandInfo([...firstWinner.cards, ...board])
      : { category: 0, handName: 'Haute carte' }

    res.json({
      winnerId,
      winnerName: firstWinner?.name ?? winnerId,
      winnerIds,
      isSplit,
      handName: handInfo.handName,
      handRank: handInfo.category,
    })
  } catch (error) {
    console.error('Erreur evaluate-winner:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router