/**
 * IA des bots Texas Hold'em — 4 difficultés distinctes (easy / medium / hard / expert).
 * Utilise getHandValue pour une force de main cohérente sur toutes les streets.
 */
import { getHandValue } from './Evaluator.js'
import type { Card } from '../types/poker.js'
import { intChips } from '../utils/chips.js'

export type BotDifficulty = 'easy' | 'medium' | 'hard' | 'expert'
export type BotAction = 'FOLD' | 'CALL' | 'CHECK' | 'RAISE'

export interface BotActionRequest {
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

export interface BotActionResponse {
  action: BotAction
  amount?: number
  reasoning?: string
  /** Présent quand l’IA expert Python renvoie un style (value / bluff / …). */
  style?: string
}

/** Score max théorique (Evaluator — quinte flush royale, catégorie 9). */
const MAX_HAND_SCORE = 9 * Math.pow(15, 5) + 14 * Math.pow(15, 4)

/** Fold face à une mise uniquement si P(perdre) ≥ 80 % (P(gagner) < 20 %). */
export const EXPERT_FOLD_MAX_WIN_PROB = 0.2

const ALL_SUITS: Card['suit'][] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES']
const ALL_RANKS: Card['rank'][] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
const RANK_VALUES: Record<Card['rank'], number> = {
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

const FULL_DECK: Card[] = ALL_SUITS.flatMap((suit) =>
  ALL_RANKS.map((rank) => ({ suit, rank, value: RANK_VALUES[rank] })),
)

function cardIdentity(c: Card): string {
  return `${c.suit}:${c.rank}`
}

function remainingDeck(known: Card[]): Card[] {
  const knownSet = new Set(known.map(cardIdentity))
  return FULL_DECK.filter((c) => !knownSet.has(cardIdentity(c)))
}

function combinationsOfSize<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]]
  if (size > items.length) return []
  const result: T[][] = []
  const combo: T[] = []
  const recurse = (start: number) => {
    if (combo.length === size) {
      result.push([...combo])
      return
    }
    for (let i = start; i <= items.length - (size - combo.length); i++) {
      combo.push(items[i]!)
      recurse(i + 1)
      combo.pop()
    }
  }
  recurse(0)
  return result
}

function sampleRunoutCards(deck: Card[], needed: number): Card[] {
  const pool = [...deck]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = pool[i]!
    pool[i] = pool[j]!
    pool[j] = tmp
  }
  return pool.slice(0, needed)
}

/**
 * Équité showdown multiway (0–1) avec trous adverses connus.
 * Énumération exacte si ≤2 cartes à venir, sinon Monte Carlo (preflop).
 */
export function heroShowdownEquity(
  heroCards: Card[],
  opponentHoles: Card[][],
  board: Card[],
): number {
  if (heroCards.length < 2 || opponentHoles.length === 0) {
    return normalizedHandStrength(heroCards, board)
  }

  const known = [...heroCards, ...board, ...opponentHoles.flat().slice(0, opponentHoles.length * 2)]
  const deck = remainingDeck(known)
  const needed = Math.max(0, 5 - board.length)
  const hands = [heroCards, ...opponentHoles.map((h) => h.slice(0, 2))]

  let wins = 0
  let tieShare = 0
  let total = 0

  const scoreRunout = (completeBoard: Card[]) => {
    const scores = hands.map((h) => getHandValue([...h, ...completeBoard]))
    const heroScore = scores[0]!
    const maxScore = Math.max(...scores)
    total++
    if (heroScore < maxScore) return
    const winners = scores.filter((s) => s === maxScore).length
    if (winners === 1) wins++
    else tieShare += 1 / winners
  }

  if (needed === 0) {
    scoreRunout(board)
    return total > 0 ? wins + tieShare : normalizedHandStrength(heroCards, board)
  }

  const combos = combinationsOfSize(deck, needed)
  const useMonteCarlo = needed >= 3 && combos.length > 4000
  if (useMonteCarlo) {
    const samples = 2800
    for (let i = 0; i < samples; i++) {
      scoreRunout([...board, ...sampleRunoutCards(deck, needed)])
    }
  } else {
    for (const extra of combos) {
      scoreRunout([...board, ...extra])
    }
  }

  return total > 0 ? (wins + tieShare) / total : normalizedHandStrength(heroCards, board)
}

