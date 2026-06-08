import {
  estimateMassSimDurationSec,
  formatDuration,
  runMassSimulationJob,
  type MassSimTier,
} from './massSim.job.js'

const VALID: MassSimTier[] = ['ci', 'dev', 'smoke', 'nightly', 'release']
const rawTier = process.argv.find((a) => a.startsWith('--tier='))?.split('=')[1] ?? 'smoke'
const tier = (VALID.includes(rawTier as MassSimTier) ? rawTier : 'smoke') as MassSimTier

const etaSec = estimateMassSimDurationSec(tier)
console.error(
  `[mass-sim] tier=${tier} — 3 matchups, durée estimée ~${formatDuration(etaSec)}` +
    ' (Ctrl+C pour annuler). En local, préférer --tier=dev (~15 min).',
)

const results = await runMassSimulationJob({ tier, persist: true })
console.log(JSON.stringify({ tier, results }, null, 2))
