import { randomUUID } from 'crypto'
import { prisma } from '../../config/database.js'
import type { BeloteTableController } from '../../logic/belote/BeloteTableController.js'
import type { BeloteTeam } from '../../logic/belote/types.js'
import type { BeloteBotDecision } from './beloteBotHeuristic.js'
import { legalActionKey } from './beloteLegalEngine.js'

function dealHandPrefix(dealerPosition: number): string {
  return `${dealerPosition}-`
}

type RecordDecisionInput = {
  table: BeloteTableController
  playerId: string
  decision: BeloteBotDecision
  decisionSource: 'HUMAN' | 'HEURISTIC' | 'NEURAL'
  decisionTimeMs: number
  neuralRejected?: boolean
  modelVersionId?: string | null
}

export async function recordBeloteBotDecision(input: RecordDecisionInput): Promise<void> {
  try {
    const state = input.table.getState()
    await prisma.beloteDecisionMetric.create({
      data: {
        id: randomUUID(),
        gameId: state.gameId,
        handId: state.deal.dealerPosition.toString() + '-' + state.phase,
        playerId: input.playerId,
        decisionSource: input.decisionSource,
        modelVersionId: input.modelVersionId ?? null,
        variant: state.variant,
        phase: state.phase,
        decisionTimeMs: input.decisionTimeMs,
        neuralRejected: input.neuralRejected ?? false,
      },
    })
  } catch {
    /* analytics non bloquant */
  }
}

export async function recordBeloteHumanDecision(
  table: BeloteTableController,
  playerId: string,
  decisionTimeMs: number,
): Promise<void> {
  try {
    const state = table.getState()
    await prisma.beloteDecisionMetric.create({
      data: {
        id: randomUUID(),
        gameId: state.gameId,
        handId: state.deal.dealerPosition.toString() + '-' + state.phase,
        playerId,
        decisionSource: 'HUMAN',
        variant: state.variant,
        phase: state.phase,
        decisionTimeMs,
      },
    })
  } catch {
    /* non bloquant */
  }
}

/** Met à jour les métriques du deal courant (wonDeal, scores, plis). */
export async function recordBeloteDealOutcome(table: BeloteTableController): Promise<void> {
  try {
    const state = table.getState()
    const summary = state.dealEndSummary
    if (!summary) return

    const prefix = dealHandPrefix(state.deal.dealerPosition)
    for (const p of state.players) {
      const wonDeal =
        p.team === 'A'
          ? summary.scoreA > summary.scoreB
          : summary.scoreB > summary.scoreA
      const teamScoreDelta = p.team === 'A' ? summary.scoreA : summary.scoreB
      const tricksWon = p.team === 'A' ? state.deal.tricksWonA : state.deal.tricksWonB

      await prisma.beloteDecisionMetric.updateMany({
        where: {
          gameId: state.gameId,
          playerId: p.userId,
          handId: { startsWith: prefix },
        },
        data: { wonDeal, teamScoreDelta, tricksWon },
      })
    }
  } catch {
    /* non bloquant */
  }
}

export async function recordBeloteGameOutcome(
  table: BeloteTableController,
  winningTeam: BeloteTeam,
): Promise<void> {
  try {
    const state = table.getState()
    for (const p of state.players) {
      await prisma.beloteDecisionMetric.updateMany({
        where: { gameId: state.gameId, playerId: p.userId },
        data: { wonGame: p.team === winningTeam },
      })
    }
  } catch {
    /* non bloquant */
  }
}

export async function getActiveBeloteModelVersionId(): Promise<string | null> {
  try {
    const row = await prisma.beloteModelVersion.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    })
    return row?.id ?? null
  } catch {
    return null
  }
}

export async function getBeloteAnalyticsSummary(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const rows = await prisma.beloteDecisionMetric.groupBy({
    by: ['decisionSource', 'variant'],
    where: { createdAt: { gte: since } },
    _count: { id: true },
    _avg: { decisionTimeMs: true },
  })

  const benchmarks = await prisma.beloteBenchmarkRun.findMany({
    orderBy: { finishedAt: 'desc' },
    take: 20,
    include: { modelVersion: true },
  })

  const models = await prisma.beloteModelVersion.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return {
    decisionStats: rows.map((r) => ({
      decisionSource: r.decisionSource,
      variant: r.variant,
      count: r._count.id,
      avgDecisionMs: r._avg.decisionTimeMs,
    })),
    benchmarks,
    models,
    sampleActionKey: legalActionKey,
  }
}
