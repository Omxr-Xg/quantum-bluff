/**
 * Audit CTO — validation statistique, performance, robustesse (local).
 * Usage: tsx src/poker/simulation/runCtoAudit.ts [--hands=2000] [--matchup=EXPERT_VS_ADAPTIVE]
 */
import { performance } from 'node:perf_hooks'
import { runSelfPlaySimulation, type SelfPlayMatchup } from './selfPlay.runner.js'
import { expertOracleDecision, applyTendencyFoldThreshold } from '../../logic/botAI.js'
import {
  heroEquityVsRange,
  narrowOpponentRange,
  seedOpponentRange,
} from '../services/opponentRange.service.js'
import type { Card } from '../../types/poker.js'

const args = process.argv.slice(2)
const hands = Number(args.find((a) => a.startsWith('--hands='))?.split('=')[1] ?? 2000)
const matchup = (args.find((a) => a.startsWith('--matchup='))?.split('=')[1] ??
  'EXPERT_VS_ADAPTIVE') as SelfPlayMatchup

const c = (rank: Card['rank'], suit: Card['suit'] = 'HEARTS'): Card => ({
  rank,
  suit,
  value: { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14 }[rank] as number,
})

function benchOracle(samples = 300) {
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
  const times: number[] = []
  for (let i = 0; i < samples; i++) {
    const t0 = performance.now()
    expertOracleDecision(req, { opponentHoleCards: [[c('Q'), c('Q')]] })
    times.push(performance.now() - t0)
  }
  times.sort((a, b) => a - b)
  return {
    p50Ms: times[Math.floor(samples * 0.5)]!,
    p95Ms: times[Math.floor(samples * 0.95)]!,
    targetMs: 100,
    pass: times[Math.floor(samples * 0.95)]! < 100,
  }
}

function benchRange(samples = 100) {
  const hero = [c('A'), c('K')]
  const board = [c('2'), c('7'), c('J')]
  const times: number[] = []
  for (let i = 0; i < samples; i++) {
    const t0 = performance.now()
    const range = seedOpponentRange([...hero, ...board])
    const narrowed = narrowOpponentRange(range, 'RAISE', 2800, 'FLOP')
    heroEquityVsRange(hero, board, narrowed)
    times.push(performance.now() - t0)
  }
  times.sort((a, b) => a - b)
  return {
    p95Ms: times[Math.floor(samples * 0.95)]!,
    combos: seedOpponentRange([...hero, ...board]).holes.length,
    targetMs: 100,
    pass: times[Math.floor(samples * 0.95)]! < 100,
  }
}

const t0 = performance.now()
const selfPlay = runSelfPlaySimulation({ matchup, hands, startingChips: 10_000 })
const selfPlayMs = performance.now() - t0

const report = {
  auditAt: new Date().toISOString(),
  statisticalValidation: {
    note: 'Audit local — lancer smoke/nightly/release (100k–1M) sur machine dédiée ou CI nightly',
    sample: { matchup, hands, durationSec: Number((selfPlayMs / 1000).toFixed(2)) },
    result: selfPlay,
    adaptiveEvCheck:
      matchup === 'EXPERT_VS_ADAPTIVE'
        ? {
            expertBb100: selfPlay.bots.find((b) => b.botId === 'qb-bot-1')?.bbPer100,
            adaptiveBb100: selfPlay.bots.find((b) => b.botId === 'qb-bot-2')?.bbPer100,
          }
        : null,
  },
  performance: {
    oracleDecision: benchOracle(),
    rangePipeline: benchRange(),
    selfPlayHandsPerSec: Number((selfPlay.handsPlayed / (selfPlayMs / 1000)).toFixed(2)),
  },
  productionRobustness: {
    nullProfileFoldThreshold: applyTendencyFoldThreshold(null),
    lowConfidenceNoAdjust: applyTendencyFoldThreshold({
      vpip: 0.5,
      pfr: 0.3,
      bluffRaiseRate: 0.5,
      foldToRaiseRate: 0.2,
      styleTag: 'AGGRESSIVE',
      confidence: 'LOW',
    }),
    selfPlayCompletedWithoutCrash: true,
  },
}

console.log(JSON.stringify(report, null, 2))
