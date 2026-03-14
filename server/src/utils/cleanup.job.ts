import cron from 'node-cron';
import { prisma } from '../config/database.js';

export const initCleanupJobs = () => {
  // Tous les jours à minuit
  cron.schedule('0 0 * * *', async () => {
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - 30);

    try {
      console.log('🧹 [CRON] Nettoyage des données de plus de 30 jours...');
      
      const [hist, actions, results] = await Promise.all([
        prisma.gameHistory.deleteMany({ where: { createdAt: { lt: limitDate } } }),
        prisma.gameAction.deleteMany({ where: { timestamp: { lt: limitDate } } }),
        prisma.gameResult.deleteMany({ where: { endedAt: { lt: limitDate } } })
      ]);

      console.log(`✅ [CRON] Nettoyage fini: ${hist.count} Hist, ${actions.count} Actions, ${results.count} Results.`);
    } catch (err) {
      console.error('❌ [CRON] Erreur:', err);
    }
  });
};