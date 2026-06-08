import { randomUUID } from 'node:crypto'
import { GameTable } from '../../logic/GameTable.js'
import {
  decideBotAction,
  expertOracleDecision,
  type BotActionRequest,
  type BotDifficulty,
  type ExpertPlayerTendency,
} from '../../logic/botAI.js'
import { sanitizeBotDecision } from '../../logic/botDecisionSanitize.js'
import type { Player } from '../../types/poker.js'

export type SelfPlayMatchup =
  | 'EXPERT_VS_EXPERT'
  | 'EXPERT_VS_ADAPTIVE'
  | 'ADAPTIVE_VS_ADAPTIVE'

export type SelfPlayBotMetrics = {
  botId: string
  handsPlayed: number
  wins: number
  winRate: number
  chipDelta: number
  evPerHand: number
  bbPer100: number
  vpip: number
  pfr: number
  foldToRaiseRate: number
  bluffFrequency: number
  callFrequency: number
}

export type SelfPlayRunResult = {
  matchup: SelfPlayMatchup
  handsPlayed: number
  bigBlind: number
  startedAt: string
  completedAt: string
  bots: SelfPlayBotMetrics[]
}

const SB = 50
const BB = 100
const MAX_STEPS_PER_HAND = 180

type ActionCounters = {
  vpipOpp: number
  vpipTaken: number
  pfrOpp: number
  pfrTaken: number
  raisesFacing: number
  foldsToRaise: number
  raisesMade: number
  lowEquityRaises: number
  callOpp: number
  callsMade: number
}

function emptyCounters(): ActionCounters {
  return {
    vpipOpp: 0,
    vpipTaken: 0,
    pfrOpp: 0,
    pfrTaken: 0,
    raisesFacing: 0,
    foldsToRaise: 0,
    raisesMade: 0,
    lowEquityRaises: 0,
    callOpp: 0,
    callsMade: 0,
  }
}

function tableHighestBet(players: Player[]): number {
  return Math.max(0, ...players.map((p) => p.currentBet ?? 0))
}

function buildRequest(table: GameTable, botId: string): BotActionRequest | null {
  const bot = table.state.players.find((p) => p.id === botId)
  if (!bot?.cards || bot.cards.length < 2) return null

  const highest = tableHighestBet(table.state.players)
  const myBet = bot.currentBet ?? 0
  const callAmount = Math.max(0, highest - myBet)

  return {
    playerCards: bot.cards,
    communityCards: table.state.communityCards ?? [],
    difficulty: 'expert',
    currentBet: myBet,
    playerChips: bot.chips,
    callAmount,
    minRaise: Math.max(1, table.getMinRaise()),
    potSize: table.state.pot,
    position: bot.position ?? 0,
    playersCount: 2,
  }
}

function syntheticAdaptiveProfile(preset: 'AGGRESSIVE' | 'TIGHT' | 'CALLING_STATION'): ExpertPlayerTendency {
  if (preset === 'AGGRESSIVE') {
    return {
      vpip: 0.42,
      pfr: 0.28,
      bluffRaiseRate: 0.38,
      foldToRaiseRate: 0.35,
      styleTag: 'AGGRESSIVE',
      confidence: 'HIGH',
      styleScores: { aggressive: 70, tight: 15, callingStation: 15 },
    }
  }
  if (preset === 'CALLING_STATION') {
    return {
      vpip: 0.55,
      pfr: 0.08,
      bluffRaiseRate: 0.1,
      foldToRaiseRate: 0.25,
      styleTag: 'CALLING_STATION',
      confidence: 'HIGH',
      styleScores: { aggressive: 15, tight: 20, callingStation: 65 },
    }
  }
  return {
    vpip: 0.18,
    pfr: 0.12,
    bluffRaiseRate: 0.12,
    foldToRaiseRate: 0.62,
    styleTag: 'TIGHT',
    confidence: 'HIGH',
    styleScores: { aggressive: 15, tight: 70, callingStation: 15 },
  }
}

function isAdaptiveSeat(matchup: SelfPlayMatchup, seat: 'A' | 'B'): boolean {
  if (matchup === 'EXPERT_VS_EXPERT') return false
  if (matchup === 'EXPERT_VS_ADAPTIVE') return seat === 'B'
  return true
}

function decideSeatAction(
  req: BotActionRequest,
  table: GameTable,
  botId: string,
  matchup: SelfPlayMatchup,
  seat: 'A' | 'B',
): ReturnType<typeof expertOracleDecision> {
  const opponents = table.state.players
    .filter((p) => p.id !== botId)
    .map((p) => p.cards ?? [])
    .filter((c) => c.length >= 2)

  if (isAdaptiveSeat(matchup, seat)) {
    const tendency = syntheticAdaptiveProfile(seat === 'B' ? 'AGGRESSIVE' : 'TIGHT')
    return expertOracleDecision(req, {
      opponentHoleCards: opponents,
      playerTendency: tendency,
    })
  }

  if (opponents.length > 0) {
    return expertOracleDecision(req, { opponentHoleCards: opponents })
  }
  return decideBotAction({ ...req, difficulty: 'expert' as BotDifficulty })
}

