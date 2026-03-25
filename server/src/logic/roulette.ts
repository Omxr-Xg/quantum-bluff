/**
 * Roulette européenne — logique pure (testable). Tirage via RNG injectable (défaut: crypto).
 */
import { randomInt as cryptoRandomInt } from 'node:crypto'
import { intChips } from '../utils/chips.js'

export const ROULETTE_MIN_BET = 10
/** Plafond par mise individuelle (comme le slot). */
export const ROULETTE_MAX_BET_CAP = 1000
/** Plafond total des mises par spin (toutes lignes confondues). */
export const ROULETTE_MAX_TOTAL_STAKE = 5000
export const ROULETTE_MAX_BETS_PER_SPIN = 40

export type RandomIntFn = (minInclusive: number, maxInclusive: number) => number

function defaultRandomInt(min: number, max: number): number {
  return cryptoRandomInt(min, max + 1)
}

/** Ordre physique des cases sur une roue européenne (sens horaire, à partir de 0). Utile pour l’UI. */
export const EUROPEAN_WHEEL_ORDER: readonly number[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const

const RED_NUMBERS = new Set<number>([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
])

export function isRouletteRed(n: number): boolean {
  return n >= 1 && n <= 36 && RED_NUMBERS.has(n)
}

export function isRouletteBlack(n: number): boolean {
  return n >= 1 && n <= 36 && !RED_NUMBERS.has(n)
}

export type RouletteResultColor = 'green' | 'red' | 'black'

export function resultColor(result: number): RouletteResultColor {
  if (result === 0) return 'green'
  return isRouletteRed(result) ? 'red' : 'black'
}

/** Multiplicateur du versement total (mise incluse) si le pari gagne. */
const PAY_STRAIGHT = 36
const PAY_SPLIT = 18
const PAY_STREET = 12
const PAY_CORNER = 9
const PAY_SIX_LINE = 6
const PAY_DOZEN_COL = 3
const PAY_EVEN = 2

function columnOf(n: number): 1 | 2 | 3 | null {
  if (n < 1 || n > 36) return null
  const m = ((n - 1) % 3) as 0 | 1 | 2
  return (m + 1) as 1 | 2 | 3
}

function dozenOf(n: number): 1 | 2 | 3 | null {
  if (n < 1 || n > 36) return null
  if (n <= 12) return 1
  if (n <= 24) return 2
  return 3
}

function streetNumbers(base: number): [number, number, number] {
  return [base, base + 1, base + 2]
}

function isValidStreetBase(base: number): boolean {
  return base >= 1 && base <= 34 && (base - 1) % 3 === 0
}

function sixLineNumbers(base: number): number[] {
  return [base, base + 1, base + 2, base + 3, base + 4, base + 5]
}

/** Bases valides : 1,4,7,…,31 (deux transversales consécutives). */
function isValidSixLineBase(base: number): boolean {
  return base >= 1 && base <= 31 && (base - 1) % 3 === 0
}

function buildValidSplits(): Set<string> {
  const s = new Set<string>()
  const add = (a: number, b: number) => s.add(`${Math.min(a, b)}-${Math.max(a, b)}`)
  add(0, 1)
  add(0, 2)
  add(0, 3)
  for (let row = 0; row < 12; row++) {
    const b = 1 + row * 3
    add(b, b + 1)
    add(b + 1, b + 2)
  }
  for (let row = 0; row < 11; row++) {
    for (let col = 0; col < 3; col++) {
      const n = 1 + row * 3 + col
      add(n, n + 3)
    }
  }
  return s
}

const VALID_SPLITS = buildValidSplits()

function splitKey(a: number, b: number): string {
  return `${Math.min(a, b)}-${Math.max(a, b)}`
}

function buildValidCorners(): Set<string> {
  const s = new Set<string>()
  for (let row = 0; row < 11; row++) {
    for (let col = 0; col < 2; col++) {
      const a = 1 + row * 3 + col
      const nums = [a, a + 1, a + 3, a + 4].sort((x, y) => x - y)
      s.add(nums.join(','))
    }
  }
  return s
}

const VALID_CORNERS = buildValidCorners()

function cornerKey(nums: number[]): string {
  return [...nums].sort((a, b) => a - b).join(',')
}

export type RouletteBetNormalized =
  | { type: 'straight'; n: number; amount: number }
  | { type: 'split'; a: number; b: number; amount: number }
  | { type: 'street'; base: number; amount: number }
  | { type: 'corner'; nums: [number, number, number, number]; amount: number }
  | { type: 'sixLine'; base: number; amount: number }
  | { type: 'dozen'; which: 1 | 2 | 3; amount: number }
  | { type: 'column'; which: 1 | 2 | 3; amount: number }
  | { type: 'red'; amount: number }
  | { type: 'black'; amount: number }
  | { type: 'even'; amount: number }
  | { type: 'odd'; amount: number }
  | { type: 'low'; amount: number }
  | { type: 'high'; amount: number }

export function spinWheel(randomInt: RandomIntFn = defaultRandomInt): number {
  return randomInt(0, 36)
}

function payoutStraight(n: number, result: number, amount: number): number {
  return result === n ? intChips(amount * PAY_STRAIGHT) : 0
}

function payoutSplit(a: number, b: number, result: number, amount: number): number {
  return result === a || result === b ? intChips(amount * PAY_SPLIT) : 0
}

function payoutStreet(base: number, result: number, amount: number): number {
  const [x, y, z] = streetNumbers(base)
  return result === x || result === y || result === z ? intChips(amount * PAY_STREET) : 0
}

function payoutCorner(nums: number[], result: number, amount: number): number {
  return nums.includes(result) ? intChips(amount * PAY_CORNER) : 0
}

function payoutSixLine(base: number, result: number, amount: number): number {
  return sixLineNumbers(base).includes(result) ? intChips(amount * PAY_SIX_LINE) : 0
}

function payoutDozen(which: 1 | 2 | 3, result: number, amount: number): number {
  if (result === 0) return 0
  const d = dozenOf(result)
  return d === which ? intChips(amount * PAY_DOZEN_COL) : 0
}

function payoutColumn(which: 1 | 2 | 3, result: number, amount: number): number {
  if (result === 0) return 0
  const c = columnOf(result)
  return c === which ? intChips(amount * PAY_DOZEN_COL) : 0
}

function payoutRedBlack(red: boolean, result: number, amount: number): number {
  if (result === 0) return 0
  const wins = red ? isRouletteRed(result) : isRouletteBlack(result)
  return wins ? intChips(amount * PAY_EVEN) : 0
}

function payoutEvenOdd(even: boolean, result: number, amount: number): number {
  if (result === 0) return 0
  const isEven = result % 2 === 0
  return isEven === even ? intChips(amount * PAY_EVEN) : 0
}

function payoutLowHigh(low: boolean, result: number, amount: number): number {
  if (result === 0) return 0
  const inLow = result >= 1 && result <= 18
  return inLow === low ? intChips(amount * PAY_EVEN) : 0
}

/** Versement total (jetons rendus au joueur pour ce pari) : 0 si perdu, sinon mise × multiplicateur tableau. */
export function payoutForBet(bet: RouletteBetNormalized, result: number): number {
  const amount = bet.amount
  switch (bet.type) {
    case 'straight':
      return payoutStraight(bet.n, result, amount)
    case 'split':
      return payoutSplit(bet.a, bet.b, result, amount)
    case 'street':
      return payoutStreet(bet.base, result, amount)
    case 'corner':
      return payoutCorner(bet.nums, result, amount)
    case 'sixLine':
      return payoutSixLine(bet.base, result, amount)
    case 'dozen':
      return payoutDozen(bet.which, result, amount)
    case 'column':
      return payoutColumn(bet.which, result, amount)
    case 'red':
      return payoutRedBlack(true, result, amount)
    case 'black':
      return payoutRedBlack(false, result, amount)
    case 'even':
      return payoutEvenOdd(true, result, amount)
    case 'odd':
      return payoutEvenOdd(false, result, amount)
    case 'low':
      return payoutLowHigh(true, result, amount)
    case 'high':
      return payoutLowHigh(false, result, amount)
    default:
      return 0
  }
}

function parseOneBet(raw: unknown, maxPerLine: number = ROULETTE_MAX_BET_CAP): RouletteBetNormalized | { error: string } {
  if (raw === null || typeof raw !== 'object') return { error: 'INVALID_BET' }
  const o = raw as Record<string, unknown>
  const type = o.type
  const rawAmt = o.amount
  const amount = typeof rawAmt === 'number' ? rawAmt : Number(rawAmt)
  if (!Number.isFinite(amount)) return { error: 'INVALID_AMOUNT' }
  const a = intChips(amount)
  if (a < ROULETTE_MIN_BET) return { error: 'BET_TOO_LOW' }
  if (a > maxPerLine) return { error: 'BET_TOO_HIGH' }

  if (type === 'straight') {
    const n = typeof o.n === 'number' ? o.n : Number(o.n)
    if (!Number.isInteger(n) || n < 0 || n > 36) return { error: 'INVALID_NUMBER' }
    return { type: 'straight', n, amount: a }
  }
  if (type === 'split') {
    const x = typeof o.a === 'number' ? o.a : Number(o.a)
    const y = typeof o.b === 'number' ? o.b : Number(o.b)
    if (!Number.isInteger(x) || !Number.isInteger(y)) return { error: 'INVALID_SPLIT' }
    if (!VALID_SPLITS.has(splitKey(x, y))) return { error: 'INVALID_SPLIT' }
    return { type: 'split', a: Math.min(x, y), b: Math.max(x, y), amount: a }
  }
  if (type === 'street') {
    const base = typeof o.base === 'number' ? o.base : Number(o.base)
    if (!Number.isInteger(base) || !isValidStreetBase(base)) return { error: 'INVALID_STREET' }
    return { type: 'street', base, amount: a }
  }
  if (type === 'corner') {
    const nums = [o.n1, o.n2, o.n3, o.n4].map((v) => (typeof v === 'number' ? v : Number(v)))
    if (!nums.every((n) => Number.isInteger(n))) return { error: 'INVALID_CORNER' }
    const key = cornerKey(nums)
    if (!VALID_CORNERS.has(key)) return { error: 'INVALID_CORNER' }
    const sorted = [...nums].sort((x, y) => x - y) as [number, number, number, number]
    return { type: 'corner', nums: sorted, amount: a }
  }
  if (type === 'sixLine') {
    const base = typeof o.base === 'number' ? o.base : Number(o.base)
    if (!Number.isInteger(base) || !isValidSixLineBase(base)) return { error: 'INVALID_SIXLINE' }
    return { type: 'sixLine', base, amount: a }
  }
  if (type === 'dozen') {
    const w = typeof o.which === 'number' ? o.which : Number(o.which)
    if (w !== 1 && w !== 2 && w !== 3) return { error: 'INVALID_DOZEN' }
    return { type: 'dozen', which: w as 1 | 2 | 3, amount: a }
  }
  if (type === 'column') {
    const w = typeof o.which === 'number' ? o.which : Number(o.which)
    if (w !== 1 && w !== 2 && w !== 3) return { error: 'INVALID_COLUMN' }
    return { type: 'column', which: w as 1 | 2 | 3, amount: a }
  }
  if (type === 'red' || type === 'black' || type === 'even' || type === 'odd' || type === 'low' || type === 'high') {
    return { type, amount: a }
  }
  return { error: 'UNKNOWN_BET_TYPE' }
}

export type ValidateBetsResult =
  | { ok: true; bets: RouletteBetNormalized[]; totalStake: number }
  | { ok: false; code: string }

export type RouletteValidateCaps = {
  maxPerLine?: number
  maxTotalStake?: number
}

export function validateRouletteBets(
  rawBets: unknown,
  chips: number,
  caps?: RouletteValidateCaps
): ValidateBetsResult {
  const effPerLine = Math.min(
    ROULETTE_MAX_BET_CAP,
    Math.max(ROULETTE_MIN_BET, intChips(caps?.maxPerLine ?? ROULETTE_MAX_BET_CAP))
  )
  const effTotal = Math.min(
    ROULETTE_MAX_TOTAL_STAKE,
    Math.max(effPerLine, intChips(caps?.maxTotalStake ?? ROULETTE_MAX_TOTAL_STAKE))
  )
  const c = intChips(chips)
  if (!Array.isArray(rawBets)) return { ok: false, code: 'BETS_NOT_ARRAY' }
  if (rawBets.length === 0) return { ok: false, code: 'NO_BETS' }
  if (rawBets.length > ROULETTE_MAX_BETS_PER_SPIN) return { ok: false, code: 'TOO_MANY_BETS' }

  const bets: RouletteBetNormalized[] = []
  let totalStake = 0
  for (const raw of rawBets) {
    const parsed = parseOneBet(raw, effPerLine)
    if ('error' in parsed) {
      const map: Record<string, string> = {
        INVALID_BET: 'INVALID_BET',
        INVALID_AMOUNT: 'INVALID_AMOUNT',
        BET_TOO_LOW: 'BET_TOO_LOW',
        BET_TOO_HIGH: 'BET_TOO_HIGH',
        INVALID_NUMBER: 'INVALID_NUMBER',
        INVALID_SPLIT: 'INVALID_SPLIT',
        INVALID_STREET: 'INVALID_STREET',
        INVALID_CORNER: 'INVALID_CORNER',
        INVALID_SIXLINE: 'INVALID_SIXLINE',
        INVALID_DOZEN: 'INVALID_DOZEN',
        INVALID_COLUMN: 'INVALID_COLUMN',
        UNKNOWN_BET_TYPE: 'UNKNOWN_BET_TYPE',
      }
      return { ok: false, code: map[parsed.error] ?? 'INVALID_BET' }
    }
    totalStake = intChips(totalStake + parsed.amount)
    if (totalStake > effTotal) return { ok: false, code: 'TOTAL_STAKE_TOO_HIGH' }
    bets.push(parsed)
  }
  if (totalStake > c) return { ok: false, code: 'INSUFFICIENT_CHIPS' }
  return { ok: true, bets, totalStake }
}

export type BetBreakdownItem = {
  bet: RouletteBetNormalized
  stake: number
  payout: number
}

export function resolveSpin(
  bets: RouletteBetNormalized[],
  result: number
): { breakdown: BetBreakdownItem[]; totalPayout: number; totalStake: number } {
  let totalStake = 0
  let totalPayout = 0
  const breakdown: BetBreakdownItem[] = []
  for (const bet of bets) {
    const stake = bet.amount
    totalStake = intChips(totalStake + stake)
    const payout = payoutForBet(bet, result)
    totalPayout = intChips(totalPayout + payout)
    breakdown.push({ bet, stake, payout })
  }
  return { breakdown, totalPayout, totalStake }
}