/**
 * Force 0–1 à partir des cartes visibles (2–7 cartes).
 * Corrige l’ancien bug qui renvoyait 0.5 dès que < 5 cartes au total.
 */
export function normalizedHandStrength(playerCards: Card[], communityCards: Card[]): number {
  const all = [...playerCards, ...communityCards]
  if (all.length === 0) return 0.35
  const hv = getHandValue(all)
  return Math.min(Math.max(hv / MAX_HAND_SCORE, 0), 1)
}

const isHeadsUp = (req: BotActionRequest) => req.playersCount === 2

function minRaiseAmount(req: BotActionRequest, mult: number): number {
  return intChips(Math.min(req.playerChips, req.currentBet + req.minRaise * mult))
}

function randomRaisePot(req: BotActionRequest, potFraction: number): number {
  const extra = intChips(req.potSize * potFraction * Math.random())
  return intChips(Math.min(req.playerChips, req.currentBet + req.minRaise + extra))
}

// ---------------------------------------------------------------------------
// EASY — joueur loose / call station : beaucoup d’aléatoire, peu de lecture du pot.
// Quelques bluffs “naïfs” quand on peut checker.
// ---------------------------------------------------------------------------

export function easyBotDecision(req: BotActionRequest): BotActionResponse {
  const headsUp = isHeadsUp(req)
  const strength = normalizedHandStrength(req.playerCards, req.communityCards)
  const rand = Math.random()

  if (req.callAmount === 0) {
    // Bluff naïf ~14 %, sinon check biaisé par la force
    if (rand < 0.14) {
      return {
        action: 'RAISE',
        amount: randomRaisePot(req, 0.15 + Math.random() * 0.2),
        reasoning: 'easy: bluff donk',
      }
    }
    if (rand < 0.14 + 0.55 + strength * 0.15) {
      return { action: 'CHECK', reasoning: 'easy: check' }
    }
    return {
      action: 'RAISE',
      amount: randomRaisePot(req, 0.25 + Math.random() * 0.35),
      reasoning: 'easy: raise loose',
    }
  }

  const betRatio = req.callAmount / Math.max(req.potSize, 1)
  // Grosse mise + main faible → fold plus souvent (mais erreurs fréquentes)
  let foldBias = 0.12
  if (strength < 0.25 && betRatio > 0.35) foldBias = 0.35
  if (strength > 0.55) foldBias = 0.04

  const foldChance = headsUp ? 0.06 + foldBias : 0.18 + foldBias * 0.8
  if (rand < foldChance) {
    return { action: 'FOLD', reasoning: 'easy: fold' }
  }
  if (rand < foldChance + 0.52) {
    return { action: 'CALL', amount: intChips(req.callAmount), reasoning: 'easy: call station' }
  }
  return {
    action: 'RAISE',
    amount: randomRaisePot(req, 0.3 + Math.random() * 0.4),
    reasoning: 'easy: raise random',
  }
}

// ---------------------------------------------------------------------------
// MEDIUM — heuristiques + force de main ; bluffs et semi-bluffs modérés.
// ---------------------------------------------------------------------------

