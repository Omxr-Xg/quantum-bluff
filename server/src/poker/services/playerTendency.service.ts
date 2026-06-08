import { prisma } from '../../config/database.js'
import { heroShowdownEquity } from '../../logic/botAI.js'
import type { GameTable } from '../../logic/GameTable.js'
import type { Card } from '../../types/poker.js'
import type { Prisma } from '../../generated/prisma/index.js'

const QB_BOT_PREFIX = 'qb-bot-'
export const LOW_EQUITY_BLUFF_BP = 3500

export type TendencyStyleTag =
  | 'UNKNOWN'
  | 'AGGRESSIVE'
  | 'CALLING_STATION'
  | 'TIGHT'
  | 'BALANCED'

export type TendencyConfidence = 'LOW' | 'MEDIUM' | 'HIGH'

export type PositionBucketStats = {
  vpipOpportunities: number
  vpipTaken: number
  pfrOpportunities: number
  pfrTaken: number
  raisesFacing: number
  foldsToRaise: number
}

export type PositionStatsMap = Partial<
  Record<'BTN' | 'CO' | 'SB' | 'BB' | 'UTG' | 'MP', PositionBucketStats>
>

export type PlayerTendencyView = {
  handsObserved: number
  vpip: number
  pfr: number
  bluffRaiseRate: number
  foldToRaiseRate: number
  styleTag: TendencyStyleTag
  styleScores: { aggressive: number; tight: number; callingStation: number }
  confidence: TendencyConfidence
  lastStyleEvaluationAt: string | null
  positionStats?: PositionStatsMap
}

export type RecentTendencySession = {
  consecutiveBluffHands: number
  consecutiveFoldStreak: number
  lastHands: Array<{
    handId: string
    lowEquityRaises: number
    foldsToRaise: number
    position: string | null
  }>
}

export type PokerPositionLabel = 'BTN' | 'CO' | 'SB' | 'BB' | 'UTG' | 'MP' | 'UNKNOWN'

type RawProfile = {
  handsObserved: number
  vpipOpportunities: number
  vpipTaken: number
  pfrOpportunities: number
  pfrTaken: number
  raisesFacing: number
  foldsToRaise: number
  raisesMade: number
  lowEquityRaises: number
  styleTag: string
  styleScoreAggressive: number
  styleScoreTight: number
  styleScoreCallingStation: number
  lastStyleEvaluationAt: Date | null
}

/** Évite double comptage fin de main sur la même handId. */
const countedHandByGame = new Map<string, string>()

export function ratio(taken: number, opportunities: number): number {
  if (opportunities <= 0) return 0
  return taken / opportunities
}

export function computeConfidence(handsObserved: number): TendencyConfidence {
  if (handsObserved < 20) return 'LOW'
  if (handsObserved < 50) return 'MEDIUM'
  return 'HIGH'
}

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value))
}

export function evaluateStyleScores(raw: RawProfile): {
  aggressive: number
  tight: number
  callingStation: number
  tag: TendencyStyleTag
} {
  const vpip = ratio(raw.vpipTaken, raw.vpipOpportunities)
  const pfr = ratio(raw.pfrTaken, raw.pfrOpportunities)
  const bluff = ratio(raw.lowEquityRaises, raw.raisesMade)
  const foldToRaise = ratio(raw.foldsToRaise, raw.raisesFacing)

  let aggressive = clamp(0, 100, Math.round(pfr * 120 + bluff * 80))
  let callingStation = clamp(0, 100, Math.round(vpip * 100 - pfr * 60))
  let tight = clamp(0, 100, Math.round((1 - vpip) * 70 + foldToRaise * 50))

  const sum = aggressive + callingStation + tight
  if (sum > 0) {
    aggressive = Math.round((aggressive / sum) * 100)
    callingStation = Math.round((callingStation / sum) * 100)
    tight = 100 - aggressive - callingStation
    if (tight < 0) {
      tight = 0
      callingStation = 100 - aggressive
    }
  }

  const tag = pickDominantTag(aggressive, tight, callingStation)
  return { aggressive, tight, callingStation, tag }
}

export function pickDominantTag(
  aggressive: number,
  tight: number,
  callingStation: number,
): TendencyStyleTag {
  const max = Math.max(aggressive, tight, callingStation)
  if (max < 34) return 'BALANCED'
  const top = [
    { tag: 'AGGRESSIVE' as const, score: aggressive },
    { tag: 'TIGHT' as const, score: tight },
    { tag: 'CALLING_STATION' as const, score: callingStation },
  ].filter((e) => e.score === max)
  if (top.length > 1) return 'BALANCED'
  return top[0]!.tag
}

