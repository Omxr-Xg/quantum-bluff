import { intChips } from '../utils/chips.js'

export const MINES_GRID_SIZE = 25
export const MINES_GRID_COLS = 5
export const MINES_MIN_BET = 10
export const MINES_MAX_BET = 500
export const MINES_BET_STEP = 10
export const MINES_HOUSE_EDGE = 0.04
export const MINES_MINE_OPTIONS = [1, 3, 5, 10, 15, 20] as const
export const MINES_DEFAULT_MINE_COUNT = 5

export type MinesMineCount = (typeof MINES_MINE_OPTIONS)[number]

export type MinesBetValidation =
  | { ok: true; bet: number }
  | { ok: false; code: 'INVALID_BET' | 'BET_TOO_LOW' | 'BET_TOO_HIGH' | 'BET_STEP' | 'INSUFFICIENT_CHIPS' }

export type MinesMineCountValidation =
  | { ok: true; mineCount: MinesMineCount }
  | { ok: false; code: 'INVALID_MINE_COUNT' }

export type MinesCellValidation =
  | { ok: true; cell: number }
  | { ok: false; code: 'INVALID_CELL' }

export function validateMinesBet(
  rawBet: unknown,
  chips: number,
  maxBet: number = MINES_MAX_BET,
): MinesBetValidation {
  const betInput = typeof rawBet === 'number' ? rawBet : Number(rawBet)
  if (!Number.isFinite(betInput)) return { ok: false, code: 'INVALID_BET' }
  const bet = intChips(betInput)
  if (bet < MINES_MIN_BET) return { ok: false, code: 'BET_TOO_LOW' }
  if (bet > maxBet) return { ok: false, code: 'BET_TOO_HIGH' }
  if (bet % MINES_BET_STEP !== 0) return { ok: false, code: 'BET_STEP' }
  if (chips < bet) return { ok: false, code: 'INSUFFICIENT_CHIPS' }
  return { ok: true, bet }
}

export function validateMineCount(rawMineCount: unknown): MinesMineCountValidation {
  const value = typeof rawMineCount === 'number' ? rawMineCount : Number(rawMineCount)
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    return { ok: false, code: 'INVALID_MINE_COUNT' }
  }
  if (!(MINES_MINE_OPTIONS as readonly number[]).includes(value)) {
    return { ok: false, code: 'INVALID_MINE_COUNT' }
  }
  return { ok: true, mineCount: value as MinesMineCount }
}

export function validateMinesCell(rawCell: unknown): MinesCellValidation {
  const value = typeof rawCell === 'number' ? rawCell : Number(rawCell)
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    return { ok: false, code: 'INVALID_CELL' }
  }
  if (value < 0 || value >= MINES_GRID_SIZE) {
    return { ok: false, code: 'INVALID_CELL' }
  }
  return { ok: true, cell: value }
}

export function maxSafeReveals(mineCount: number): number {
  return MINES_GRID_SIZE - mineCount
}

/** Multiplicateur après k révélations sûres (2 décimales). */
export function multiplierForSafeReveals(mineCount: number, revealCount: number): number {
  if (revealCount <= 0) return 1
  let mult = 1
  for (let i = 0; i < revealCount; i++) {
    const remaining = MINES_GRID_SIZE - i
    const safeRemaining = MINES_GRID_SIZE - mineCount - i
    mult = Math.floor(mult * (remaining / safeRemaining) * (1 - MINES_HOUSE_EDGE) * 100) / 100
  }
  return mult
}

export function computeMinesPayout(bet: number, multiplier: number): number {
  return intChips(Math.floor(bet * multiplier))
}

/** Positions des mines (indices 0..24), générées côté serveur uniquement. */
export function generateMinePositions(
  mineCount: number,
  randomUnit: () => number,
  gridSize: number = MINES_GRID_SIZE,
): number[] {
  const indices = Array.from({ length: gridSize }, (_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(randomUnit() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return indices.slice(0, mineCount).sort((a, b) => a - b)
}

export function isMineCell(minePositions: readonly number[], cell: number): boolean {
  return minePositions.includes(cell)
}