export function mediumBotDecision(req: BotActionRequest): BotActionResponse {
  const strength = normalizedHandStrength(req.playerCards, req.communityCards)
  const communityCount = req.communityCards.length
  const headsUp = isHeadsUp(req)

  if (communityCount === 0) {
    if (req.callAmount === 0) {
      if (headsUp && Math.random() < 0.18) {
        return {
          action: 'RAISE',
          amount: minRaiseAmount(req, 2 + Math.random()),
          reasoning: 'medium: steal preflop',
        }
      }
      return { action: 'CHECK', reasoning: 'medium: check preflop' }
    }
    const hasPair = req.playerCards[0]?.value === req.playerCards[1]?.value
    const highCards = req.playerCards.filter((c) => c.value >= 10).length
    const anyEightPlus = req.playerCards.some((c) => c.value >= 8)
    const playable = hasPair || highCards >= 1 || (headsUp && anyEightPlus)
    if (playable) {
      if (Math.random() < 0.28) {
        return {
          action: 'RAISE',
          amount: intChips(
            Math.min(
              req.playerChips,
              req.currentBet + req.minRaise * 2 + intChips(req.potSize * 0.25)
            )
          ),
          reasoning: 'medium: 3bet light',
        }
      }
      return { action: 'CALL', amount: intChips(req.callAmount), reasoning: 'medium: call preflop' }
    }
    const callChance = headsUp ? 0.72 : 0.5
    if (Math.random() < callChance) {
      return { action: 'CALL', amount: intChips(req.callAmount), reasoning: 'medium: defend wide' }
    }
    return { action: 'FOLD', reasoning: 'medium: fold trash' }
  }

  const bluffRoll = Math.random()
  const canBluffCheck = req.callAmount === 0 && bluffRoll < (headsUp ? 0.14 : 0.09)

  if (strength > 0.62) {
    if (req.callAmount === 0) {
      if (bluffRoll < 0.08) {
        return {
          action: 'RAISE',
          amount: minRaiseAmount(req, 2.5),
          reasoning: 'medium: thin value raise',
        }
      }
      return { action: 'CHECK', reasoning: 'medium: slowplay' }
    }
    return {
      action: 'RAISE',
      amount: minRaiseAmount(req, 3),
      reasoning: 'medium: value raise',
    }
  }

  if (strength > 0.32) {
    if (req.callAmount === 0) {
      if (canBluffCheck) {
        return {
          action: 'RAISE',
          amount: minRaiseAmount(req, 2),
          reasoning: 'medium: bluff (scare card)',
        }
      }
      return { action: 'CHECK', reasoning: 'medium: check medium' }
    }
    if (req.callAmount < req.potSize * 0.35) {
      return { action: 'CALL', amount: intChips(req.callAmount), reasoning: 'medium: call reasonable' }
    }
    if (headsUp && Math.random() < 0.22) {
      return { action: 'CALL', amount: intChips(req.callAmount), reasoning: 'medium: float' }
    }
    return { action: 'FOLD', reasoning: 'medium: fold to pressure' }
  }

  if (req.callAmount === 0) {
    if (canBluffCheck || (!headsUp && bluffRoll < 0.06)) {
      return {
        action: 'RAISE',
        amount: minRaiseAmount(req, 1.5 + Math.random()),
        reasoning: 'medium: bluff',
      }
    }
    return { action: 'CHECK', reasoning: 'medium: check weak' }
  }
  if (headsUp && Math.random() < 0.38) {
    return { action: 'CALL', amount: intChips(req.callAmount), reasoning: 'medium: bluffcatch HU' }
  }
  if (Math.random() < 0.12) {
    return {
      action: 'RAISE',
      amount: minRaiseAmount(req, 2),
      reasoning: 'medium: bluff raise',
    }
  }
  return { action: 'FOLD', reasoning: 'medium: fold air' }
}

// ---------------------------------------------------------------------------
// HARD — pot odds + équité estimée ; bluffs fréquents en HU sur les spots marginaux.
// ---------------------------------------------------------------------------

export function hardBotDecision(req: BotActionRequest): BotActionResponse {
  return advancedPotOddsDecision(req, {
    name: 'hard',
    preflopSteal: 0.22,
    borderlineBluff: 0.42,
    weakBluffCheck: 0.2,
    potOddsTighten: 0.1,
    valueRaiseMult: 3,
    maxValueRaiseMult: 4,
  })
}