export function resolveHeroPosition(
  game: GameTable,
  playerId: string,
): PokerPositionLabel {
  const players = game.state.players.filter((p) => p.isConnected !== false)
  const n = players.length
  const heroIdx = players.findIndex((p) => p.id === playerId)
  if (heroIdx < 0 || n < 2) return 'UNKNOWN'

  const dealerIdx = players.findIndex((p) => p.isDealer)
  if (dealerIdx < 0) return 'UNKNOWN'

  if (n === 2) {
    return heroIdx === dealerIdx ? 'BTN' : 'BB'
  }

  const rel = (heroIdx - dealerIdx + n) % n
  if (rel === 0) return 'BTN'
  if (rel === 1) return 'SB'
  if (rel === 2) return 'BB'
  if (rel === n - 1) return 'CO'
  if (rel <= 4) return 'MP'
  return 'UTG'
}

function emptyPositionBucket(): PositionBucketStats {
  return {
    vpipOpportunities: 0,
    vpipTaken: 0,
    pfrOpportunities: 0,
    pfrTaken: 0,
    raisesFacing: 0,
    foldsToRaise: 0,
  }
}

function parsePositionStats(json: Prisma.JsonValue | null | undefined): PositionStatsMap {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return {}
  return json as PositionStatsMap
}

function bumpPositionStats(
  current: PositionStatsMap,
  position: PokerPositionLabel,
  patch: Partial<PositionBucketStats>,
): PositionStatsMap {
  if (position === 'UNKNOWN') return current
  const key = position as keyof PositionStatsMap
  const bucket = { ...emptyPositionBucket(), ...(current[key] ?? {}) }
  for (const [k, v] of Object.entries(patch)) {
    const field = k as keyof PositionBucketStats
    bucket[field] = (bucket[field] ?? 0) + (v ?? 0)
  }
  return { ...current, [key]: bucket }
}

export function positionRatesFromStats(
  stats: PositionStatsMap,
  position: PokerPositionLabel,
): { vpip: number; pfr: number; foldToRaiseRate: number } | null {
  if (position === 'UNKNOWN') return null
  const bucket = stats[position as keyof PositionStatsMap]
  if (!bucket) return null
  const hands = bucket.vpipOpportunities
  if (hands < 5) return null
  return {
    vpip: ratio(bucket.vpipTaken, bucket.vpipOpportunities),
    pfr: ratio(bucket.pfrTaken, bucket.pfrOpportunities),
    foldToRaiseRate: ratio(bucket.foldsToRaise, bucket.raisesFacing),
  }
}

export function buildPublicProfile(
  raw: RawProfile & { positionStats?: Prisma.JsonValue | null },
): PlayerTendencyView {
  const confidence = computeConfidence(raw.handsObserved)
  const base = {
    handsObserved: raw.handsObserved,
    vpip: ratio(raw.vpipTaken, raw.vpipOpportunities),
    pfr: ratio(raw.pfrTaken, raw.pfrOpportunities),
    bluffRaiseRate: ratio(raw.lowEquityRaises, raw.raisesMade),
    foldToRaiseRate: ratio(raw.foldsToRaise, raw.raisesFacing),
    confidence,
  }

  if (raw.handsObserved < 20) {
    return {
      ...base,
      styleTag: 'UNKNOWN',
      styleScores: { aggressive: 0, tight: 0, callingStation: 0 },
      lastStyleEvaluationAt: null,
    }
  }

  const positionStats = parsePositionStats(raw.positionStats)

  return {
    ...base,
    styleTag: (raw.styleTag as TendencyStyleTag) || 'UNKNOWN',
    styleScores: {
      aggressive: raw.styleScoreAggressive,
      tight: raw.styleScoreTight,
      callingStation: raw.styleScoreCallingStation,
    },
    lastStyleEvaluationAt: raw.lastStyleEvaluationAt?.toISOString() ?? null,
    positionStats,
  }
}

function isHumanPlayerId(playerId: string): boolean {
  return !playerId.startsWith(QB_BOT_PREFIX)
}

function tableHighestCurrentBet(players: { currentBet?: number }[]): number {
  return Math.max(0, ...players.map((p) => p.currentBet ?? 0))
}

function opponentHoles(game: GameTable, humanId: string): Card[][] {
  return game.state.players
    .filter((p) => p.id !== humanId && p.isActive !== false)
    .map((p) => p.cards ?? [])
    .filter((cards) => cards.length >= 2)
}

/**
 * Expert practice bot only: bot hole cards are known server-side for adaptive training.
 */
export function computeHeroEquityBp(
  heroCards: Card[],
  opponentHolesCards: Card[][],
  board: Card[],
): number {
  const eq = heroShowdownEquity(heroCards, opponentHolesCards, board)
  return Math.round(clamp(0, 10000, eq * 10000))
}

