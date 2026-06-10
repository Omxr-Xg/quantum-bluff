/**
 * Machine à sous — 4 rouleaux, logique pure (testable).
 */
import { intChips } from '../utils/chips.js'
import { drawInt } from '../rng/rng.service.js'

export const SLOT_MIN_BET = 10
/** Plafond de mise par spin (indépendamment du solde). */
export const SLOT_MAX_BET_CAP = 1000

export type SlotSymbolId = 'seven' | 'crown' | 'diamond' | 'cherry' | 'bell' | 'bar'

export type SlotReels = [SlotSymbolId, SlotSymbolId, SlotSymbolId, SlotSymbolId]

const SYMBOL_ORDER: SlotSymbolId[] = ['cherry', 'bar', 'bell', 'diamond', 'crown', 'seven']

/** Poids relatifs (plus le chiffre est haut, plus le symbole est fréquent). */
const SYMBOL_WEIGHT: Record<SlotSymbolId, number> = {
  cherry: 28,
  bar: 22,
  bell: 18,
  diamond: 14,
  crown: 10,
  seven: 6,
}

/** Multiplicateur si 4 identiques sur la ligne centrale. */
const FOUR_OF_KIND_MULT: Record<SlotSymbolId, number> = {
  seven: 200,
  crown: 50,
  diamond: 30,
  bell: 20,
  cherry: 12,
  bar: 8,
}

const THREE_OF_KIND_MULT = 3
const PAIR_MULT = 1.5

export type RandomIntFn = (minInclusive: number, maxInclusive: number) => number

function defaultRandomInt(min: number, max: number): number {
  return drawInt('slot', 'legacy-round', 'slot.defaultRandomInt', min, max).value
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

export function rollFourReels(randomInt: RandomIntFn = defaultRandomInt): SlotReels {
  return [pickSymbol(randomInt), pickSymbol(randomInt), pickSymbol(randomInt), pickSymbol(randomInt)]
}

/** @deprecated Alias historique — préférer rollFourReels. */
export function rollThreeReels(randomInt: RandomIntFn = defaultRandomInt): SlotReels {
  return rollFourReels(randomInt)
}

/**
 * Montant total versé par la machine pour ce spin (à créditer après débit de la mise).
 */
export function computeSlotWin(bet: number, reels: SlotReels): number {
  const b = intChips(bet)
  if (b <= 0) return 0
  const [r0, r1, r2, r3] = reels

  if (r0 === r1 && r1 === r2 && r2 === r3) {
    return intChips(b * FOUR_OF_KIND_MULT[r0])
  }
  if (r0 === r1 && r1 === r2) {
    return intChips(b * THREE_OF_KIND_MULT)
  }
  if (r1 === r2 && r2 === r3) {
    return intChips(b * THREE_OF_KIND_MULT)
  }
  if (r0 === r1 || r1 === r2 || r2 === r3) {
    return intChips(b * PAIR_MULT)
  }
  return 0
}

/** Brelan ou carré (défis / bonus slot). */
export function isSlotBonusLine(reels: SlotReels): boolean {
  const [r0, r1, r2, r3] = reels
  if (r0 === r1 && r1 === r2 && r2 === r3) return true
  if (r0 === r1 && r1 === r2) return true
  if (r1 === r2 && r2 === r3) return true
  return false
}

export function spinSlot(bet: number, randomInt: RandomIntFn = defaultRandomInt): {
  reels: SlotReels
  winAmount: number
} {
  const reels = rollFourReels(randomInt)
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
