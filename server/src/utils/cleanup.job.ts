import { activeGames } from '../shared/activeGames.js';
import { CashGameController } from '../logic/CashGameController.js';

import cron from 'node-cron';
import { prisma } from '../config/database.js';
import {
  cleanupOrphanBlackjackRuntime,
  cleanupStaleBlackjackRooms,
} from '../blackjack/recovery/blackjackRecovery.service.js';
import { cleanupOrphanPokerRuntime } from '../poker/recovery/pokerRecovery.service.js';

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
    console.log(` [DA4-MONITOR] Taille totale de la base : ${stats[0].size}`);
  } catch (error) {
    console.error(" [DA4-MONITOR] Erreur lecture taille :", error);
  }
}

// 2. Fonction principale de nettoyage (Archivage/Purge)
async function performCleanup() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  console.log(`[DA4-CLEANUP] Début du cycle de maintenance...`);

  try {
    // Nettoyage des différentes tables historiques
    const [hist, actions, results] = await Promise.all([
      prisma.gameHistory.deleteMany({ where: { createdAt: { lt: thirtyDaysAgo } } }),
      prisma.gameAction.deleteMany({ where: { timestamp: { lt: thirtyDaysAgo } } }),
      prisma.gameResult.deleteMany({ where: { endedAt: { lt: thirtyDaysAgo } } })
    ]);

    const totalDeleted = hist.count + actions.count + results.count;
    console.log(` [DA4-CLEANUP] Archivage terminé : ${totalDeleted} entrées supprimées.`);
    
    // Après le nettoyage, on vérifie la taille pour voir le gain
    await checkDatabaseSize();
    await cleanupOrphanBlackjackRuntime();
    await cleanupStaleBlackjackRooms();
    await cleanupOrphanPokerRuntime();

  } catch (error) {
    console.error(" [DA4-CLEANUP] Erreur pendant le nettoyage :", error);
  }
}

// 3. Initialisation du Job Cron (tous les jours à minuit)
export const initCleanupJobs = () => {
  console.log(" [DA4] Service de maintenance initialisé.");
  
  cron.schedule('0 0 * * *', async () => {
    await performCleanup();
  });

  // Nettoyage blackjack plus fréquent (rooms orphelines / bloquées / WAITING trop vieilles)
  cron.schedule('*/5 * * * *', async () => {
    try {
      await cleanupMemoryTables();
      await cleanupOrphanBlackjackRuntime();
      await cleanupStaleBlackjackRooms();
      await cleanupOrphanPokerRuntime();
    } catch (error) {
      console.error(' [DA4-BLACKJACK-CLEANUP] Erreur:', error);
    }
  });

  // Optionnel : Lancer une vérification immédiate au démarrage pour le debug
  // On commente l'appel immédiat pour empêcher 
  // le serveur de crasher au démarrage si la DB n'est pas prête.
  //checkDatabaseSize();
};


// NOUVEAU : Le vrai Garbage Collector pour la RAM
async function cleanupMemoryTables() {
  console.log(` [RAM-CLEANUP] Scan des tables fantômes en mémoire...`);
  try {
    let removedPoker = 0;

    // Si ton activeGames est un Map ou possède une méthode entries()
    const allGames = await activeGames.getAll();
    for (const [gameId, game] of allGames.entries()) {
      if (game instanceof CashGameController) {
        // Si la table de Poker est totalement vide
        if (game.getOccupiedCount() === 0) {
          await activeGames.delete(gameId);
          
          // Sécurité : on remet la salle en mode "WAITING" dans la BDD au cas où
          await prisma.waitingRoom.updateMany({
            where: { gameId: gameId },
            data: { status: 'WAITING', gameId: null },
          }).catch(() => {});

          removedPoker++;
          console.log(` [RAM-CLEANUP] Table Poker vide supprimée de la RAM: ${gameId}`);
        }
      }
    }

    if (removedPoker > 0) {
      console.log(` [RAM-CLEANUP] Nettoyage terminé : ${removedPoker} tables effacées de la mémoire.`);
    }
  } catch (error) {
    console.error(" [RAM-CLEANUP] Erreur pendant le nettoyage de la RAM :", error);
  }
}