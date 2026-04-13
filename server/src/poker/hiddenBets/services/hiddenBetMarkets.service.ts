import type { HiddenBetMarketPhase } from '../types.js'

export type MarketDefinition = {
  marketKey: string
  labelFr: string
  params: { name: string; type: 'playerId' | 'class' | 'rank' | 'none' }[]
  phases: HiddenBetMarketPhase[]
}

const PRE: HiddenBetMarketPhase[] = ['PRE_HAND']
const LIVE_ALL: HiddenBetMarketPhase[] = ['LIVE_FLOP', 'LIVE_TURN', 'LIVE_RIVER']

const CATALOG: MarketDefinition[] = [
  {
    marketKey: 'PLAYER_WINS',
    labelFr: 'Gagnant (prochaine main)',
    params: [{ name: 'playerId', type: 'playerId' }],
    phases: PRE,
  },
  {
    marketKey: 'WINNING_HAND_CLASS',
    labelFr: 'Classe de la main gagnante',
    params: [{ name: 'class', type: 'class' }],
    phases: PRE,
  },
  {
    marketKey: 'WINNING_HAND_CONTAINS_RANK',
    labelFr: 'Rang dans la main gagnante',
    params: [{ name: 'rank', type: 'rank' }],
    phases: PRE,
  },
  {
    marketKey: 'PLAYER_WINS_CURRENT_HAND',
    labelFr: 'Gagnant (main en cours)',
    params: [{ name: 'playerId', type: 'playerId' }],
    phases: LIVE_ALL,
  },
  {
    marketKey: 'HAND_REACHES_SHOWDOWN',
    labelFr: 'Showdown',
    params: [{ name: 'none', type: 'none' }],
    phases: LIVE_ALL,
  },
  {
    marketKey: 'HAND_ENDS_BY_FOLD',
    labelFr: 'Fin par fold',
    params: [{ name: 'none', type: 'none' }],
    phases: LIVE_ALL,
  },
  {
    marketKey: 'FINAL_WINNING_HAND_CLASS',
    labelFr: 'Classe finale gagnante',
    params: [{ name: 'class', type: 'class' }],
    phases: LIVE_ALL,
  },
]

export function listMarketsForPhase(phase: HiddenBetMarketPhase | 'ALL'): MarketDefinition[] {
  if (phase === 'ALL') return CATALOG
  return CATALOG.filter((m) => m.phases.includes(phase))
}
