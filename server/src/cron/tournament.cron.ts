import cron from 'node-cron';
import { prisma } from '../config/database.js';
import { rootLogger } from '../observability/index.js';
import { TournamentService } from '../services/tournament.service.js';

const NOTIFY_MINUTES = [30, 15, 10, 5, 1];

cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();

    // 1. Start tournaments that are due
    const tournamentsToStart = await prisma.tournament.findMany({
      where: { status: 'PENDING', startTime: { lte: now } },
      include: { players: { include: { user: { select: { id: true, username: true } } } } }
    });

    for (const t of tournamentsToStart) {
      try {
        await TournamentService.startTournament(t.id);
        rootLogger.info({ msg: 'cron_tournament_started_success', tournamentId: t.id });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const updated = await prisma.tournament.findUnique({ where: { id: t.id } });
        if (updated?.status === 'CANCELED') {
          TournamentService.notifyCancellation(t.id, t.name, t.players.map(p => p.userId));
        }
        rootLogger.error({ msg: 'cron_tournament_start_error', tournamentId: t.id, error: msg });
      }
    }

    // 2. Send countdown notifications
    for (const minutes of NOTIFY_MINUTES) {
      const windowStart = new Date(now.getTime() + minutes * 60 * 1000 - 30 * 1000);
      const windowEnd = new Date(now.getTime() + minutes * 60 * 1000 + 30 * 1000);

      const upcoming = await prisma.tournament.findMany({
        where: {
          status: 'PENDING',
          startTime: { gte: windowStart, lte: windowEnd }
        },
        include: { players: true }
      });

      for (const t of upcoming) {
        TournamentService.notifyCountdown(t.id, t.name, minutes, t.players.map(p => p.userId));
      }
    }

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    rootLogger.error({ msg: 'cron_db_error', error: msg });
  }
});
