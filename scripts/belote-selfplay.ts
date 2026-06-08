/**
 * Lightweight self-play sample generator (headless).
 * Usage: npx tsx scripts/belote-selfplay.ts [--games=100] [--batch-size=250] [--dry-run]
 *
 * `--dry-run` simulates games without DB writes (fast sanity check).
 * Default mode batches inserts via createMany — does not affect in-game bot journaling.
 */
import { randomUUID } from 'crypto'
import type { Prisma } from '../server/src/generated/prisma/index.js'
import { BeloteTableController } from '../server/src/logic/belote/BeloteTableController.js'
import { makeBeloteBotId } from '../server/src/shared/beloteBots.js'
import {
  getLegalActions,
  legalActionToBeloteAction,
} from '../server/src/belote/services/beloteLegalEngine.js'
import { heuristicDecision } from '../server/src/belote/services/beloteBotHeuristic.js'
import {
  buildBeloteTrainingSampleRow,
  flushBeloteTrainingSamples,
} from '../server/src/belote/services/beloteTrainingJournal.service.js'

function parseArgs() {
  const args = process.argv.slice(2)
  let games = 50
  let batchSize = 250
  let dryRun = false
  for (const a of args) {
    if (a.startsWith('--games=')) games = Number(a.split('=')[1]) || games
    if (a.startsWith('--batch-size=')) batchSize = Number(a.split('=')[1]) || batchSize
    if (a === '--dry-run') dryRun = true
  }
  return { games, batchSize: Math.max(1, batchSize), dryRun }
}

async function runGame(
  buffer: Prisma.BeloteTrainingSampleCreateManyInput[],
  dryRun: boolean,
): Promise<number> {
  const table = new BeloteTableController({
    gameId: randomUUID(),
    roomId: 'selfplay',
    targetScore: 200,
    buyIn: 0,
    variant: 'CONTEE',
    players: [0, 1, 2, 3].map((position) => ({
      userId: makeBeloteBotId(),
      username: `SP${position}`,
      position,
      isBot: true,
    })),
  })

  let steps = 0
  let samples = 0

  while (table.getState().phase !== 'GAME_END' && steps++ < 400) {
    const s = table.getState()
    if (s.phase === 'DEAL_END') {
      table.startNextDeal()
      continue
    }

    const pos =
      s.phase === 'PLAYING' ? s.deal.currentPlayerPosition : s.biddingTurnPosition
    const player = s.players.find((p) => p.position === pos)
    if (!player) break
    const legal = getLegalActions(table, player.userId)
    const decision = heuristicDecision(table, player.userId, legal)

    if (!dryRun) {
      buffer.push(
        buildBeloteTrainingSampleRow({
          table,
          playerId: player.userId,
          legalActions: legal,
          decision,
          source: 'SELF_PLAY',
        }),
      )
      samples++
    }

    let result = table.applyAction(
      player.userId,
      legalActionToBeloteAction(decision.action),
    )
    if (!result.ok) {
      const fallback = legal.find((a) => a.type === 'PASS') ?? legal[0]
      if (fallback) {
        table.applyAction(player.userId, legalActionToBeloteAction(fallback))
      }
    }
  }

  return samples
}

async function main() {
  const { games, batchSize, dryRun } = parseArgs()
  const startedAt = Date.now()
  const buffer: Prisma.BeloteTrainingSampleCreateManyInput[] = []
  let samplesBuffered = 0
  let samplesWritten = 0
  let stepsSimulated = 0

  for (let i = 0; i < games; i++) {
    const n = await runGame(buffer, dryRun)
    stepsSimulated += n

    if (!dryRun && buffer.length >= batchSize) {
      samplesWritten += await flushBeloteTrainingSamples(buffer.splice(0, buffer.length))
    }

    if ((i + 1) % 10 === 0) {
      console.log(`selfplay ${i + 1}/${games}`)
    }
  }

  if (!dryRun && buffer.length > 0) {
    samplesWritten += await flushBeloteTrainingSamples(buffer)
  }

  samplesBuffered = dryRun ? 0 : stepsSimulated

  console.log(
    JSON.stringify(
      {
        games,
        dryRun,
        batchSize: dryRun ? null : batchSize,
        samplesBuffered,
        samplesWritten,
        elapsedMs: Date.now() - startedAt,
      },
      null,
      2,
    ),
  )

  if (!dryRun) {
    try {
      const { prisma } = await import('../server/src/config/database.js')
      await prisma.$disconnect()
    } catch {
      /* optional DB */
    }
  }
}

void main()
