import { performance } from 'node:perf_hooks'
import { expertOracleDecision } from '../../logic/botAI.js'
import type { Card } from '../../types/poker.js'

const c = (rank: Card['rank'], suit: Card['suit'] = 'HEARTS'): Card => ({
  rank,
  suit,
  value: { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14 }[rank] as number,
})

const req = {
  playerCards: [c('A'), c('K', 'SPADES')],
  communityCards: [c('2'), c('7'), c('J')],
  difficulty: 'expert' as const,
  currentBet: 100,
  playerChips: 1000,
  callAmount: 100,
  minRaise: 100,
  potSize: 450,
  position: 1,
  playersCount: 2,
}

const ctx = {
  opponentHoleCards: [[c('Q'), c('Q')]],
  playerTendency: {
    vpip: 0.4,
    pfr: 0.2,
    bluffRaiseRate: 0.35,
    foldToRaiseRate: 0.45,
    styleTag: 'AGGRESSIVE',
    confidence: 'HIGH' as const,
    styleScores: { aggressive: 70, tight: 15, callingStation: 15 },
  },
}

const N = 500
const times: number[] = []

for (let i = 0; i < N; i++) {
  const t0 = performance.now()
  expertOracleDecision(req, ctx)
  times.push(performance.now() - t0)
}

times.sort((a, b) => a - b)
const p50 = times[Math.floor(N * 0.5)]!
const p95 = times[Math.floor(N * 0.95)]!
const p99 = times[Math.floor(N * 0.99)]!
const avg = times.reduce((s, t) => s + t, 0) / N

console.log(
  JSON.stringify(
    {
      samples: N,
      avgMs: Number(avg.toFixed(3)),
      p50Ms: Number(p50.toFixed(3)),
      p95Ms: Number(p95.toFixed(3)),
      p99Ms: Number(p99.toFixed(3)),
      targetMs: 100,
      passP95: p95 < 100,
    },
    null,
    2,
  ),
)
