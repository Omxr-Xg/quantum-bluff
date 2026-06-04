import { randomInt as cryptoRandomInt } from 'node:crypto'

export const RNG_VERSION = 'rng-v1'

export type RngGameType = 'roulette' | 'slot' | 'blackjack' | 'poker' | 'belote'

export interface RngDrawMeta {
  roundId: string
  gameType: RngGameType
  source: string
  generatedAt: string
  rngVersion: string
}

export interface RngDrawResult {
  value: number
  meta: RngDrawMeta
}

export function drawInt(
  gameType: RngGameType,
  roundId: string,
  source: string,
  minInclusive: number,
  maxInclusive: number
): RngDrawResult {
  const value = cryptoRandomInt(minInclusive, maxInclusive + 1)
  return {
    value,
    meta: {
      roundId,
      gameType,
      source,
      generatedAt: new Date().toISOString(),
      rngVersion: RNG_VERSION,
    },
  }
}

export function randomIntForRound(
  gameType: RngGameType,
  roundId: string,
  source: string
): (minInclusive: number, maxInclusive: number) => number {
  return (minInclusive, maxInclusive) =>
    drawInt(gameType, roundId, source, minInclusive, maxInclusive).value
}

export function shuffleInPlace<T>(
  arr: T[],
  gameType: RngGameType,
  roundId: string,
  source: string
): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = drawInt(gameType, roundId, source, 0, i).value
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
}

