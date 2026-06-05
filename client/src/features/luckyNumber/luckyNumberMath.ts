/** Aligné sur server/src/logic/luckyNumber.ts */
export const LUCKY_NUMBER_MIN_BET = 10
export const LUCKY_NUMBER_MAX_BET = 500
export const LUCKY_NUMBER_BET_STEP = 10
export const LUCKY_NUMBER_BET_PRESETS = [10, 50, 100, 250, 500] as const
export const LUCKY_NUMBER_MIN = 1
export const LUCKY_NUMBER_MAX = 10
export const LUCKY_NUMBER_WIN_MULTIPLIER = 8
export const LUCKY_NUMBER_DRAW_MS = 2000

export const LUCKY_NUMBER_CHOICES = Array.from(
  { length: LUCKY_NUMBER_MAX },
  (_, i) => i + 1,
) as readonly number[]

export function clampBet(value: number, balance: number): number {
  const stepped = Math.round(value / LUCKY_NUMBER_BET_STEP) * LUCKY_NUMBER_BET_STEP
  return Math.min(LUCKY_NUMBER_MAX_BET, balance, Math.max(LUCKY_NUMBER_MIN_BET, stepped))
}

export function historyBadgeClass(win: boolean): string {
  return win
    ? 'border-amber-300/55 bg-emerald-950/55 text-amber-100 shadow-[0_0_12px_rgba(250,204,21,0.25)]'
    : 'border-red-900/50 bg-red-950/65 text-red-200'
}

/** Animation de tirage : défilement rapide puis ralentissement jusqu'au résultat serveur. */
export function runLuckyNumberDrawAnimation(
  finalNumber: number,
  onTick: (n: number) => void,
  durationMs = LUCKY_NUMBER_DRAW_MS,
): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now()
    let lastShown = -1

    const tick = (now: number) => {
      const elapsed = now - start
      const t = Math.min(1, elapsed / durationMs)
      const eased = 1 - (1 - t) ** 3

      if (t < 1) {
        const intervalMs = 35 + eased * 280
        const frame = Math.floor(elapsed / intervalMs)
        if (frame !== lastShown) {
          lastShown = frame
          onTick(Math.floor(Math.random() * LUCKY_NUMBER_MAX) + 1)
        }
        requestAnimationFrame(tick)
        return
      }

      onTick(finalNumber)
      resolve()
    }

    requestAnimationFrame(tick)
  })
}