// ---------------------------------------------------------------------------
// EXPERT — plus agressif value, bluffs mieux calibrés, calls plus larges en HU.
// ---------------------------------------------------------------------------

export function expertBotDecision(req: BotActionRequest): BotActionResponse {
  return advancedPotOddsDecision(req, {
    name: 'expert',
    preflopSteal: 0.28,
    borderlineBluff: 0.46,
    weakBluffCheck: 0.22,
    potOddsTighten: 0.048,
    valueRaiseMult: 3.85,
    maxValueRaiseMult: 4.85,
  })
}

interface AdvancedProfile {
  name: string
  preflopSteal: number
  /** probabilité de bluff sur zone -EV légère */
  borderlineBluff: number
  weakBluffCheck: number
  /** marge vs pot odds pour fold (plus petit = call plus large) */
  potOddsTighten: number
  valueRaiseMult: number
  maxValueRaiseMult: number
}

function advancedPotOddsDecision(req: BotActionRequest, p: AdvancedProfile): BotActionResponse {
  const strength = normalizedHandStrength(req.playerCards, req.communityCards)
  const communityCount = req.communityCards.length
  const headsUp = isHeadsUp(req)

  if (communityCount === 0) {
    if (req.callAmount === 0) {
      if (headsUp && Math.random() < p.preflopSteal) {
        return {
          action: 'RAISE',
          amount: minRaiseAmount(req, 2 + Math.random() * 0.5),
          reasoning: `${p.name}: steal`,
        }
      }
      return { action: 'CHECK', reasoning: `${p.name}: check preflop` }
    }
    const r = Math.random()
    const callChance = headsUp ? 0.78 : 0.58
    const foldChance = headsUp ? 0.04 : 0.14
    if (r < callChance) {
      return { action: 'CALL', amount: intChips(req.callAmount), reasoning: `${p.name}: call preflop` }
    }
    if (r < callChance + (1 - callChance - foldChance)) {
      return {
        action: 'RAISE',
        amount: minRaiseAmount(req, 2.2),
        reasoning: `${p.name}: 3bet`,
      }
    }
    return { action: 'FOLD', reasoning: `${p.name}: fold preflop` }
  }

  const potOdds = req.callAmount / Math.max(req.potSize + req.callAmount, 1)
  let winProbability = strength
  const cardsToCome = 5 - req.communityCards.length
  /* Légère surestimation des tirages — évite un fold mécanique trop « robot ». */
  winProbability += (1 - strength) * (cardsToCome * 0.068)

  const margin = p.potOddsTighten

  if (winProbability > potOdds + 0.18) {
    if (req.callAmount === 0) {
      return {
        action: 'RAISE',
        amount: minRaiseAmount(req, p.maxValueRaiseMult),
        reasoning: `${p.name}: value raise big`,
      }
    }
    return {
      action: 'RAISE',
      amount: minRaiseAmount(req, p.valueRaiseMult),
      reasoning: `${p.name}: value raise`,
    }
  }

  if (winProbability > potOdds + margin) {
    if (req.callAmount === 0) {
      return { action: 'CHECK', reasoning: `${p.name}: check SDV` }
    }
    return { action: 'CALL', amount: intChips(req.callAmount), reasoning: `${p.name}: +EV call` }
  }

  if (winProbability > potOdds - margin) {
    const bluffChance = p.borderlineBluff + (headsUp ? 0.08 : 0)
    if (req.callAmount === 0) {
      if (Math.random() < bluffChance * 0.55) {
        return {
          action: 'RAISE',
          amount: minRaiseAmount(req, 2.2),
          reasoning: `${p.name}: bluff`,
        }
      }
      return { action: 'CHECK', reasoning: `${p.name}: check marginal` }
    }
    if (Math.random() < bluffChance) {
      return {
        action: 'RAISE',
        amount: minRaiseAmount(req, 2.4),
        reasoning: `${p.name}: bluff raise`,
      }
    }
    return { action: 'CALL', amount: intChips(req.callAmount), reasoning: `${p.name}: call marginal` }
  }

  if (req.callAmount === 0) {
    if (Math.random() < p.weakBluffCheck * (headsUp ? 1.2 : 0.75)) {
      return {
        action: 'RAISE',
        amount: minRaiseAmount(req, 1.8),
        reasoning: `${p.name}: bluff weak`,
      }
    }
    return { action: 'CHECK', reasoning: `${p.name}: check weak` }
  }
  /* Expert : ne pas être plus « discipline » que hard ici — sinon fold trop visible en spots marginaux. */
  const heroRate = p.name === 'expert' ? 0.44 : 0.4
  if (headsUp && Math.random() < heroRate) {
    if (req.playerChips >= req.callAmount) {
      return { action: 'CALL', amount: intChips(req.callAmount), reasoning: `${p.name}: hero call` }
    }
    if (req.playerChips > 0) {
      return { action: 'CALL', amount: intChips(req.playerChips), reasoning: `${p.name}: hero all-in` }
    }
  }
  if (
    !headsUp &&
    Math.random() < 0.1 &&
    req.callAmount > 0 &&
    req.callAmount <= req.potSize * 0.4 &&
    strength > 0.15
  ) {
    if (req.playerChips >= req.callAmount) {
      return { action: 'CALL', amount: intChips(req.callAmount), reasoning: `${p.name}: peel multiway` }
    }
    if (req.playerChips > 0) {
      return { action: 'CALL', amount: intChips(req.playerChips), reasoning: `${p.name}: peel short` }
    }
  }
  if (
    Math.random() < 0.1 &&
    req.callAmount > 0 &&
    req.callAmount <= req.potSize * 0.48 &&
    strength > 0.11
  ) {
    if (req.playerChips >= req.callAmount) {
      return { action: 'CALL', amount: intChips(req.callAmount), reasoning: `${p.name}: stubborn call` }
    }
    if (req.playerChips > 0) {
      return { action: 'CALL', amount: intChips(req.playerChips), reasoning: `${p.name}: stubborn short` }
    }
  }
  if (req.callAmount > 0 && winProbability >= EXPERT_FOLD_MAX_WIN_PROB) {
    if (req.playerChips >= req.callAmount) {
      return {
        action: 'CALL',
        amount: intChips(req.callAmount),
        reasoning: `${p.name}: call (win≈${(winProbability * 100).toFixed(0)}%)`,
      }
    }
    if (req.playerChips > 0) {
      return {
        action: 'CALL',
        amount: intChips(req.playerChips),
        reasoning: `${p.name}: call short (win≈${(winProbability * 100).toFixed(0)}%)`,
      }
    }
  }
  if (req.callAmount > 0) {
    return {
      action: 'FOLD',
      reasoning: `${p.name}: fold (win<${(EXPERT_FOLD_MAX_WIN_PROB * 100).toFixed(0)}%)`,
    }
  }
  return { action: 'CHECK', reasoning: `${p.name}: check` }
}

