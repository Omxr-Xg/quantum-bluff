/**
 * Replay BeloteGameSnapshot rows into BeloteTrainingSample (dataset Phase 2).
 * Usage: npx tsx scripts/belote-replay-snapshots.ts [--limit=100]
 */
import { randomUUID } from 'crypto'
import { BeloteTableController } from '../server/src/logic/belote/BeloteTableController.js'
import type { BeloteGameState } from '../server/src/logic/belote/types.js'
import { getLegalActions } from '../server/src/belote/services/beloteLegalEngine.js'
import { heuristicDecision } from '../server/src/belote/services/beloteBotHeuristic.js'

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? Number(limitArg.split('=')[1]) || 50 : 50

  const { prisma } = await import('../server/src/config/database.js')
  const snaps = await prisma.beloteGameSnapshot.findMany({
    orderBy: { updatedAt: 'desc' },
    take: limit,
  })

  let written = 0
  for (const snap of snaps) {
    const state = snap.snapshot as BeloteGameState
    if (!state?.players?.length) continue

    const table = BeloteTableController.fromSnapshot(state)
    const pos =
      state.phase === 'PLAYING'
        ? state.deal.currentPlayerPosition
        : state.biddingTurnPosition
    const player = state.players.find((p) => p.position === pos && !p.forfeited)
    if (!player) continue

    const legal = getLegalActions(table, player.userId)
    if (legal.length === 0) continue

    const decision = heuristicDecision(table, player.userId, legal)
    await prisma.beloteTrainingSample.create({
      data: {
        id: randomUUID(),
        gameId: state.gameId,
        handId: `${state.deal.dealerPosition}-replay`,
        playerId: player.userId,
        phase: state.phase,
        variant: state.variant,
        gameStateJson: state as object,
        legalActionsJson: legal as object,
        chosenActionJson: decision.action as object,
        source: 'REPLAY',
      },
    })
    written++
  }

  console.log(JSON.stringify({ snapshotsRead: snaps.length, samplesWritten: written }, null, 2))
  await prisma.$disconnect()
}

void main()