async function ensureProfile(playerId: string) {
  return prisma.playerTendencyProfile.upsert({
    where: { playerId },
    create: { playerId },
    update: {},
  })
}

export type TendencyActionContext = {
  gameId: string
  handId: string
  phase: string
  callAmount: number
  potBefore: number
  position: PokerPositionLabel
  heroCards: Card[]
  opponentHolesCards: Card[][]
  communityCards: Card[]
}

export function captureTendencyActionContext(
  game: GameTable,
  playerId: string,
  gameId: string,
): TendencyActionContext | null {
  if (!isHumanPlayerId(playerId)) return null

  const hero = game.state.players.find((p) => p.id === playerId)
  if (!hero || !Array.isArray(hero.cards) || hero.cards.length < 2) return null

  const highest = tableHighestCurrentBet(game.state.players)
  const myBet = hero.currentBet ?? 0
  const callAmount = Math.max(0, highest - myBet)

  return {
    gameId,
    handId: game.state.handId ?? 'unknown-hand',
    phase: game.state.phase ?? 'PREFLOP',
    callAmount,
    potBefore: game.state.pot ?? 0,
    position: resolveHeroPosition(game, playerId),
    heroCards: hero.cards,
    opponentHolesCards: opponentHoles(game, playerId),
    communityCards: game.state.communityCards ?? [],
  }
}

export async function logHumanTendencyAction(
  playerId: string,
  ctx: TendencyActionContext,
  action: 'FOLD' | 'CALL' | 'RAISE' | 'CHECK',
  amount?: number,
): Promise<void> {
  const equityBp = computeHeroEquityBp(
    ctx.heroCards,
    ctx.opponentHolesCards,
    ctx.communityCards,
  )

  await prisma.playerTendencyAction.create({
    data: {
      playerId,
      gameId: ctx.gameId,
      handId: ctx.handId,
      phase: ctx.phase,
      action,
      amount: amount ?? null,
      equityBp,
      position: ctx.position,
      potBefore: ctx.potBefore,
    },
  })

  const profile = await ensureProfile(playerId)
  const updates: Record<string, number> = {}
  const positionPatch: Partial<PositionBucketStats> = {}

  const vpipOpportunity =
    ctx.callAmount > 0 || action === 'RAISE'
  if (vpipOpportunity) {
    updates.vpipOpportunities = profile.vpipOpportunities + 1
    positionPatch.vpipOpportunities = 1
    if (action === 'CALL' || action === 'RAISE') {
      updates.vpipTaken = profile.vpipTaken + 1
      positionPatch.vpipTaken = 1
    }
  }

  if (ctx.phase === 'PREFLOP' && action === 'RAISE') {
    updates.pfrOpportunities = profile.pfrOpportunities + 1
    updates.pfrTaken = profile.pfrTaken + 1
    positionPatch.pfrOpportunities = 1
    positionPatch.pfrTaken = 1
  } else if (ctx.phase === 'PREFLOP' && (action === 'CALL' || action === 'CHECK')) {
    updates.pfrOpportunities = profile.pfrOpportunities + 1
    positionPatch.pfrOpportunities = 1
  }

  if (ctx.callAmount > 0) {
    updates.raisesFacing = profile.raisesFacing + 1
    positionPatch.raisesFacing = 1
    if (action === 'FOLD') {
      updates.foldsToRaise = profile.foldsToRaise + 1
      positionPatch.foldsToRaise = 1
    }
  }

  if (action === 'RAISE') {
    updates.raisesMade = profile.raisesMade + 1
    updates.raiseEquitySamples = profile.raiseEquitySamples + 1
    updates.raiseEquitySumBp = profile.raiseEquitySumBp + equityBp
    if (equityBp < LOW_EQUITY_BLUFF_BP) {
      updates.lowEquityRaises = profile.lowEquityRaises + 1
    }
  }

  if (Object.keys(updates).length === 0) return

  const nextPositionStats = bumpPositionStats(
    parsePositionStats(profile.positionStats),
    ctx.position,
    positionPatch,
  )

  await prisma.playerTendencyProfile.update({
    where: { playerId },
    data: {
      ...updates,
      positionStats: nextPositionStats as Prisma.InputJsonValue,
    },
  })
}

