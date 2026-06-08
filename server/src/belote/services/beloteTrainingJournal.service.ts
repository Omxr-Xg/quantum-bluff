import { randomUUID } from 'crypto'
import type { Prisma } from '../../generated/prisma/index.js'
import { prisma } from '../../config/database.js'
import type { BeloteTableController } from '../../logic/belote/BeloteTableController.js'
import type { BeloteLegalAction } from './beloteLegalEngine.js'
import type { BeloteBotDecision } from './beloteBotHeuristic.js'

export type BeloteTrainingSampleInput = {
  table: BeloteTableController
  playerId: string
  legalActions: BeloteLegalAction[]
  decision: BeloteBotDecision
  source: 'HUMAN' | 'SELF_PLAY' | 'SIMULATION' | 'REPLAY'
  reward?: number
}

export function buildBeloteTrainingSampleRow(
  input: BeloteTrainingSampleInput,
): Prisma.BeloteTrainingSampleCreateManyInput {
  const state = input.table.getState()
  return {
    id: randomUUID(),
    gameId: state.gameId,
    handId: `${state.deal.dealerPosition}-${state.phase}`,
    playerId: input.playerId,
    phase: state.phase,
    variant: state.variant,
    gameStateJson: state as object,
    legalActionsJson: input.legalActions as object,
    chosenActionJson: input.decision.action as object,
    reward: input.reward ?? null,
    source: input.source,
  }
}

/** Batch insert for offline scripts only — runtime bots keep per-step `journalBeloteTrainingSample`. */
export async function flushBeloteTrainingSamples(
  rows: Prisma.BeloteTrainingSampleCreateManyInput[],
): Promise<number> {
  if (rows.length === 0) return 0
  try {
    const result = await prisma.beloteTrainingSample.createMany({ data: rows })
    return result.count
  } catch {
    return 0
  }
}

export async function journalBeloteTrainingSample(input: BeloteTrainingSampleInput): Promise<void> {
  try {
    await prisma.beloteTrainingSample.create({ data: buildBeloteTrainingSampleRow(input) })
  } catch {
    /* journal non bloquant */
  }
}
