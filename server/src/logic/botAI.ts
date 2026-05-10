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
  return { action: 'FOLD', reasoning: `${p.name}: fold` }
}

/** Contexte « voyant » : trous adverses connus (mode expert sans ou en secours du service Python). */
export type ExpertOracleContext = {
  opponentHoleCards?: Card[][]
  opponentStack?: number
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
  const hero = normalizedHandStrength(req.playerCards, board)
  const oppStrengths = holes.map((h) => normalizedHandStrength(h, board)).sort((a, b) => b - a)
  const oppBest = compositeOpponentNormalizedStrength(oppStrengths)
  const edge = hero - oppBest

  const potOdds = req.callAmount / Math.max(req.potSize + req.callAmount, 1)
  const pressure = req.callAmount / Math.max(req.playerChips, 1)

  const eq = Math.min(0.96, Math.max(0.06, hero + edge * 0.52))

  if (req.callAmount === 0) {
    if (edge > 0.02) {
      return {
        action: 'RAISE',
        amount: minRaiseAmount(req, 2.35 + Math.random() * 0.75),
        style: 'value',
        reasoning: `expert-oracle: value (edge=${edge.toFixed(2)})`,
      }
    }
    if (edge > -0.14 && Math.random() < 0.44) {
      return {
        action: 'RAISE',
        amount: minRaiseAmount(req, 1.85 + Math.random() * 0.55),
        style: 'bluff',
        reasoning: `expert-oracle: bluff / pression (edge=${edge.toFixed(2)})`,
      }
    }
    return {
      action: 'CHECK',
      style: 'pot_control',
      reasoning: `expert-oracle: check (edge=${edge.toFixed(2)})`,
    }
  }

  if (edge > 0.08) {
    if (eq > potOdds + 0.1 && Math.random() < 0.5) {
      return {
        action: 'RAISE',
        amount: minRaiseAmount(req, 2.15 + Math.random() * 0.5),
        style: 'value',
        reasoning: 'expert-oracle: relance value face à une mise',
      }
    }
    return {
      action: 'CALL',
      amount: intChips(req.callAmount),
      style: 'value',
      reasoning: 'expert-oracle: call — devant',
    }
  }

  if (edge >= -0.07 && eq + 0.05 >= potOdds) {
    return {
      action: 'CALL',
      amount: intChips(req.callAmount),
      style: 'showdown_value',
      reasoning: 'expert-oracle: call — prix potable',
    }
  }

  if (edge >= -0.14 && req.callAmount <= req.potSize * 0.5) {
    if (Math.random() < 0.68) {
      return {
        action: 'CALL',
        amount: intChips(req.callAmount),
        style: 'float',
        reasoning: 'expert-oracle: call mise modérée',
      }
    }
  }

  if (edge < -0.22 && (pressure > 0.4 || req.callAmount > req.potSize * 0.9)) {
    return {
      action: 'FOLD',
      style: 'discipline',
      reasoning: 'expert-oracle: dominé + grosse pression',
    }
  }

  if (edge < -0.16 && potOdds > 0.48) {
    return {
      action: 'FOLD',
      style: 'discipline',
      reasoning: 'expert-oracle: dominé, pot odds défavorables',
    }
  }

  if (req.playerChips >= req.callAmount && Math.random() < 0.82) {
    return {
      action: 'CALL',
      amount: intChips(req.callAmount),
      style: 'hero',
      reasoning: 'expert-oracle: call (évite fold systématique)',
    }
  }

  return { action: 'FOLD', style: 'discipline', reasoning: 'expert-oracle: fold' }
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
