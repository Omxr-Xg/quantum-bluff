import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in the environment.');
}

const pool = new pg.Pool({ connectionString });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaPg(pool as any);

// Configuration DA5 : activation des logs d'événements
export const prisma = new PrismaClient({ 
  adapter,
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' },
  ],
});

/**
 * 🟡 DA5 : Monitoring des requêtes lentes
 * On écoute l'événement 'query' pour mesurer le temps d'exécution
 */
prisma.$on('query' as never, (e: { duration?: number; query?: string }) => {
  if ((e?.duration ?? 0) >= 100) { // Seuil de performance : 100ms
    console.warn(`🐢 [DA5-PERF] Requête lente détectée !`);
    console.warn(`⏱️ Durée : ${e?.duration}ms`);
    console.warn(`📝 SQL : ${e?.query}`);
  }
});

export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

/**
 * 🟡 DA5 : Vérification des locks et conflits
 * Utile pour surveiller la santé de PostgreSQL en temps réel
 */
export const getDbPerformanceMetrics = async () => {
  try {
    // Détecter les verrous qui bloquent des transactions
    const locks: { count: number }[] = await prisma.$queryRaw`
      SELECT count(*) as count FROM pg_locks WHERE granted = false;
    `;
    
    // Compter les connexions actives au pool
    const activeConns = pool.totalCount;

    return {
      waitingLocks: Number(locks[0].count),
      poolConnections: activeConns
    };
  } catch (error) {
    console.error("❌ [DA5] Échec du monitoring performance:", error);
    return null;
  }
};

export const disconnectDB = async () => {
  await prisma.$disconnect();
  console.log('✅ Database disconnected');
};