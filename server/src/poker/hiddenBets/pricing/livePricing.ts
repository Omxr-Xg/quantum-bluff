import type { WinningHandClassKey } from '../types.js'
import { oddsWinningHandClass } from './pricingTables.js'

/** Cotes LIVE — heuristiques tabulaires distantes du PRE (hidden-bets-live-v1). */
export function oddsPlayerWinsCurrentHand(numActivePlayers: number): number {
  const n = Math.min(Math.max(numActivePlayers, 2), 9)
  const table: Record<number, number> = {
    2: 1.9,
    3: 2.2,
    4: 2.6,
    5: 3.0,
    6: 3.4,
    7: 3.8,
    8: 4.2,
    9: 4.6,
  }
  return table[n] ?? 2.6
}

export function oddsHandReachesShowdown(numActivePlayers: number): number {
  const n = Math.min(Math.max(numActivePlayers, 2), 9)
  const table: Record<number, number> = {
    2: 1.5,
    3: 1.8,
    4: 2.0,
    5: 2.2,
    6: 2.4,
    7: 2.6,
    8: 2.8,
    9: 3.0,
  }
  return table[n] ?? 2.0
}

export function oddsHandEndsByFold(numActivePlayers: number): number {
  const n = Math.min(Math.max(numActivePlayers, 2), 9)
  const table: Record<number, number> = {
    2: 2.1,
    3: 2.4,
    4: 2.7,
    5: 3.0,
    6: 3.2,
    7: 3.4,
    8: 3.6,
    9: 3.8,
  }
  return table[n] ?? 2.7
}

/** Même grille de classe que PRE mais facteur léger appliqué. */
export function oddsFinalWinningHandClass(cls: WinningHandClassKey): number {
  return Math.max(1.1, oddsWinningHandClass(cls) * 0.92)
}