/** Profil comportemental humain injecté par practice-bot expert. */
export type ExpertPlayerTendency = {
  vpip: number
  pfr: number
  bluffRaiseRate: number
  foldToRaiseRate: number
  styleTag: string
  confidence: 'LOW' | 'MEDIUM' | 'HIGH'
  styleScores?: { aggressive: number; tight: number; callingStation: number }
  positionRates?: { vpip: number; pfr: number; foldToRaiseRate: number } | null
  recentTendency?: { consecutiveBluffHands: number; consecutiveFoldStreak: number }
}

/** Contexte « voyant » : trous adverses connus (mode expert sans ou en secours du service Python). */
export type ExpertOracleContext = {
  opponentHoleCards?: Card[][]
  opponentStack?: number
  playerTendency?: ExpertPlayerTendency
  /** Équité vs range estimée (Phase 3) — remplace oracle trous si présente. */
  rangeWinProb?: number
}

export function tendencyAdjustmentIntensity(
  profile: ExpertPlayerTendency,
): number {
  if (profile.confidence === 'HIGH') return 1
  if (profile.confidence === 'MEDIUM') return 0.5
  return 0
}

function normalizeStyleWeights(
  profile: ExpertPlayerTendency,
): { aggressive: number; tight: number; callingStation: number } | null {
  const s = profile.styleScores
  if (!s || profile.confidence === 'LOW') return null
  const sum = s.aggressive + s.tight + s.callingStation
  if (sum <= 0) return null
  return {
    aggressive: s.aggressive / sum,
    tight: s.tight / sum,
    callingStation: s.callingStation / sum,
  }
}

