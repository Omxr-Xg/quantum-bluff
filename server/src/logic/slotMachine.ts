/**
 * Machine à sous — logique pure (testable). Tirage via injectable randomInt (défaut: crypto).
 */
import { randomInt as cryptoRandomInt } from 'node:crypto'
import { intChips } from '../utils/chips.js'

export const SLOT_MIN_BET = 10
/** Plafond de mise par spin (indépendamment du solde). */
export const SLOT_MAX_BET_CAP = 1000

export type SlotSymbolId = 'cherry' | 'lemon' | 'bell' | 'seven' | 'diamond'

const SYMBOL_ORDER: SlotSymbolId[] = ['cherry', 'lemon', 'bell', 'seven', 'diamond']

/** Poids relatifs (plus le chiffre est haut, plus le symbole est fréquent). */
const SYMBOL_WEIGHT: Record<SlotSymbolId, number> = {
  cherry: 32,
  lemon: 24,
  bell: 18,
  seven: 14,
  diamond: 8,
}

/** Multiplicateur sur la mise si 3 identiques. */
const THREE_OF_KIND_MULT: Record<SlotSymbolId, number> = {
  cherry: 5,
  lemon: 8,
  bell: 10,
  seven: 15,
  diamond: 20,
}

/** Bonus si exactement 2 identiques (une paire). */
const PAIR_MULT = 1

export type RandomIntFn = (minInclusive: number, maxInclusive: number) => number

function defaultRandomInt(min: number, max: number): number {
  return cryptoRandomInt(min, max + 1)
}

function pickSymbol(randomInt: RandomIntFn): SlotSymbolId {
  const total = SYMBOL_ORDER.reduce((s, id) => s + SYMBOL_WEIGHT[id], 0)
  const r = randomInt(0, total - 1)
  let acc = 0
  for (const id of SYMBOL_ORDER) {
    acc += SYMBOL_WEIGHT[id]
    if (r < acc) return id
  }
  return SYMBOL_ORDER[SYMBOL_ORDER.length - 1]!
}

export function rollThreeReels(randomInt: RandomIntFn = defaultRandomInt): [SlotSymbolId, SlotSymbolId, SlotSymbolId] {
  return [pickSymbol(randomInt), pickSymbol(randomInt), pickSymbol(randomInt)]
}

/**
 * Montant total versé par la machine pour ce spin (à créditer après débit de la mise).
 * Perte : 0. Paire : remboursement de la mise (= bet). Brelan : bet × multiplicateur (somme rendue au joueur, dont la part « gain » au-delà de la mise = winAmount − bet).
 */
export function computeSlotWin(bet: number, reels: [SlotSymbolId, SlotSymbolId, SlotSymbolId]): number {
  const b = intChips(bet)
  if (b <= 0) return 0
  const [r0, r1, r2] = reels
  if (r0 === r1 && r1 === r2) {
    return intChips(b * THREE_OF_KIND_MULT[r0])
  }
  const counts: Record<SlotSymbolId, number> = {
    cherry: 0,
    lemon: 0,
    bell: 0,
    seven: 0,
    diamond: 0,
  }
  counts[r0]++
  counts[r1]++
  counts[r2]++
  const hasPair = SYMBOL_ORDER.some((id) => counts[id] === 2)
  if (hasPair) return intChips(b * PAIR_MULT)
  return 0
}

export function spinSlot(bet: number, randomInt: RandomIntFn = defaultRandomInt): {
  reels: [SlotSymbolId, SlotSymbolId, SlotSymbolId]
  winAmount: number
} {
  const reels = rollThreeReels(randomInt)
  const winAmount = computeSlotWin(bet, reels)
  return { reels, winAmount }
}

export function clampBetForChips(rawBet: number, chips: number, maxBetCap: number = SLOT_MAX_BET_CAP): number {
  const b = intChips(rawBet)
  const maxByBalance = intChips(chips)
  const cap = Math.min(intChips(maxBetCap), maxByBalance)
  if (b < SLOT_MIN_BET) return 0
  if (b > cap) return 0
  return b
}

export function validateSlotBet(
  rawBet: number,
  chips: number,
  maxBetCap: number = SLOT_MAX_BET_CAP
): { ok: true; bet: number } | { ok: false; code: string } {
  const capTop = Math.min(SLOT_MAX_BET_CAP, Math.max(SLOT_MIN_BET, intChips(maxBetCap)))
  const c = intChips(chips)
  if (c < SLOT_MIN_BET) {
    return { ok: false, code: 'INSUFFICIENT_CHIPS' }
  }
  const b = intChips(rawBet)
  if (!Number.isFinite(rawBet) || b < SLOT_MIN_BET) {
    return { ok: false, code: 'BET_TOO_LOW' }
  }
  const maxAllowed = Math.min(capTop, c)
  if (b > maxAllowed) {
    return { ok: false, code: 'BET_TOO_HIGH' }
  }
  if (b > c) {
    return { ok: false, code: 'INSUFFICIENT_CHIPS' }
  }
  return { ok: true, bet: b }
}
