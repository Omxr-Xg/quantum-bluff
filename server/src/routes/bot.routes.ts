import express from 'express'
import { getHandValue, findWinner } from '../logic/Evaluator.js'
import type { Card, Player } from '../types/poker.js'

const router = express.Router()

type BotDifficulty = 'easy' | 'medium' | 'hard'
type BotAction = 'FOLD' | 'CALL' | 'CHECK' | 'RAISE'

interface BotActionRequest {
  playerCards: Card[]
  communityCards: Card[]
  difficulty: BotDifficulty
  currentBet: number
  playerChips: number
  callAmount: number
  minRaise: number
  potSize: number
  position: number
  playersCount: number
}

interface BotActionResponse {
  action: BotAction
  amount?: number
  reasoning?: string
}

const calculateHandStrength = (
  playerCards: Card[],
  communityCards: Card[]
): number => {
  const allCards = [...playerCards, ...communityCards]
  if (allCards.length < 5) return 0.5

  const handValue = getHandValue(allCards)
  const maxPossible = 8 * Math.pow(15, 5) + 14 * Math.pow(15, 4)
  return Math.min(handValue / maxPossible, 1)
}

const easyBotDecision = (req: BotActionRequest): BotActionResponse => {
  const rand = Math.random()

  if (req.callAmount === 0) {
    if (rand < 0.7) {
      return { action: 'CHECK', reasoning: 'easy: check' }
    }
    const raiseAmount = Math.min(
      req.playerChips,
      req.currentBet + req.minRaise + Math.floor(Math.random() * req.potSize * 0.3)
    )
    return { action: 'RAISE', amount: raiseAmount, reasoning: 'easy: raise' }
  }

  if (rand < 0.2) {
    return { action: 'FOLD', reasoning: 'easy: fold' }
  }
  if (rand < 0.65) {
    return {
      action: 'CALL',
      amount: req.callAmount,
      reasoning: 'easy: call'
    }
  }
  const raiseAmount = Math.min(
    req.playerChips,
    req.currentBet +
      req.minRaise +
      Math.floor(Math.random() * (req.potSize / 2))
  )
  return {
    action: 'RAISE',
    amount: raiseAmount,
    reasoning: 'easy: raise'
  }
}

const mediumBotDecision = (req: BotActionRequest): BotActionResponse => {
  const handStrength = calculateHandStrength(
    req.playerCards,
    req.communityCards
  )
  const communityCount = req.communityCards.length

  if (communityCount === 0) {
    if (req.callAmount === 0) {
      return { action: 'CHECK', reasoning: 'medium: check preflop' }
    }
    const hasPair =
      req.playerCards[0]?.value === req.playerCards[1]?.value
    const highCards = req.playerCards.filter((c) => c.value >= 10).length
    const playable = hasPair || highCards >= 1
    if (playable) {
      if (Math.random() < 0.2) {
        const raiseAmount = Math.min(
          req.playerChips,
          req.currentBet + req.minRaise + Math.floor(req.potSize * 0.3)
        )
        return { action: 'RAISE', amount: raiseAmount, reasoning: 'medium: raise preflop' }
      }
      return {
        action: 'CALL',
        amount: req.callAmount,
        reasoning: 'medium: call preflop'
      }
    }
    if (Math.random() < 0.55) {
      return {
        action: 'CALL',
        amount: req.callAmount,
        reasoning: 'medium: call preflop (wide)'
      }
    }
    return { action: 'FOLD', reasoning: 'medium: fold weak preflop' }
  }

  if (handStrength > 0.6) {
    if (req.callAmount === 0) {
      return { action: 'CHECK', reasoning: 'medium: strong hand' }
    }
    const raiseAmount = Math.min(
      req.playerChips,
      req.currentBet + req.minRaise * 3
    )
    return {
      action: 'RAISE',
      amount: raiseAmount,
      reasoning: 'medium: strong hand raise'
    }
  } else if (handStrength > 0.3) {
    if (req.callAmount === 0) {
      return { action: 'CHECK', reasoning: 'medium: medium hand check' }
    }
    if (req.callAmount < req.potSize * 0.3) {
      return {
        action: 'CALL',
        amount: req.callAmount,
        reasoning: 'medium: medium hand call'
      }
    } else {
      return { action: 'FOLD', reasoning: 'medium: medium hand fold to big bet' }
    }
  } else {
    return { action: 'FOLD', reasoning: 'medium: weak hand fold' }
  }
}