function foldThresholdForArchetype(
  archetype: 'aggressive' | 'tight' | 'callingStation',
  profile: ExpertPlayerTendency,
): number {
  let t = EXPERT_FOLD_MAX_WIN_PROB
  if (archetype === 'aggressive' && profile.bluffRaiseRate > 0.35) t -= 0.05
  if (archetype === 'callingStation') t -= 0.04
  if (archetype === 'tight') t += 0.03
  return t
}

function bluffChanceForArchetype(
  archetype: 'aggressive' | 'tight' | 'callingStation',
  base: number,
  profile: ExpertPlayerTendency,
): number {
  let c = base
  if (archetype === 'aggressive' && profile.bluffRaiseRate > 0.3) c += 0.08
  if (archetype === 'tight' && profile.foldToRaiseRate > 0.6) c += 0.14
  if (archetype === 'callingStation') c -= 0.12
  return c
}

function valueThresholdForArchetype(
  archetype: 'aggressive' | 'tight' | 'callingStation',
): number {
  if (archetype === 'callingStation') return 0.52
  if (archetype === 'tight') return 0.62
  return 0.58
}

function blend3(
  weights: { aggressive: number; tight: number; callingStation: number },
  values: { aggressive: number; tight: number; callingStation: number },
): number {
  return (
    weights.aggressive * values.aggressive +
    weights.tight * values.tight +
    weights.callingStation * values.callingStation
  )
}

function effectiveRates(profile: ExpertPlayerTendency): ExpertPlayerTendency {
  if (profile.positionRates) {
    return {
      ...profile,
      vpip: profile.positionRates.vpip,
      pfr: profile.positionRates.pfr,
      foldToRaiseRate: profile.positionRates.foldToRaiseRate,
    }
  }
  return profile
}

/** Seuil P(gagner) min pour call face à une mise — profil hybride pondéré. */
export function applyTendencyFoldThreshold(
  profile?: ExpertPlayerTendency | null,
): number {
  if (!profile || profile.confidence === 'LOW') {
    return EXPERT_FOLD_MAX_WIN_PROB
  }

  const p = effectiveRates(profile)
  const intensity = tendencyAdjustmentIntensity(p)
  const weights = normalizeStyleWeights(p)

  let threshold = EXPERT_FOLD_MAX_WIN_PROB
  if (weights) {
    threshold = blend3(weights, {
      aggressive: foldThresholdForArchetype('aggressive', p),
      tight: foldThresholdForArchetype('tight', p),
      callingStation: foldThresholdForArchetype('callingStation', p),
    })
  } else {
    if (p.bluffRaiseRate > 0.35) threshold -= 0.05 * intensity
    if (p.styleTag === 'CALLING_STATION') threshold -= 0.03 * intensity
  }

  if ((p.recentTendency?.consecutiveBluffHands ?? 0) >= 3) {
    threshold -= 0.04 * intensity
  }

  return Math.max(0.05, threshold)
}

