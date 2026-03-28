import type { Rank } from '../../types/poker.js'
import {
  CLASS_KEY_TO_CATEGORY,
  type HiddenBetMarketPhase,
  type SelectionPayload,
  type WinningHandClassKey,
} from './types.js'
import {
  oddsContainsRank,
  oddsPlayerWins,
  oddsWinningHandClass,
  getAndComboOdds,
  andComboPricingKey,
} from './pricing/pricingTables.js'
import {
  oddsPlayerWinsCurrentHand,
  oddsHandReachesShowdown,
  oddsHandEndsByFold,
  oddsFinalWinningHandClass,
} from './pricing/livePricing.js'

const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

const PRE_TYPES = new Set([
  'PLAYER_WINS',
  'WINNING_HAND_CLASS',
  'WINNING_HAND_CONTAINS_RANK',
])
const LIVE_TYPES = new Set([
  'PLAYER_WINS_CURRENT_HAND',
  'HAND_REACHES_SHOWDOWN',
  'HAND_ENDS_BY_FOLD',
  'FINAL_WINNING_HAND_CLASS',
])

function parseOneSelection(raw: unknown, phase: HiddenBetMarketPhase): SelectionPayload | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'sélection invalide' }
  const m = (raw as { marketType?: string }).marketType
  const isPre = phase === 'PRE_HAND'
  if (isPre && m === 'PLAYER_WINS') {
    const playerId = (raw as { playerId?: string }).playerId
    if (!playerId || typeof playerId !== 'string') return { error: 'playerId requis' }
    return { marketType: 'PLAYER_WINS', playerId }
  }
  if (isPre && m === 'WINNING_HAND_CLASS') {
    const c = (raw as { class?: WinningHandClassKey }).class
    if (!c || !(c in CLASS_KEY_TO_CATEGORY)) return { error: 'classe invalide' }
    return { marketType: 'WINNING_HAND_CLASS', class: c }
  }
  if (isPre && m === 'WINNING_HAND_CONTAINS_RANK') {
    const r = (raw as { rank?: Rank }).rank
    if (!r || !RANKS.includes(r)) return { error: 'rang invalide' }
    return { marketType: 'WINNING_HAND_CONTAINS_RANK', rank: r }
  }
  if (!isPre && m === 'PLAYER_WINS_CURRENT_HAND') {
    const playerId = (raw as { playerId?: string }).playerId
    if (!playerId || typeof playerId !== 'string') return { error: 'playerId requis' }
    return { marketType: 'PLAYER_WINS_CURRENT_HAND', playerId }
  }
  if (!isPre && m === 'HAND_REACHES_SHOWDOWN') {
    return { marketType: 'HAND_REACHES_SHOWDOWN' }
  }
  if (!isPre && m === 'HAND_ENDS_BY_FOLD') {
    return { marketType: 'HAND_ENDS_BY_FOLD' }
  }
  if (!isPre && m === 'FINAL_WINNING_HAND_CLASS') {
    const c = (raw as { class?: WinningHandClassKey }).class
    if (!c || !(c in CLASS_KEY_TO_CATEGORY)) return { error: 'classe invalide' }
    return { marketType: 'FINAL_WINNING_HAND_CLASS', class: c }
  }
  return { error: 'marketType inconnu ou incompatible avec la phase' }
}

export function validateSelections(
  selections: unknown,
  combinator: 'SINGLE' | 'AND',
  marketPhase: HiddenBetMarketPhase
): { ok: true; selections: SelectionPayload[] } | { ok: false; error: string } {
  if (!Array.isArray(selections)) return { ok: false, error: 'selections invalides' }
  if (combinator === 'SINGLE' && selections.length !== 1) {
    return { ok: false, error: 'SINGLE requiert une sélection' }
  }
  if (combinator === 'AND' && selections.length !== 2) {
    return { ok: false, error: 'AND requiert deux sélections' }
  }
  if (combinator === 'AND' && marketPhase !== 'PRE_HAND') {
    return { ok: false, error: 'AND réservé au PRE_HAND en V1' }
  }
  const out: SelectionPayload[] = []
  for (const raw of selections) {
    const p = parseOneSelection(raw, marketPhase)
    if ('error' in p) return { ok: false, error: p.error }
    const mt = p.marketType
    if (marketPhase === 'PRE_HAND' && !PRE_TYPES.has(mt)) {
      return { ok: false, error: 'marché incompatible PRE_HAND' }
    }
    if (marketPhase !== 'PRE_HAND' && !LIVE_TYPES.has(mt)) {
      return { ok: false, error: 'marché incompatible LIVE' }
    }
    out.push(p)
  }
  if (combinator === 'AND') {
    const types = new Set(out.map((s) => s.marketType))
    if (types.size < 2) return { ok: false, error: 'AND requiert deux marchés distincts' }
    const pk = andComboPricingKey(out)
    if (!pk || getAndComboOdds(pk) == null) return { ok: false, error: 'combiné non pris en charge' }
  }
  return { ok: true, selections: out }
}

export function computeQuotedOdds(
  selections: SelectionPayload[],
  combinator: 'SINGLE' | 'AND',
  numActivePlayers: number,
  marketPhase: HiddenBetMarketPhase
): number {
  if (combinator === 'AND') {
    const pk = andComboPricingKey(selections)
    if (!pk) return 0
    return getAndComboOdds(pk) ?? 0
  }
  const s = selections[0]
  if (!s) return 0
  if (marketPhase === 'PRE_HAND') {
    if (s.marketType === 'PLAYER_WINS') return oddsPlayerWins(numActivePlayers)
    if (s.marketType === 'WINNING_HAND_CLASS') return oddsWinningHandClass(s.class)
    if (s.marketType === 'WINNING_HAND_CONTAINS_RANK') return oddsContainsRank(s.rank)
    return 0
  }
  if (s.marketType === 'PLAYER_WINS_CURRENT_HAND') return oddsPlayerWinsCurrentHand(numActivePlayers)
  if (s.marketType === 'HAND_REACHES_SHOWDOWN') return oddsHandReachesShowdown(numActivePlayers)
  if (s.marketType === 'HAND_ENDS_BY_FOLD') return oddsHandEndsByFold(numActivePlayers)
  if (s.marketType === 'FINAL_WINNING_HAND_CLASS') return oddsFinalWinningHandClass(s.class)
  return 0
}

export function marketKeyAndSignature(sel: SelectionPayload): { marketKey: string; paramSignature: string } {
  if (sel.marketType === 'PLAYER_WINS' || sel.marketType === 'PLAYER_WINS_CURRENT_HAND') {
    return {
      marketKey: sel.marketType,
      paramSignature: `player:${sel.playerId}`,
    }
  }
  if (sel.marketType === 'WINNING_HAND_CLASS' || sel.marketType === 'FINAL_WINNING_HAND_CLASS') {
    return {
      marketKey: sel.marketType,
      paramSignature: `class:${sel.class}`,
    }
  }
  if (sel.marketType === 'WINNING_HAND_CONTAINS_RANK') {
    return {
      marketKey: 'WINNING_HAND_CONTAINS_RANK',
      paramSignature: `rank:${sel.rank}`,
    }
  }
  if (sel.marketType === 'HAND_REACHES_SHOWDOWN') {
    return { marketKey: 'HAND_REACHES_SHOWDOWN', paramSignature: 'bool:1' }
  }
  return { marketKey: 'HAND_ENDS_BY_FOLD', paramSignature: 'bool:1' }
}