function bumpCounters(
  counters: ActionCounters,
  req: BotActionRequest,
  action: string,
  phase: string,
): void {
  const vpipOpp = req.callAmount > 0 || action === 'RAISE'
  if (vpipOpp) {
    counters.vpipOpp++
    if (action === 'CALL' || action === 'RAISE') counters.vpipTaken++
  }
  if (phase === 'PREFLOP') {
    counters.pfrOpp++
    if (action === 'RAISE') counters.pfrTaken++
  }
  if (req.callAmount > 0) {
    counters.raisesFacing++
    if (action === 'FOLD') counters.foldsToRaise++
    counters.callOpp++
    if (action === 'CALL') counters.callsMade++
  }
  if (action === 'RAISE') {
    counters.raisesMade++
  }
}

function ratio(t: number, o: number): number {
  return o > 0 ? t / o : 0
}

function finalizeMetrics(
  botId: string,
  startChips: number,
  endChips: number,
  hands: number,
  wins: number,
  c: ActionCounters,
  bb: number,
): SelfPlayBotMetrics {
  const chipDelta = endChips - startChips
  return {
    botId,
    handsPlayed: hands,
    wins,
    winRate: hands > 0 ? wins / hands : 0,
    chipDelta,
    evPerHand: hands > 0 ? chipDelta / hands : 0,
    bbPer100: hands > 0 ? (chipDelta / bb / hands) * 100 : 0,
    vpip: ratio(c.vpipTaken, c.vpipOpp),
    pfr: ratio(c.pfrTaken, c.pfrOpp),
    foldToRaiseRate: ratio(c.foldsToRaise, c.raisesFacing),
    bluffFrequency: ratio(c.lowEquityRaises, c.raisesMade),
    callFrequency: ratio(c.callsMade, c.callOpp),
  }
}

function playHand(
  table: GameTable,
  matchup: SelfPlayMatchup,
  counters: Record<string, ActionCounters>,
): string | undefined {
  table.startHand({ handId: randomUUID() })
  let steps = 0

  while (
    table.state.handRuntimePhase !== 'HAND_COMPLETE' &&
    table.state.phase !== 'SHOWDOWN' &&
    steps < MAX_STEPS_PER_HAND
  ) {
    steps++
    const turn = table.state.currentTurn
    if (!turn) break

    const req = buildRequest(table, turn)
    if (!req) break

    const seat: 'A' | 'B' = turn === 'qb-bot-1' ? 'A' : 'B'
    const raw = decideSeatAction(req, table, turn, matchup, seat)
    const decision = sanitizeBotDecision(raw, req)
    bumpCounters(counters[turn]!, req, decision.action, table.state.phase)

    const amount = 'amount' in decision ? decision.amount : undefined
    try {
      table.handlePlayerAction(turn, decision.action, amount)
    } catch {
      const fallback = req.callAmount > 0 ? 'FOLD' : 'CHECK'
      table.handlePlayerAction(turn, fallback)
    }
  }

  return table.state.showdownWinnerId
}

export function runSelfPlaySimulation(options: {
  matchup: SelfPlayMatchup
  hands: number
  startingChips?: number
  onProgress?: (handsDone: number, handsTotal: number) => void
}): SelfPlayRunResult {
  process.env.SELFPLAY_QUIET = '1'
  const startedAt = new Date().toISOString()
  const stacks = options.startingChips ?? 10_000
  const gameId = `selfplay-${randomUUID()}`

  const players: Player[] = [
    {
      id: 'qb-bot-1',
      name: 'Bot A',
      cards: [],
      chips: stacks,
      role: 'PLAYER',
      isActive: true,
      isConnected: true,
    },
    {
      id: 'qb-bot-2',
      name: 'Bot B',
      cards: [],
      chips: stacks,
      role: 'PLAYER',
      isActive: true,
      isConnected: true,
    },
  ]

  const table = new GameTable(gameId, players, {
    smallBlind: SB,
    bigBlind: BB,
    liveBetWindowDisabled: true,
  })

  const startChips = { 'qb-bot-1': stacks, 'qb-bot-2': stacks }
  const wins = { 'qb-bot-1': 0, 'qb-bot-2': 0 }
  const counters: Record<string, ActionCounters> = {
    'qb-bot-1': emptyCounters(),
    'qb-bot-2': emptyCounters(),
  }

  let handsPlayed = 0
  for (let h = 0; h < options.hands; h++) {
    for (const p of table.state.players) {
      p.chips = stacks
      p.isActive = true
      p.isConnected = true
    }
    const winner = playHand(table, options.matchup, counters)
    handsPlayed++
    if (winner && winner in wins) wins[winner as keyof typeof wins]++
    options.onProgress?.(handsPlayed, options.hands)
  }

  const completedAt = new Date().toISOString()

  return {
    matchup: options.matchup,
    handsPlayed,
    bigBlind: BB,
    startedAt,
    completedAt,
    bots: ['qb-bot-1', 'qb-bot-2'].map((id) =>
      finalizeMetrics(
        id,
        startChips[id as keyof typeof startChips],
        table.state.players.find((p) => p.id === id)?.chips ?? startChips[id as keyof typeof startChips],
        handsPlayed,
        wins[id as keyof typeof wins],
        counters[id]!,
        BB,
      ),
    ),
  }
}
