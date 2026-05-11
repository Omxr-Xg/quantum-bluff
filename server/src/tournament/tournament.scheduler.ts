import type { Express } from 'express'
import type { Server } from 'socket.io'
import { prisma } from '../config/database.js'
import { rootLogger } from '../observability/logger.js'
import { startTournamentFromDb } from './tournament.runtime.service.js'

let interval: ReturnType<typeof setInterval> | null = null

export function initTournamentScheduler(app: Express): void {
  if (interval) return
  interval = setInterval(() => {
    void tick(app)
  }, 10_000)
  interval.unref?.()
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
