import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import { rootLogger } from '../observability/logger.js';
import { metrics } from '../observability/metrics.js';

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
    { emit: 'event', level: 'error' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' },
  ],
});

/**
 * 🟡 DA5 : Monitoring des requêtes lentes
 * On écoute l'événement 'query' pour mesurer le temps d'exécution
 */
prisma.$on('error' as never, (e: { message?: string }) => {
  metrics.incDbError('prisma_client')
  rootLogger.error({
    msg: 'prisma_client_error',
    detail: e?.message ?? 'unknown',
  })
})

prisma.$on('query' as never, (e: { duration?: number; query?: string }) => {
  const durationMs = e?.duration ?? 0
  if (!process.env.JEST_WORKER_ID && durationMs > 0) {
    metrics.observePrismaDurationMs('query', durationMs)
  }
  if (durationMs >= 100) {
    rootLogger.warn({
      msg: 'prisma_slow_query',
      durationMs,
      detail: 'seuil 100ms',
    })
  }
});

export const connectDB = async () => {
  try {
    await prisma.$connect();
    rootLogger.info({ msg: 'database_connected' });
  } catch (error) {
    metrics.incDbError('connect');
    rootLogger.error({
      msg: 'database_connection_failed',
      detail: error instanceof Error ? error.message : String(error),
    });
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
    rootLogger.error({
      msg: 'db_performance_metrics_failed',
      detail: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

export const disconnectDB = async () => {
  await prisma.$disconnect();
  await pool.end();
  if (!process.env.JEST_WORKER_ID) {
    rootLogger.info({ msg: 'database_disconnected' });
  }
};