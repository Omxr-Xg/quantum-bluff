import { execSync } from 'node:child_process'
import { prisma } from '../../config/database.js'
import {
  runSelfPlaySimulation,
  type SelfPlayMatchup,
  type SelfPlayRunResult,
} from './selfPlay.runner.js'

const ENGINE_VERSION = 'adaptive-expert-v1'
const MATCHUPS: SelfPlayMatchup[] = [
  'EXPERT_VS_EXPERT',
  'EXPERT_VS_ADAPTIVE',
  'ADAPTIVE_VS_ADAPTIVE',
]

function readGitSha(): string | null {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

export type MassSimTier = 'ci' | 'dev' | 'smoke' | 'nightly' | 'release'

/** CI = PR ; dev = laptop (~15 min) ; smoke/nightly/release = audit CTO (machine dédiée). */
const HANDS_BY_TIER: Record<MassSimTier, number> = {
  ci: 200,
  dev: 1_000,
  smoke: 100_000,
  nightly: 500_000,
  release: 1_000_000,
}

/** ~3 mains/s en self-play headless (ordre de grandeur mesuré en local). */
const ESTIMATED_HANDS_PER_SEC = 3

export function estimateMassSimDurationSec(tier: MassSimTier, handsOverride?: number): number {
  const handsPerMatchup = handsOverride ?? HANDS_BY_TIER[tier]
  const totalHands = handsPerMatchup * MATCHUPS.length
  return Math.ceil(totalHands / ESTIMATED_HANDS_PER_SEC)
}

export function formatDuration(sec: number): string {
  if (sec < 120) return `${sec}s`
  if (sec < 7200) return `${Math.round(sec / 60)} min`
  return `${(sec / 3600).toFixed(1)} h`
}

export async function runMassSimulationJob(options: {
  tier?: MassSimTier
  hands?: number
  persist?: boolean
  isBaseline?: boolean
}): Promise<SelfPlayRunResult[]> {
  const tier = options.tier ?? 'smoke'
  const hands = options.hands ?? HANDS_BY_TIER[tier]
  const gitSha = readGitSha()
  const startedAt = new Date()
  const results: SelfPlayRunResult[] = []

  const totalMatchups = MATCHUPS.length
  let matchupIndex = 0

  for (const matchup of MATCHUPS) {
    matchupIndex++
    const matchupStarted = Date.now()
    console.error(
      `[mass-sim] ${matchup} (${matchupIndex}/${totalMatchups}) — ${hands.toLocaleString()} mains…`,
    )

    const result = runSelfPlaySimulation({
      matchup,
      hands,
      onProgress: (done, total) => {
        if (done % 500 === 0 || done === total) {
          const elapsed = (Date.now() - matchupStarted) / 1000
          const rate = done > 0 ? done / elapsed : 0
          const remaining = rate > 0 ? Math.ceil((total - done) / rate) : 0
          console.error(
            `[mass-sim] ${matchup} ${done.toLocaleString()}/${total.toLocaleString()} mains` +
              ` (${rate.toFixed(1)}/s, ~${formatDuration(remaining)} restant)`,
          )
        }
      },
    })
    results.push(result)

    const matchupSec = Math.round((Date.now() - matchupStarted) / 1000)
    console.error(
      `[mass-sim] ${matchup} terminé en ${formatDuration(matchupSec)} — BB/100: ` +
        result.bots.map((b) => `${b.botId}=${b.bbPer100.toFixed(2)}`).join(', '),
    )

    if (options.persist !== false) {
      await prisma.botSimulationRun.create({
        data: {
          matchup,
          handsPlayed: result.handsPlayed,
          gitSha,
          engineVersion: ENGINE_VERSION,
          metricsJson: result,
          isBaseline: options.isBaseline ?? false,
          startedAt,
        },
      })
    }
  }

  return results
}

export async function getBotAnalyticsSummary(limit = 20) {
  const runs = await prisma.botSimulationRun.findMany({
    orderBy: { completedAt: 'desc' },
    take: limit,
  })

  const baseline = await prisma.botSimulationRun.findFirst({
    where: { isBaseline: true },
    orderBy: { completedAt: 'desc' },
  })

  return {
    runs: runs.map((r) => ({
      id: r.id,
      matchup: r.matchup,
      handsPlayed: r.handsPlayed,
      gitSha: r.gitSha,
      engineVersion: r.engineVersion,
      isBaseline: r.isBaseline,
      completedAt: r.completedAt.toISOString(),
      metrics: r.metricsJson,
    })),
    baseline: baseline
      ? {
          id: baseline.id,
          matchup: baseline.matchup,
          completedAt: baseline.completedAt.toISOString(),
          metrics: baseline.metricsJson,
        }
      : null,
  }
}
