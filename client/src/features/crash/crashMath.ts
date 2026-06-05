/** Aligné sur server/src/logic/crash.ts */
export const CRASH_GROWTH_RATE = 0.21
export const CRASH_MIN_BET = 10
export const CRASH_MAX_BET = 500
export const CRASH_BET_STEP = 10
export const CRASH_BET_PRESETS = [10, 50, 100, 250, 500] as const

export function multiplierAtElapsedMs(elapsedMs: number): number {
  const t = Math.max(0, elapsedMs) / 1000
  if (t <= 0) return 1
  const m = Math.exp(CRASH_GROWTH_RATE * t)
  return Math.floor(m * 100) / 100
}

export function clampBet(value: number, balance: number): number {
  const stepped = Math.round(value / CRASH_BET_STEP) * CRASH_BET_STEP
  return Math.min(CRASH_MAX_BET, balance, Math.max(CRASH_MIN_BET, stepped))
}

export function historyBadgeClass(mult: number): string {
  if (mult < 1.5) return 'border-red-400/40 bg-red-950/50 text-red-200 shadow-[0_0_12px_rgba(248,113,113,0.2)]'
  if (mult < 3) return 'border-orange-400/40 bg-orange-950/50 text-orange-200 shadow-[0_0_12px_rgba(251,146,60,0.2)]'
  if (mult < 10) return 'border-violet-400/40 bg-violet-950/50 text-violet-200 shadow-[0_0_12px_rgba(167,139,250,0.2)]'
  return 'border-amber-300/50 bg-amber-950/55 text-amber-100 shadow-[0_0_14px_rgba(251,191,36,0.28)]'
}

export function multiplierColorClass(mult: number, phase: 'ready' | 'running' | 'cashed_out' | 'crashed'): string {
  if (phase === 'crashed') return 'text-red-400'
  if (phase === 'cashed_out') return 'text-emerald-300'
  if (phase === 'ready') return 'text-orange-200/80'
  if (mult < 1.5) return 'text-orange-300'
  if (mult < 3) return 'text-orange-400'
  if (mult < 6) return 'text-rose-400'
  return 'text-fuchsia-300'
}

/** Points normalisés pour la courbe SVG (y = 1 - e^(-t)). */
export function buildCurvePoints(elapsedMs: number, width: number, height: number, maxPoints = 48): string {
  const maxT = Math.max(3, elapsedMs / 1000)
  const coords: string[] = []
  for (let i = 0; i <= maxPoints; i++) {
    const t = (i / maxPoints) * maxT
    const yNorm = 1 - Math.exp(-t * 0.85)
    const x = (t / maxT) * width
    const y = height - yNorm * height * 0.88 - height * 0.06
    coords.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  return coords.join(' ')
}
