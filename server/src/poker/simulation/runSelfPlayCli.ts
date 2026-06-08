import { runSelfPlaySimulation, type SelfPlayMatchup } from './selfPlay.runner.js'

const args = process.argv.slice(2)
const matchup = (args.find((a) => a.startsWith('--matchup='))?.split('=')[1] ??
  'EXPERT_VS_EXPERT') as SelfPlayMatchup
const hands = Number(args.find((a) => a.startsWith('--hands='))?.split('=')[1] ?? 5000)

const result = runSelfPlaySimulation({ matchup, hands })
console.log(JSON.stringify(result, null, 2))
