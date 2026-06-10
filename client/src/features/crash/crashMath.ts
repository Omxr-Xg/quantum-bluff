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

/** Décalage horaire serveur ↔ client (ms). */
export function serverOffsetFromSample(serverNowMs: number, nowLocal = Date.now()): number {
  return serverNowMs - nowLocal
}

/**
 * Multiplicateur affiché : startedAt fixe (serveur) + horloge synchronisée.
 * Ne jamais recaler startedAt après le démarrage — seul l’offset bouge.
 */
export function multiplierFromStartedAt(
  startedAtMs: number,
  serverOffsetMs: number,
  nowLocal = Date.now(),
): number {
  const elapsedMs = Math.max(0, nowLocal + serverOffsetMs - startedAtMs)
  return multiplierAtElapsedMs(elapsedMs)
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

/** Point de crash visuel pour les rounds spectateur (sans mise). */
export function generateDemoCrashPoint(): number {
  const r = Math.random()
  let min: number
  let max: number
  if (r < 0.7) {
    min = 1.01
    max = 2
  } else if (r < 0.9) {
    min = 2
    max = 5
  } else if (r < 0.98) {
    min = 5
    max = 10
  } else {
    min = 10
    max = 50
  }
  const raw = min + Math.random() * (max - min)
  return Math.floor(raw * 100) / 100
}
