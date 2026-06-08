/** Aligné sur server/src/logic/wheel.ts */
export const WHEEL_MIN_BET = 10
export const WHEEL_MAX_BET = 500
export const WHEEL_BET_STEP = 10
export const WHEEL_BET_PRESETS = [10, 50, 100, 250, 500] as const
export const WHEEL_SEGMENT_COUNT = 12
export const WHEEL_SLICE_DEG = 360 / WHEEL_SEGMENT_COUNT

export type WheelSegmentDef = {
  kind: string
  multiplier: number
  label: string
  color: string
  textColor: string
}

export const WHEEL_SEGMENTS: readonly WheelSegmentDef[] = [
  { kind: 'x0', multiplier: 0, label: 'x0', color: '#7f1d1d', textColor: '#fecaca' },
  { kind: 'x0', multiplier: 0, label: 'x0', color: '#991b1b', textColor: '#fecaca' },
  { kind: 'x0', multiplier: 0, label: 'x0', color: '#7f1d1d', textColor: '#fecaca' },
  { kind: 'x0_5', multiplier: 0.5, label: 'x0.5', color: '#c2410c', textColor: '#ffedd5' },
  { kind: 'x0_5', multiplier: 0.5, label: 'x0.5', color: '#ea580c', textColor: '#fff7ed' },
  { kind: 'x1', multiplier: 1, label: 'x1', color: '#1e3a8a', textColor: '#dbeafe' },
  { kind: 'x1', multiplier: 1, label: 'x1', color: '#1d4ed8', textColor: '#eff6ff' },
  { kind: 'x1_5', multiplier: 1.5, label: 'x1.5', color: '#6d28d9', textColor: '#ede9fe' },
  { kind: 'x2', multiplier: 2, label: 'x2', color: '#7c3aed', textColor: '#f5f3ff' },
  { kind: 'x3', multiplier: 3, label: 'x3', color: '#a855f7', textColor: '#faf5ff' },
  { kind: 'x5', multiplier: 5, label: 'x5', color: '#db2777', textColor: '#fdf2f8' },
  { kind: 'jackpot', multiplier: 20, label: 'JACKPOT', color: '#ca8a04', textColor: '#fef9c3' },
] as const

/** Centre du segment `index` en degrés horaires depuis le pointeur (12 h). */
export function wheelSegmentCenterDeg(index: number): number {
  return index * WHEEL_SLICE_DEG + WHEEL_SLICE_DEG / 2
}

/** Index du segment sous le pointeur fixe en haut, pour une rotation horaire `rotationDeg`. */
export function wheelSegmentIndexAtPointer(rotationDeg: number): number {
  const normalized = ((rotationDeg % 360) + 360) % 360
  const clockwiseFromTop = (360 - normalized) % 360
  const index = Math.floor(clockwiseFromTop / WHEEL_SLICE_DEG) % WHEEL_SEGMENT_COUNT
  return index
}

/**
 * Incrément de rotation pour atterrir sur le segment visé, en tenant compte de la
 * position actuelle (le serveur envoie `finalAngle` comme si la roue était à 0°).
 */
export function computeWheelSpinDeltaFromFinalAngle(
  currentRotationDeg: number,
  finalAngle: number,
): number {
  const targetMod = ((finalAngle % 360) + 360) % 360
  const currentMod = ((currentRotationDeg % 360) + 360) % 360
  let delta = targetMod - currentMod
  if (delta <= 0) delta += 360
  const fullRotations = finalAngle - targetMod
  return fullRotations + delta
}

export function wheelSegmentLabelPosition(index: number): { left: string; top: string } {
  const clockwiseFromTop = wheelSegmentCenterDeg(index)
  const angleDeg = 90 - clockwiseFromTop
  const angleRad = (angleDeg * Math.PI) / 180
  const radiusPct = 36
  const x = 50 + radiusPct * Math.cos(angleRad)
  const y = 50 + radiusPct * Math.sin(angleRad)
  return { left: `${x}%`, top: `${y}%` }
}

export function clampBet(value: number, balance: number): number {
  const stepped = Math.round(value / WHEEL_BET_STEP) * WHEEL_BET_STEP
  return Math.min(WHEEL_MAX_BET, balance, Math.max(WHEEL_MIN_BET, stepped))
}

export function historyBadgeClass(multiplier: number, label?: string): string {
  if (label === 'JACKPOT' || multiplier >= 20) {
    return 'border-amber-300/55 bg-amber-950/60 text-amber-100 shadow-[0_0_14px_rgba(251,191,36,0.35)]'
  }
  if (multiplier <= 0) return 'border-red-400/40 bg-red-950/50 text-red-200'
  if (multiplier < 1) return 'border-orange-400/40 bg-orange-950/50 text-orange-200'
  if (multiplier < 2) return 'border-blue-400/35 bg-blue-950/45 text-blue-200'
  if (multiplier < 10) return 'border-violet-400/40 bg-violet-950/50 text-violet-200'
  return 'border-amber-300/50 bg-amber-950/55 text-amber-100'
}

export function buildWheelConicGradient(): string {
  const stops = WHEEL_SEGMENTS.map((seg, i) => {
    const start = i * WHEEL_SLICE_DEG
    const end = (i + 1) * WHEEL_SLICE_DEG
    return `${seg.color} ${start}deg ${end}deg`
  })
  return `conic-gradient(from -90deg, ${stops.join(', ')})`
}

export function segmentLabelRotation(index: number): number {
  return index * WHEEL_SLICE_DEG + WHEEL_SLICE_DEG / 2 - 90
}
