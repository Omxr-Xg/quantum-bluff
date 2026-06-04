import type { BeloteTeam } from './types.js'

export function teamForPosition(position: number): BeloteTeam {
  return position % 2 === 0 ? 'A' : 'B'
}

export function nextPosition(current: number, n = 4): number {
  return (current + 1) % n
}

/** Les deux positions d'une équipe (0/2 = A, 1/3 = B). */
export function positionsForTeam(team: BeloteTeam): [number, number] {
  return team === 'A' ? [0, 2] : [1, 3]
}

/** Prochain joueur du même camp (partenaire). */
export function nextPositionOnTeam(current: number, team: BeloteTeam): number {
  const [a, b] = positionsForTeam(team)
  return current === a ? b : a
}
