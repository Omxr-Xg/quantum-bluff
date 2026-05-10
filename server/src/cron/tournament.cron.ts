import cron from 'node-cron';
import { prisma } from '../config/database.js';
import { rootLogger } from '../observability/index.js';
import { TournamentService } from '../services/tournament.service.js';
import { renewTournamentLeaderLock } from '../services/tournamentLeaderLock.service.js';

const NOTIFY_MINUTES = [30, 15, 10, 5, 1];

/**
 * Décomptes avant l’heure de départ uniquement.
 * Le lancement effectif des tournois mûrs est géré par `TournamentService.startTournamentWatcher`
 * (évite double start + conditions de course avec ce cron).
 */
cron.schedule('* * * * *', async () => {
  const leader = await renewTournamentLeaderLock();
  if (!leader) {
    return;
  }

  try {
    const now = new Date();

    // Send countdown notifications
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
