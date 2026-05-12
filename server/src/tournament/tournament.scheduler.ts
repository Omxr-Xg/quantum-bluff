import type { Express } from 'express'
import type { Server } from 'socket.io'
import { prisma } from '../config/database.js'
import { rootLogger } from '../observability/logger.js'
import { startTournamentFromDb } from './tournament.runtime.service.js'
import { processExpiredRoundReadyWindows } from './tournament.roundReady.service.js'

let interval: ReturnType<typeof setInterval> | null = null
let readyTickInterval: ReturnType<typeof setInterval> | null = null

export function initTournamentScheduler(app: Express): void {
  if (!interval) {
    interval = setInterval(() => {
      void tick(app)
    }, 10_000)
    interval.unref?.()
  }
  if (!readyTickInterval) {
    /* Tick rapide (2 s) pour rattraper les fenêtres ready-check expirées
     * sans rallonger le délai perçu par les joueurs. */
    readyTickInterval = setInterval(() => {
      void readyTick(app)
    }, 2_000)
    readyTickInterval.unref?.()
  }
}

async function tick(app: Express): Promise<void> {
  const io = app.get('io') as Server | undefined
  if (!io) return
  const now = new Date()
  const due = await prisma.tournament.findMany({
    where: {
      status: 'REGISTRATION_OPEN',
      startAt: { lte: now },
    },
    select: { id: true },
    take: 5,
  })
  for (const d of due) {
    try {
      await startTournamentFromDb(d.id, io)
    } catch (e) {
      rootLogger.warn({
        msg: 'tournament_auto_start_failed',
        tournamentId: d.id,
        detail: e instanceof Error ? e.message : String(e),
      })
    }
  }
}

async function readyTick(app: Express): Promise<void> {
  const io = app.get('io') as Server | undefined
  if (!io) return
  try {
    await processExpiredRoundReadyWindows(io)
  } catch (e) {
    rootLogger.warn({
      msg: 'tournament_ready_tick_failed',
      detail: e instanceof Error ? e.message : String(e),
    })
  }
}
