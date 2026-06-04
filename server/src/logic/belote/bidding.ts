import type { BeloteTeam } from './types.js'

export function teamForPosition(position: number): BeloteTeam {
  return position % 2 === 0 ? 'A' : 'B'
}

export function nextPosition(current: number, n = 4): number {
  return (current + 1) % n
}