/** Probabilité de bluff / pression quand check possible. */
export function applyTendencyBluffChance(
  baseChance: number,
  profile?: ExpertPlayerTendency | null,
): number {
  if (!profile || profile.confidence === 'LOW') return baseChance

  const p = effectiveRates(profile)
  const intensity = tendencyAdjustmentIntensity(p)
  const weights = normalizeStyleWeights(p)
  let chance = baseChance

  if (weights) {
    chance = blend3(weights, {
      aggressive: bluffChanceForArchetype('aggressive', baseChance, p),
      tight: bluffChanceForArchetype('tight', baseChance, p),
      callingStation: bluffChanceForArchetype('callingStation', baseChance, p),
    })
  } else {
    if (p.foldToRaiseRate > 0.6) chance += 0.15 * intensity
    if (p.styleTag === 'TIGHT') chance += 0.12 * intensity
    if (p.styleTag === 'CALLING_STATION') chance -= 0.15 * intensity
  }

  if ((p.recentTendency?.consecutiveFoldStreak ?? 0) >= 4) {
    chance += 0.1 * intensity
  }

  return Math.max(0, Math.min(0.85, chance))
}

/** Seuil P(gagner) pour value-bet quand check possible. */
export function applyTendencyValueThreshold(
  profile?: ExpertPlayerTendency | null,
): number {
  if (!profile || profile.confidence === 'LOW') return 0.58

  const p = effectiveRates(profile)
  const intensity = tendencyAdjustmentIntensity(p)
  const weights = normalizeStyleWeights(p)
  let threshold = 0.58

  if (weights) {
    threshold = blend3(weights, {
      aggressive: valueThresholdForArchetype('aggressive'),
      tight: valueThresholdForArchetype('tight'),
      callingStation: valueThresholdForArchetype('callingStation'),
    })
  } else {
    if (p.styleTag === 'CALLING_STATION') threshold -= 0.06 * intensity
    if (p.styleTag === 'TIGHT') threshold += 0.04 * intensity
  }

  return Math.max(0.45, Math.min(0.72, threshold))
}

/** Sizing adaptatif (buckets pot-based) après décision raise. */
export function pickAdaptiveRaiseSize(
  req: BotActionRequest,
  multiplier: number,
  tendency?: ExpertPlayerTendency | null,
  style: 'value' | 'bluff' = 'value',
): number {
  let mult = multiplier
  if (tendency && tendency.confidence !== 'LOW') {
    const intensity = tendencyAdjustmentIntensity(tendency)
    const callingWeight =
      (tendency.styleScores?.callingStation ?? 0) /
      Math.max(
        1,
        (tendency.styleScores?.aggressive ?? 0) +
          (tendency.styleScores?.tight ?? 0) +
          (tendency.styleScores?.callingStation ?? 0),
      )

    if (style === 'value' && callingWeight > 0.35) mult += 0.45 * intensity
    if (style === 'bluff' && tendency.foldToRaiseRate > 0.6) mult -= 0.25 * intensity
    if (style === 'bluff' && (tendency.recentTendency?.consecutiveFoldStreak ?? 0) >= 4) {
      mult -= 0.2 * intensity
    }
    if (tendency.styleTag === 'TIGHT' && style === 'bluff') mult -= 0.15 * intensity
  }
  return minRaiseAmount(req, Math.max(1.2, mult))
}

/**
 * Force normalisée « adversaire » en oracle multiway : avec 3+ trous, le pur max surestime
 * toujours quelqu’un qui nous domine — on mélange meilleure main et médiane.
 * `sortedDesc` : forces triées décroissantes.
 */
export function compositeOpponentNormalizedStrength(sortedDesc: number[]): number {
  const n = sortedDesc.length
  if (n === 0) return 0
  if (n <= 2) return sortedDesc[0]!
  const best = sortedDesc[0]!
  const median = sortedDesc[Math.floor(n / 2)]!
  const w = Math.max(0.35, Math.min(0.68, 0.56 - 0.05 * (n - 3)))
  return best * w + median * (1 - w)
}