const hardBotDecision = (req: BotActionRequest): BotActionResponse => {
  const handStrength = calculateHandStrength(
    req.playerCards,
    req.communityCards
  )
  const communityCount = req.communityCards.length

  if (communityCount === 0) {
    if (req.callAmount === 0) {
      return { action: 'CHECK', reasoning: 'hard: check preflop' }
    }
    const r = Math.random()
    if (r < 0.6) {
      return {
        action: 'CALL',
        amount: req.callAmount,
        reasoning: 'hard: call preflop'
      }
    }
    if (r < 0.85) {
      const raiseAmount = Math.min(
        req.playerChips,
        req.currentBet + req.minRaise * 2
      )
      return { action: 'RAISE', amount: raiseAmount, reasoning: 'hard: raise preflop' }
    }
    return { action: 'FOLD', reasoning: 'hard: fold preflop' }
  }

  const potOdds = req.callAmount / (req.potSize + req.callAmount)

  let winProbability = handStrength
  const cardsToCome = 5 - req.communityCards.length
  winProbability += (1 - handStrength) * (cardsToCome * 0.05)

  if (winProbability > potOdds + 0.2) {
    if (req.callAmount === 0) {
      const raiseAmount = Math.min(
        req.playerChips,
        req.currentBet + req.minRaise * 4
      )
      return { action: 'RAISE', amount: raiseAmount, reasoning: 'hard: value raise' }
    }
    const raiseAmount = Math.min(
      req.playerChips,
      req.currentBet + req.minRaise * 3
    )
    return { action: 'RAISE', amount: raiseAmount, reasoning: 'hard: value raise' }
  } else if (winProbability > potOdds) {
    if (req.callAmount === 0) {
      return { action: 'CHECK', reasoning: 'hard: check with advantage' }
    }
    return {
      action: 'CALL',
      amount: req.callAmount,
      reasoning: 'hard: +EV call'
    }
  } else if (winProbability > potOdds - 0.1) {
    if (req.callAmount === 0) {
      return { action: 'CHECK', reasoning: 'hard: borderline check' }
    }
    if (Math.random() < 0.3) {
      const bluffAmount = Math.min(
        req.playerChips,
        req.currentBet + req.minRaise * 2
      )
      return { action: 'RAISE', amount: bluffAmount, reasoning: 'hard: bluff' }
    }
    return {
      action: 'CALL',
      amount: req.callAmount,
      reasoning: 'hard: borderline call'
    }
  } else {
    if (req.callAmount === 0) {
      return { action: 'CHECK', reasoning: 'hard: check with weak hand' }
    }
    return { action: 'FOLD', reasoning: 'hard: -EV fold' }
  }
}

const SUIT_MAP: Record<string, Card['suit']> = {
  hearts: 'HEARTS',
  diamonds: 'DIAMONDS',
  clubs: 'CLUBS',
  spades: 'SPADES',
  HEARTS: 'HEARTS',
  DIAMONDS: 'DIAMONDS',
  CLUBS: 'CLUBS',
  SPADES: 'SPADES'
}

const RANK_MAP: Record<string, Card['rank']> = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
  '7': '7', '8': '8', '9': '9', '10': '10',
  J: 'J', Q: 'Q', K: 'K', A: 'A',
  j: 'J', q: 'Q', k: 'K', a: 'A'
}

const RANK_VALUE: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  J: 11, Q: 12, K: 13, A: 14
}

function normalizeCard(c: { suit?: string; rank?: string; value?: string | number }): Card {
  const suitStr = (c.suit ?? '').toLowerCase()
  const suit = SUIT_MAP[suitStr] ?? 'HEARTS'
  const rank = c.rank ? RANK_MAP[String(c.rank)] ?? '2' : (RANK_MAP[String(c.value)] ?? '2')
  const value = typeof c.value === 'number' ? c.value : (RANK_VALUE[String(c.value ?? rank)] ?? 2)
  return { suit, rank, value }
}

router.post('/action', (req, res) => {
  try {
    const raw = req.body as BotActionRequest & { playerCards?: Array<{ suit?: string; rank?: string; value?: string | number }> }

    if (!raw.playerCards || !raw.difficulty) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const botRequest: BotActionRequest = {
      ...raw,
      playerCards: (raw.playerCards ?? []).map(normalizeCard),
      communityCards: (raw.communityCards ?? []).map(normalizeCard)
    }

    let decision: BotActionResponse

    switch (botRequest.difficulty) {
      case 'easy':
        decision = easyBotDecision(botRequest)
        break
      case 'medium':
        decision = mediumBotDecision(botRequest)
        break
      case 'hard':
        decision = hardBotDecision(botRequest)
        break
      default:
        return res.status(400).json({ error: 'Invalid difficulty' })
    }

    console.log(`🤖 Bot decision (${botRequest.difficulty}):`, decision)

    res.json(decision)
  } catch (error) {
    console.error('Erreur bot API:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/bot/evaluate-winner - Déterminer le gagnant au showdown (cartes normalisées)
router.post('/evaluate-winner', (req, res) => {
  try {
    const raw = req.body as {
      players?: Array<{ id: string; cards?: Array<{ suit?: string; rank?: string; value?: string | number }> }>
      communityCards?: Array<{ suit?: string; rank?: string; value?: string | number }>
    }
    if (!raw.players?.length || !raw.communityCards) {
      return res.status(400).json({ error: 'Body attendu: { players: [{ id, cards }], communityCards }' })
    }
    const players: Player[] = raw.players.map((p) => ({
      id: p.id,
      name: '',
      cards: (p.cards ?? []).map(normalizeCard),
      chips: 0,
      role: 'PLAYER',
      isActive: false,
    }))
    const board = (raw.communityCards ?? []).map(normalizeCard)
    const winnerId = findWinner(players, board)
    res.json({ winnerId })
  } catch (error) {
    console.error('Erreur evaluate-winner:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
