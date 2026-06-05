/** Aligné sur server/src/logic/mines.ts */
export const MINES_GRID_SIZE = 25
export const MINES_GRID_COLS = 5
export const MINES_MIN_BET = 10
export const MINES_MAX_BET = 500
export const MINES_BET_STEP = 10
export const MINES_HOUSE_EDGE = 0.04
export const MINES_MINE_OPTIONS = [1, 3, 5, 10, 15, 20] as const
export const MINES_DEFAULT_MINE_COUNT = 5
export const MINES_BET_PRESETS = [10, 50, 100, 250, 500] as const

export type CellState = "hidden" | "safe" | "mine"

export function clampBet(value: number, balance: number): number {
  const stepped = Math.round(value / MINES_BET_STEP) * MINES_BET_STEP
  return Math.min(MINES_MAX_BET, balance, Math.max(MINES_MIN_BET, stepped))
}

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

export function historyBadgeClass(mult: number): string {
  if (mult < 2) return "border-red-400/40 bg-red-950/50 text-red-200 shadow-[0_0_12px_rgba(248,113,113,0.2)]"
  if (mult < 5) return "border-orange-400/40 bg-orange-950/50 text-orange-200 shadow-[0_0_12px_rgba(251,146,60,0.2)]"
  if (mult < 10) return "border-violet-400/40 bg-violet-950/50 text-violet-200 shadow-[0_0_12px_rgba(167,139,250,0.2)]"
  return "border-amber-300/50 bg-amber-950/55 text-amber-100 shadow-[0_0_14px_rgba(251,191,36,0.28)]"
}

export function multiplierGlowClass(mult: number): string {
  if (mult < 2) return "text-emerald-300"
  if (mult < 5) return "text-teal-300"
  if (mult < 10) return "text-cyan-200"
  return "text-amber-200"
}