/**
 * Politique expert quand les cartes adverses sont connues (oracle), sans appel Python.
 * Évite le fold mécanique du heuristic expert classique qui ne voit pas les mains adverses.
 */
export function expertOracleDecision(req: BotActionRequest, ctx: ExpertOracleContext): BotActionResponse {
  const board = req.communityCards
  const holes = (ctx.opponentHoleCards ?? []).filter((h) => Array.isArray(h) && h.length >= 2)
  const winProb =
    typeof ctx.rangeWinProb === 'number'
      ? ctx.rangeWinProb
      : holes.length > 0
        ? heroShowdownEquity(req.playerCards, holes, board)
        : normalizedHandStrength(req.playerCards, board)
  const potOdds = req.callAmount / Math.max(req.potSize + req.callAmount, 1)
  const winPct = (winProb * 100).toFixed(0)
  const tendency = ctx.playerTendency
  const foldThreshold = applyTendencyFoldThreshold(tendency)
  const valueThreshold = applyTendencyValueThreshold(tendency)
  const bluffChance = applyTendencyBluffChance(0.42, tendency)

  if (req.callAmount === 0) {
    if (winProb >= valueThreshold) {
      return {
        action: 'RAISE',
        amount: pickAdaptiveRaiseSize(req, 2.35 + Math.random() * 0.75, tendency, 'value'),
        style: 'value',
        reasoning: `expert-oracle: value (win=${winPct}%, tendency=${tendency?.styleTag ?? 'none'})`,
      }
    }
    if (winProb >= 0.34 && Math.random() < bluffChance) {
      return {
        action: 'RAISE',
        amount: pickAdaptiveRaiseSize(req, 1.85 + Math.random() * 0.55, tendency, 'bluff'),
        style: 'bluff',
        reasoning: `expert-oracle: bluff / pression (win=${winPct}%)`,
      }
    }
    return {
      action: 'CHECK',
      style: 'pot_control',
      reasoning: `expert-oracle: check (win=${winPct}%)`,
    }
  }

  if (winProb < foldThreshold) {
    return {
      action: 'FOLD',
      style: 'discipline',
      reasoning: `expert-oracle: fold (win=${winPct}% < ${(foldThreshold * 100).toFixed(0)}%)`,
    }
  }

  if (winProb >= 0.6 && (winProb > potOdds + 0.12 || winProb >= 0.72) && Math.random() < 0.52) {
    return {
      action: 'RAISE',
      amount: pickAdaptiveRaiseSize(req, 2.15 + Math.random() * 0.5, tendency, 'value'),
      style: 'value',
      reasoning: `expert-oracle: relance value face à une mise (win=${winPct}%)`,
    }
  }

  if (req.playerChips >= req.callAmount) {
    return {
      action: 'CALL',
      amount: intChips(req.callAmount),
      style: winProb >= potOdds ? 'showdown_value' : 'float',
      reasoning: `expert-oracle: call (win=${winPct}%, seuil fold 80% lose)`,
    }
  }
  if (req.playerChips > 0) {
    return {
      action: 'CALL',
      amount: intChips(req.playerChips),
      style: 'hero',
      reasoning: `expert-oracle: call tapis (win=${winPct}%)`,
    }
  }

  return { action: 'FOLD', style: 'discipline', reasoning: 'expert-oracle: fold (plus de jetons)' }
}

export function decideBotAction(req: BotActionRequest): BotActionResponse {
  switch (req.difficulty) {
    case 'easy':
      return easyBotDecision(req)
    case 'medium':
      return mediumBotDecision(req)
    case 'hard':
      return hardBotDecision(req)
    case 'expert':
      return expertBotDecision(req)
    default:
      return mediumBotDecision(req)
  }
}
