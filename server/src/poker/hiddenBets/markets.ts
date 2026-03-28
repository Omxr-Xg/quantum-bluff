import type { Rank } from '../../types/poker.js'
import {
  CLASS_KEY_TO_CATEGORY,
  type SelectionPayload,
  type WinningHandClassKey,
} from './types.js'
import {
  oddsContainsRank,
  oddsPlayerWins,
  oddsWinningHandClass,
  getAndComboOdds,
  andComboPricingKey,
} from './pricingTables.v1.js'

const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

export function validateSelections(
  selections: unknown,
  combinator: 'SINGLE' | 'AND'
): { ok: true; selections: SelectionPayload[] } | { ok: false; error: string } {
  if (!Array.isArray(selections)) return { ok: false, error: 'selections invalides' }
  if (combinator === 'SINGLE' && selections.length !== 1) {
    return { ok: false, error: 'SINGLE requiert une sélection' }
  }
  if (combinator === 'AND' && selections.length !== 2) {
    return { ok: false, error: 'AND requiert deux sélections' }
  }
  const out: SelectionPayload[] = []
  for (const raw of selections) {
    if (!raw || typeof raw !== 'object') return { ok: false, error: 'sélection invalide' }
    const m = (raw as { marketType?: string }).marketType
    if (m === 'PLAYER_WINS') {
      const playerId = (raw as { playerId?: string }).playerId
      if (!playerId || typeof playerId !== 'string') return { ok: false, error: 'playerId requis' }
      out.push({ marketType: 'PLAYER_WINS', playerId })
    } else if (m === 'WINNING_HAND_CLASS') {
      const c = (raw as { class?: WinningHandClassKey }).class
      if (!c || !(c in CLASS_KEY_TO_CATEGORY)) return { ok: false, error: 'classe invalide' }
      out.push({ marketType: 'WINNING_HAND_CLASS', class: c })
    } else if (m === 'WINNING_HAND_CONTAINS_RANK') {
      const r = (raw as { rank?: Rank }).rank
      if (!r || !RANKS.includes(r)) return { ok: false, error: 'rang invalide' }
      out.push({ marketType: 'WINNING_HAND_CONTAINS_RANK', rank: r })
    } else {
      return { ok: false, error: 'marketType inconnu' }
    }
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
  numActivePlayers: number
): number {
  if (combinator === 'AND') {
    const pk = andComboPricingKey(selections)
    if (!pk) return 0
    return getAndComboOdds(pk) ?? 0
  }
  const s = selections[0]
  if (!s) return 0
  if (s.marketType === 'PLAYER_WINS') return oddsPlayerWins(numActivePlayers)
  if (s.marketType === 'WINNING_HAND_CLASS') return oddsWinningHandClass(s.class)
  return oddsContainsRank(s.rank)
}

export function marketKeyAndSignature(sel: SelectionPayload): { marketKey: string; paramSignature: string } {
  if (sel.marketType === 'PLAYER_WINS') {
    return {
      marketKey: 'PLAYER_WINS',
      paramSignature: `player:${sel.playerId}`,
    }
  }
  if (sel.marketType === 'WINNING_HAND_CLASS') {
    return {
      marketKey: 'WINNING_HAND_CLASS',
      paramSignature: `class:${sel.class}`,
    }
  }
  return {
    marketKey: 'WINNING_HAND_CONTAINS_RANK',
    paramSignature: `rank:${sel.rank}`,
  }
}
