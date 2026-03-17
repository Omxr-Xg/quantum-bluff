import express from 'express'
import { getHandValue, findWinners, getHandInfo } from '../logic/Evaluator.js'
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

const isHeadsUp = (req: BotActionRequest) => req.playersCount === 2

const easyBotDecision = (req: BotActionRequest): BotActionResponse => {
  const rand = Math.random()
  const headsUp = isHeadsUp(req)

  if (req.callAmount === 0) {
    if (rand < 0.6) {
      return { action: 'CHECK', reasoning: 'easy: check' }
    }
    const raiseAmount = Math.min(
      req.playerChips,
      req.currentBet + req.minRaise + Math.floor(Math.random() * req.potSize * 0.3)
    )
    return { action: 'RAISE', amount: raiseAmount, reasoning: 'easy: raise' }
  }

  const foldChance = headsUp ? 0.08 : 0.2
  if (rand < foldChance) {
    return { action: 'FOLD', reasoning: 'easy: fold' }
  }
  if (rand < foldChance + 0.6) {
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
  const headsUp = isHeadsUp(req)

  if (communityCount === 0) {
    if (req.callAmount === 0) {
      if (headsUp && Math.random() < 0.15) {
        const raiseAmount = Math.min(
          req.playerChips,
          req.currentBet + req.minRaise * 2
        )
        return { action: 'RAISE', amount: raiseAmount, reasoning: 'medium: bluff preflop' }
      }
      return { action: 'CHECK', reasoning: 'medium: check preflop' }
    }
    const hasPair =
      req.playerCards[0]?.value === req.playerCards[1]?.value
    const highCards = req.playerCards.filter((c) => c.value >= 10).length
    const anyEightPlus = req.playerCards.some((c) => c.value >= 8)
    const playable = hasPair || highCards >= 1 || (headsUp && anyEightPlus)
    if (playable) {
      if (Math.random() < 0.25) {
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
    const callChance = headsUp ? 0.8 : 0.55
    if (Math.random() < callChance) {
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
    }
    if (headsUp && Math.random() < 0.2) {
      return {
        action: 'CALL',
        amount: req.callAmount,
        reasoning: 'medium: call to bluff later'
      }
    }
    return { action: 'FOLD', reasoning: 'medium: medium hand fold to big bet' }
  } else {
    if (req.callAmount === 0) {
      if (headsUp && Math.random() < 0.12) {
        const bluffAmount = Math.min(
          req.playerChips,
          req.currentBet + req.minRaise
        )
        return { action: 'RAISE', amount: bluffAmount, reasoning: 'medium: bluff' }
      }
      return { action: 'CHECK', reasoning: 'medium: weak hand check' }
    }
    if (headsUp && Math.random() < 0.35) {
      return {
        action: 'CALL',
        amount: req.callAmount,
        reasoning: 'medium: call with weak (bluff potential)'
      }
    }
    return { action: 'FOLD', reasoning: 'medium: weak hand fold' }
  }
}

const hardBotDecision = (req: BotActionRequest): BotActionResponse => {
  const handStrength = calculateHandStrength(
    req.playerCards,
    req.communityCards
  )
  const communityCount = req.communityCards.length
  const headsUp = isHeadsUp(req)

  if (communityCount === 0) {
    if (req.callAmount === 0) {
      if (headsUp && Math.random() < 0.2) {
        const raiseAmount = Math.min(
          req.playerChips,
          req.currentBet + req.minRaise * 2
        )
        return { action: 'RAISE', amount: raiseAmount, reasoning: 'hard: steal preflop' }
      }
      return { action: 'CHECK', reasoning: 'hard: check preflop' }
    }
    const r = Math.random()
    const callChance = headsUp ? 0.75 : 0.6
    const foldChance = headsUp ? 0.05 : 0.15
    if (r < callChance) {
      return {
        action: 'CALL',
        amount: req.callAmount,
        reasoning: 'hard: call preflop'
      }
    }
    if (r < callChance + (1 - callChance - foldChance)) {
      const raiseAmount = Math.min(
        req.playerChips,
        req.currentBet + req.minRaise * 2
      )
      return { action: 'RAISE', amount: raiseAmount, reasoning: 'hard: raise preflop' }
    }
    return { action: 'FOLD', reasoning: 'hard: fold preflop' }
  }

  const potOdds = req.callAmount / Math.max(req.potSize + req.callAmount, 1)

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
      if (Math.random() < 0.25) {
        const bluffAmount = Math.min(
          req.playerChips,
          req.currentBet + req.minRaise * 2
        )
        return { action: 'RAISE', amount: bluffAmount, reasoning: 'hard: bluff' }
      }
      return { action: 'CHECK', reasoning: 'hard: borderline check' }
    }
    if (Math.random() < 0.45) {
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
      if (headsUp && Math.random() < 0.18) {
        const bluffAmount = Math.min(
          req.playerChips,
          req.currentBet + req.minRaise
        )
        return { action: 'RAISE', amount: bluffAmount, reasoning: 'hard: bluff weak' }
      }
      return { action: 'CHECK', reasoning: 'hard: check with weak hand' }
    }
    if (headsUp && Math.random() < 0.2) {
      return {
        action: 'CALL',
        amount: req.callAmount,
        reasoning: 'hard: bluff call'
      }
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

const NUM_TO_RANK: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A'
}

function normalizeCard(c: { suit?: string; rank?: string; value?: string | number }): Card {
  const suitStr = (c.suit ?? '').toLowerCase()
  const suit = SUIT_MAP[suitStr] ?? 'HEARTS'
  let rank: Card['rank']
  let value: number
  if (c.rank && RANK_MAP[String(c.rank)]) {
    rank = RANK_MAP[String(c.rank)]
    value = typeof c.value === 'number' ? c.value : (RANK_VALUE[rank] ?? 2)
  } else if (typeof c.value === 'number') {
    rank = (RANK_MAP[NUM_TO_RANK[c.value] ?? ''] ?? '2') as Card['rank']
    value = c.value
  } else {
    rank = (RANK_MAP[String(c.value)] ?? '2') as Card['rank']
    value = RANK_VALUE[rank] ?? 2
  }
  return { suit, rank, value }
}

router.post('/action', (req, res) => {
  const startBotTime = Date.now()
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

    const duration = Date.now() - startBotTime
    console.log(`[Monitoring QoS] 🤖 Décision bot (${botRequest.difficulty}) calculée en ${duration}ms (Obj: <500ms)`)
    
    if (duration > 500) {
      console.warn(`[Alerte Réseau] ⚠️ Le bot a dépassé la limite de latence (${duration}ms)`)
    }

    res.json(decision)
  } catch (error) {
    console.error('Erreur bot API:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/bot/evaluate-winner - Déterminer le gagnant au showdown (cartes normalisées) + combinaison
router.post('/evaluate-winner', (req, res) => {
  try {
    const raw = req.body as {
      players?: Array<{
        id: string
        name?: string
        cards?: Array<{ suit?: string; rank?: string; value?: string | number }>
      }>
      communityCards?: Array<{ suit?: string; rank?: string; value?: string | number }>
    }
    if (!raw.players?.length || !raw.communityCards) {
      return res.status(400).json({ error: 'Body attendu: { players: [{ id, cards, name? }], communityCards }' })
    }
    const players: Player[] = raw.players.map((p) => ({
      id: p.id,
      name: p.name ?? '',
      cards: (p.cards ?? []).map(normalizeCard),
      chips: 0,
      role: 'PLAYER',
      isActive: false,
    }))
    const board = (raw.communityCards ?? []).map(normalizeCard)
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
