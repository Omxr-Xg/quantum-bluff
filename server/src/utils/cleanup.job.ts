import cron from 'node-cron';
import { prisma } from '../config/database.js';

/**
 * DA4: Maintenance de la base de données
 * - Nettoyage des parties > 30 jours
 * - Monitoring de l'espace disque
 */

// 1. Fonction pour vérifier la taille de la base
async function checkDatabaseSize() {
  try {
    const stats: { size?: string }[] = await prisma.$queryRaw`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size;
    `;
    console.log(`📊 [DA4-MONITOR] Taille totale de la base : ${stats[0].size}`);
  } catch (error) {
    console.error("❌ [DA4-MONITOR] Erreur lecture taille :", error);
  }
}

// 2. Fonction principale de nettoyage (Archivage/Purge)
async function performCleanup() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  console.log(`🧹 [DA4-CLEANUP] Début du cycle de maintenance...`);

  try {
    // Nettoyage des différentes tables historiques
    const [hist, actions, results] = await Promise.all([
      prisma.gameHistory.deleteMany({ where: { createdAt: { lt: thirtyDaysAgo } } }),
      prisma.gameAction.deleteMany({ where: { timestamp: { lt: thirtyDaysAgo } } }),
      prisma.gameResult.deleteMany({ where: { endedAt: { lt: thirtyDaysAgo } } })
    ]);

    const totalDeleted = hist.count + actions.count + results.count;
    console.log(`✅ [DA4-CLEANUP] Archivage terminé : ${totalDeleted} entrées supprimées.`);
    
    // Après le nettoyage, on vérifie la taille pour voir le gain
    await checkDatabaseSize();

  } catch (error) {
    console.error("❌ [DA4-CLEANUP] Erreur pendant le nettoyage :", error);
  }
}

// 3. Initialisation du Job Cron (tous les jours à minuit)
export const initCleanupJobs = () => {
  console.log("🚀 [DA4] Service de maintenance initialisé.");
  
  cron.schedule('0 0 * * *', async () => {
    await performCleanup();
  });

  // Optionnel : Lancer une vérification immédiate au démarrage pour le debug
  // On commente l'appel immédiat pour empêcher 
  // le serveur de crasher au démarrage si la DB n'est pas prête.
  //checkDatabaseSize();
};