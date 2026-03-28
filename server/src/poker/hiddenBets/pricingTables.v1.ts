import type { SelectionPayload, WinningHandClassKey } from './types.js'

/** Cotes décimales (house edge inclus dans les tables). Version figée V1. */
export function oddsPlayerWins(numActivePlayers: number): number {
  const n = Math.min(Math.max(numActivePlayers, 2), 9)
  const table: Record<number, number> = {
    2: 2.35,
    3: 2.85,
    4: 3.35,
    5: 3.85,
    6: 4.35,
    7: 4.85,
    8: 5.35,
    9: 5.85,
  }
  return table[n] ?? 3.35
}

const CLASS_ODDS: Partial<Record<WinningHandClassKey, number>> = {
  HIGH_CARD: 12,
  PAIR: 8,
  TWO_PAIR: 10,
  THREE_OF_A_KIND: 14,
  STRAIGHT: 16,
  FLUSH: 18,
  QUANTUM_COMBI: 20,
  FULL_HOUSE: 22,
  FOUR_OF_A_KIND: 35,
  STRAIGHT_FLUSH: 60,
}

export function oddsWinningHandClass(cls: WinningHandClassKey): number {
  return CLASS_ODDS[cls] ?? 12
}

const RANK_ODDS: Record<string, number> = {
  '2': 6,
  '3': 6,
  '4': 7,
  '5': 7,
  '6': 8,
  '7': 8,
  '8': 9,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 15,
}

export function oddsContainsRank(rank: string): number {
  return RANK_ODDS[rank] ?? 10
}

/** Paires AND whitelist : clé stable → cote brute (pas produit des marges). */
export const AND_COMBO_ODDS: Record<string, number> = {
  'PLAYER_WINS|WINNING_HAND_CLASS:HIGH_CARD': 22,
  'PLAYER_WINS|WINNING_HAND_CLASS:PAIR': 20,
  'PLAYER_WINS|WINNING_HAND_CLASS:TWO_PAIR': 24,
  'PLAYER_WINS|WINNING_HAND_CLASS:THREE_OF_A_KIND': 30,
  'PLAYER_WINS|WINNING_HAND_CLASS:STRAIGHT': 28,
  'PLAYER_WINS|WINNING_HAND_CLASS:FLUSH': 32,
  'PLAYER_WINS|WINNING_HAND_CLASS:QUANTUM_COMBI': 36,
  'PLAYER_WINS|WINNING_HAND_CLASS:FULL_HOUSE': 40,
  'PLAYER_WINS|WINNING_HAND_CLASS:FOUR_OF_A_KIND': 55,
  'PLAYER_WINS|WINNING_HAND_CLASS:STRAIGHT_FLUSH': 85,
  'PLAYER_WINS|WINNING_HAND_CONTAINS_RANK:2': 18,
  'PLAYER_WINS|WINNING_HAND_CONTAINS_RANK:A': 45,
}

/** Cote combiné AND PLAYER_WINS + rang (défaut si pas dans la table explicite). */
const DEFAULT_PLAYER_WINS_RANK_COMBO = 26

export function getAndComboOdds(key: string): number | undefined {
  if (AND_COMBO_ODDS[key] != null) return AND_COMBO_ODDS[key]
  if (/^PLAYER_WINS\|WINNING_HAND_CONTAINS_RANK:/.test(key)) return DEFAULT_PLAYER_WINS_RANK_COMBO
  return undefined
}

export function andComboPricingKey(sel: SelectionPayload[]): string | null {
  if (sel.length !== 2) return null
  const sorted = [...sel].sort((a, b) => a.marketType.localeCompare(b.marketType))
  const parts: string[] = []
  for (const s of sorted) {
    if (s.marketType === 'PLAYER_WINS') parts.push('PLAYER_WINS')
    else if (s.marketType === 'WINNING_HAND_CLASS') parts.push(`WINNING_HAND_CLASS:${s.class}`)
    else if (s.marketType === 'WINNING_HAND_CONTAINS_RANK') parts.push(`WINNING_HAND_CONTAINS_RANK:${s.rank}`)
    else return null
  }
  return parts.join('|')
}
