import { performance } from 'node:perf_hooks'
import {
  heroEquityVsRange,
  narrowOpponentRange,
  seedOpponentRange,
} from '../services/opponentRange.service.js'
import type { Card } from '../../types/poker.js'

const c = (rank: Card['rank'], suit: Card['suit'] = 'HEARTS'): Card => ({
  rank,
  suit,
  value: { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14 }[rank] as number,
})

const hero: Card[] = [c('A'), c('K')]
const board: Card[] = [c('2'), c('7'), c('J')]
const tendency = {
  vpip: 0.38,
  pfr: 0.16,
  bluffRaiseRate: 0.3,
  foldToRaiseRate: 0.5,
  styleTag: 'AGGRESSIVE',
  confidence: 'HIGH' as const,
}

const N = 200
const seedTimes: number[] = []
const narrowTimes: number[] = []
const equityTimes: number[] = []

for (let i = 0; i < N; i++) {
  let t0 = performance.now()
  const range = seedOpponentRange([...hero, ...board], tendency)
  seedTimes.push(performance.now() - t0)

  t0 = performance.now()
  const narrowed = narrowOpponentRange(range, 'RAISE', 2800, 'FLOP')
  narrowTimes.push(performance.now() - t0)

  t0 = performance.now()
  heroEquityVsRange(hero, board, narrowed)
  equityTimes.push(performance.now() - t0)
}

function stats(arr: number[]) {
  const sorted = [...arr].sort((a, b) => a - b)
  const n = sorted.length
  return {
    avgMs: Number((arr.reduce((s, t) => s + t, 0) / n).toFixed(3)),
    p95Ms: Number(sorted[Math.floor(n * 0.95)]!.toFixed(3)),
    comboCount: seedOpponentRange([...hero, ...board], tendency).holes.length,
  }
}

console.log(
  JSON.stringify(
    {
      samples: N,
      seed: stats(seedTimes),
      narrow: stats(narrowTimes),
      equity: stats(equityTimes),
      totalPipelineP95Ms: Number(
        (
          seedTimes.sort((a, b) => a - b)[Math.floor(N * 0.95)]! +
          narrowTimes.sort((a, b) => a - b)[Math.floor(N * 0.95)]! +
          equityTimes.sort((a, b) => a - b)[Math.floor(N * 0.95)]!
        ).toFixed(3),
      ),
      targetMs: 100,
    },
    null,
    2,
  ),
)
