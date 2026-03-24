import { prisma } from '../config/database.js';

export const checkDbPerformance = async () => {
  try {
    // 1. Détecter les verrous (locks) actifs qui bloquent la DB
    const locks: { count: number }[] = await prisma.$queryRaw`
      SELECT count(*) FROM pg_locks WHERE granted = false;
    `;

    // 2. Détecter le nombre de connexions actives
    const conns: { count: number }[] = await prisma.$queryRaw`
      SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
    `;

    console.log(`🚀 [DA5-STATS] Locks en attente: ${locks[0].count} | Connexions actives: ${conns[0].count}`);
  } catch (error) {
    console.error("❌ [DA5] Erreur monitoring:", error);
  }
};
