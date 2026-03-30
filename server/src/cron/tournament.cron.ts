import cron from 'node-cron';
import { prisma } from '../config/database.js';
import { TournamentService } from '../services/tournament.service.js';
import { rootLogger } from '../observability/index.js';

/**
 * Job planifié : s'exécute toutes les minutes (* * * * *)
 */
cron.schedule('* * * * *', async () => {
  const now = new Date();

  try {
    // 1. Chercher les tournois PENDING qui devraient déjà avoir commencé
    const tournamentsToStart = await prisma.tournament.findMany({
      where: {
        status: 'PENDING',
        startTime: { lte: now } // lte = Less Than or Equal (inférieur ou égal à maintenant)
      }
    });

    if (tournamentsToStart.length > 0) {
      rootLogger.info({ msg: 'cron_checking_tournaments', count: tournamentsToStart.length });

      for (const tournament of tournamentsToStart) {
        try {
          // 2. Lancer le tournoi via le service
          await TournamentService.startTournament(tournament.id);
          
          rootLogger.info({ 
            msg: 'cron_tournament_started_success', 
            tournamentId: tournament.id,
            name: tournament.name 
          });
        } catch (startError) {
          const msg = startError instanceof Error ? startError.message : String(startError);
          rootLogger.error({ 
            msg: 'cron_tournament_start_error', 
            tournamentId: tournament.id, 
            error: msg 
          });
        }
      }
    }
  } catch (dbError) {
    const msg = dbError instanceof Error ? dbError.message : String(dbError);
    rootLogger.error({ msg: 'cron_db_error', error: msg });
  }
});