async function summarizeHandFromJournal(
  playerId: string,
  handId: string,
): Promise<{
  vpip: boolean
  pfr: boolean
  raised: boolean
  lowEquityRaises: number
  foldsToRaise: number
  position: string | null
}> {
  const actions = await prisma.playerTendencyAction.findMany({
    where: { playerId, handId },
    orderBy: { createdAt: 'asc' },
  })

  let lowEquityRaises = 0
  let foldsToRaise = 0
  let vpip = false
  let pfr = false
  let raised = false
  let position: string | null = null

  for (const row of actions) {
    position = row.position ?? position
    if (row.action === 'CALL' || row.action === 'RAISE') vpip = true
    if (row.phase === 'PREFLOP' && row.action === 'RAISE') pfr = true
    if (row.action === 'RAISE') {
      raised = true
      if (row.equityBp < LOW_EQUITY_BLUFF_BP) lowEquityRaises++
    }
    if (row.action === 'FOLD') foldsToRaise++
  }

  return { vpip, pfr, raised, lowEquityRaises, foldsToRaise, position }
}

export async function getRecentTendencySession(
  playerId: string,
  gameId: string,
  limit = 5,
): Promise<RecentTendencySession> {
  const rows = await prisma.playerTendencyHandSummary.findMany({
    where: { playerId, gameId },
    orderBy: { endedAt: 'desc' },
    take: limit,
  })

  let consecutiveBluffHands = 0
  let consecutiveFoldStreak = 0

  for (const row of rows) {
    if (row.lowEquityRaises > 0) consecutiveBluffHands++
    else break
  }

  for (const row of rows) {
    if (row.foldsToRaise > 0 && !row.raised) consecutiveFoldStreak++
    else break
  }

  return {
    consecutiveBluffHands,
    consecutiveFoldStreak,
    lastHands: rows.map((r) => ({
      handId: r.handId,
      lowEquityRaises: r.lowEquityRaises,
      foldsToRaise: r.foldsToRaise,
      position: r.position,
    })),
  }
}

export async function onPracticeExpertHandComplete(
  gameId: string,
  game: GameTable,
): Promise<void> {
  const handId = game.state.handId
  if (!handId) return

  const prev = countedHandByGame.get(gameId)
  if (prev === handId) return
  countedHandByGame.set(gameId, handId)

  const human = game.state.players.find((p) => isHumanPlayerId(p.id))
  if (!human) return

  const profile = await ensureProfile(human.id)
  const handsObserved = profile.handsObserved + 1
  const summary = await summarizeHandFromJournal(human.id, handId)
  const wonPot =
    game.state.showdownWinnerId === human.id ||
    (game.state.showdownWinnerIds?.includes(human.id) ?? false)

  await prisma.playerTendencyHandSummary.upsert({
    where: { playerId_handId: { playerId: human.id, handId } },
    create: {
      playerId: human.id,
      profileId: profile.id,
      gameId,
      handId,
      position: summary.position,
      vpip: summary.vpip,
      pfr: summary.pfr,
      raised: summary.raised,
      lowEquityRaises: summary.lowEquityRaises,
      foldsToRaise: summary.foldsToRaise,
      reachedShowdown: game.state.phase === 'SHOWDOWN',
      wonPot,
    },
    update: {
      position: summary.position,
      vpip: summary.vpip,
      pfr: summary.pfr,
      raised: summary.raised,
      lowEquityRaises: summary.lowEquityRaises,
      foldsToRaise: summary.foldsToRaise,
      reachedShowdown: game.state.phase === 'SHOWDOWN',
      wonPot,
      endedAt: new Date(),
    },
  })

  if (handsObserved < 20) {
    await prisma.playerTendencyProfile.update({
      where: { playerId: human.id },
      data: { handsObserved },
    })
    return
  }

  const nextRaw: RawProfile = {
    ...profile,
    handsObserved,
  }
  const scores = evaluateStyleScores(nextRaw)

  await prisma.playerTendencyProfile.update({
    where: { playerId: human.id },
    data: {
      handsObserved,
      styleTag: scores.tag,
      styleScoreAggressive: scores.aggressive,
      styleScoreTight: scores.tight,
      styleScoreCallingStation: scores.callingStation,
      lastStyleEvaluationAt: new Date(),
    },
  })
}

export async function getPlayerTendencyProfile(
  playerId: string,
): Promise<PlayerTendencyView | null> {
  const raw = await prisma.playerTendencyProfile.findUnique({
    where: { playerId },
  })
  if (!raw) return null
  return buildPublicProfile(raw)
}

export async function purgeOldTendencyActions(retentionDays = 90): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - retentionDays)
  const [actions, summaries] = await Promise.all([
    prisma.playerTendencyAction.deleteMany({
      where: { createdAt: { lt: cutoff } },
    }),
    prisma.playerTendencyHandSummary.deleteMany({
      where: { endedAt: { lt: cutoff } },
    }),
  ])
  return actions.count + summaries.count
}
