/**
 * Headless Belote benchmark — HEURISTIC vs HEURISTIC / RANDOM.
 * Usage: npx tsx scripts/belote-benchmark.ts [--games=10000] [--matchup=HEURISTIC_VS_RANDOM] [--variant=CONTEE]
 */
import { randomUUID } from 'crypto'
import { BeloteTableController } from '../server/src/logic/belote/BeloteTableController.js'
import type { BeloteGameVariant } from '../server/src/logic/belote/types.js'
import { makeBeloteBotId } from '../server/src/shared/beloteBots.js'
import {
  getLegalActions,
  legalActionToBeloteAction,
  type BeloteLegalAction,
} from '../server/src/belote/services/beloteLegalEngine.js'
import {
  heuristicDecision,
  randomLegalDecision,
  type BeloteBotDecision,
} from '../server/src/belote/services/beloteBotHeuristic.js'

const BENCHMARK_SCALES = [10_000, 50_000, 100_000] as const

type Matchup = 'HEURISTIC_VS_HEURISTIC' | 'HEURISTIC_VS_RANDOM' | 'NEURAL_VS_HEURISTIC'

function parseArgs() {
  const args = process.argv.slice(2)
  let games = 10_000
  let matchup: Matchup = 'HEURISTIC_VS_RANDOM'
  let variant: BeloteGameVariant = 'CONTEE'
  for (const a of args) {
    if (a.startsWith('--games=')) games = Number(a.split('=')[1]) || games
    if (a.startsWith('--matchup=')) matchup = a.split('=')[1] as Matchup
    if (a.startsWith('--variant=')) variant = a.split('=')[1] as BeloteGameVariant
  }
  return { games, matchup, variant }
}

function pickDecision(
  table: BeloteTableController,
  playerId: string,
  teamIndex: 0 | 1,
  matchup: Matchup,
) {
  const legal = getLegalActions(table, playerId)
  if (legal.length === 0) return null
  if (matchup === 'HEURISTIC_VS_RANDOM') {
    return teamIndex === 0
      ? heuristicDecision(table, playerId, legal)
      : randomLegalDecision(legal)
  }
  return heuristicDecision(table, playerId, legal)
}

function applyHeadlessDecision(
  table: BeloteTableController,
  playerId: string,
  decision: BeloteBotDecision,
): { ok: boolean; illegal: boolean } {
  let result = table.applyAction(playerId, legalActionToBeloteAction(decision.action))
  if (result.ok) return { ok: true, illegal: false }

  const legal = getLegalActions(table, playerId)
  const fallback: BeloteLegalAction | undefined =
    legal.find((a) => a.type === 'PASS') ?? legal[0]
  if (!fallback) return { ok: false, illegal: true }

  result = table.applyAction(playerId, legalActionToBeloteAction(fallback))
  return { ok: result.ok, illegal: true }
}

function runSingleGame(variant: BeloteGameVariant, matchup: Matchup) {
  const table = new BeloteTableController({
    gameId: randomUUID(),
    roomId: 'bench',
    targetScore: 200,
    buyIn: 0,
    variant,
    players: [0, 1, 2, 3].map((position) => ({
      userId: makeBeloteBotId(),
      username: `B${position}`,
      position,
      isBot: true,
    })),
  })

  let illegal = 0
  let decisions = 0
  let decisionMs = 0
  let steps = 0

  while (table.getState().phase !== 'GAME_END' && steps++ < 800) {
    const s = table.getState()
    if (s.phase === 'DEAL_END') {
      table.startNextDeal()
      continue
    }

    const pos =
      s.phase === 'PLAYING' ? s.deal.currentPlayerPosition : s.biddingTurnPosition
    const player = s.players.find((p) => p.position === pos)
    if (!player) break

    const teamIndex = (player.position % 2) as 0 | 1
    const start = Date.now()
    const decision = pickDecision(table, player.userId, teamIndex, matchup)
    if (!decision) break
    decisionMs += Date.now() - start
    decisions++

    const applied = applyHeadlessDecision(table, player.userId, decision)
    if (applied.illegal) illegal++
    if (!applied.ok) break
  }

  const st = table.getState()
  const winner = st.teamScoreA >= st.teamScoreB ? 'A' : 'B'
  return {
    winner,
    scoreA: st.teamScoreA,
    scoreB: st.teamScoreB,
    illegal,
    avgDecisionMs: decisions > 0 ? decisionMs / decisions : 0,
  }
}

async function main() {
  const { games, matchup, variant } = parseArgs()
  if (!BENCHMARK_SCALES.includes(games as (typeof BENCHMARK_SCALES)[number])) {
    console.warn(`games=${games} (allowed: ${BENCHMARK_SCALES.join(', ')})`)
  }

  const startedAt = new Date()
  let teamAWins = 0
  let teamBWins = 0
  let sumA = 0
  let sumB = 0
  let illegalActions = 0
  let totalDecisionMs = 0
  let decisionCount = 0

  for (let i = 0; i < games; i++) {
    const r = runSingleGame(variant, matchup)
    if (r.winner === 'A') teamAWins++
    else teamBWins++
    sumA += r.scoreA
    sumB += r.scoreB
    illegalActions += r.illegal
    totalDecisionMs += r.avgDecisionMs
    decisionCount++
    if ((i + 1) % 1000 === 0) console.log(`progress ${i + 1}/${games}`)
  }

  const finishedAt = new Date()
  const summary = {
    matchup,
    variant,
    gamesPlayed: games,
    teamAWins,
    teamBWins,
    avgScoreA: sumA / games,
    avgScoreB: sumB / games,
    illegalActions,
    avgDecisionMs: decisionCount > 0 ? totalDecisionMs / decisionCount : 0,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
  }

  console.log(JSON.stringify(summary, null, 2))

  try {
    const { prisma } = await import('../server/src/config/database.js')
    await prisma.beloteBenchmarkRun.create({
      data: {
        id: randomUUID(),
        matchup,
        variant,
        gamesPlayed: games,
        teamAWins,
        teamBWins,
        avgScoreA: summary.avgScoreA,
        avgScoreB: summary.avgScoreB,
        illegalActions,
        avgDecisionMs: summary.avgDecisionMs,
        startedAt,
        finishedAt,
      },
    })
    await prisma.$disconnect()
  } catch {
    console.warn('DB persist skipped (no DATABASE_URL or prisma error)')
  }
}

void main()
