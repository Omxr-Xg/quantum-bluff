import { PrismaClient } from '../generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { rootLogger } from '../observability/logger.js'
import { metrics } from '../observability/metrics.js'
import { env } from './env.js'

const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  max: env.databasePoolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: env.databaseConnectTimeoutMs,
  keepAlive: true,
})

export const pgPool = pool

const adapter = new PrismaPg(pool as never)

export const prisma = new PrismaClient({
  adapter,
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' },
  ],
})

prisma.$on('error' as never, (e: { message?: string }) => {
  metrics.incDbError('prisma_client')
  rootLogger.error({
    msg: 'prisma_client_error',
    detail: e?.message ?? 'unknown',
  })
})

prisma.$on('query' as never, (e: { duration?: number }) => {
  const durationMs = e?.duration ?? 0

  if (!env.isJest && durationMs > 0) {
    metrics.observePrismaDurationMs('query', durationMs)
  }

  if (durationMs >= 100) {
    rootLogger.warn({
      msg: 'prisma_slow_query',
      durationMs,
      detail: 'seuil 100ms',
    })
  }
})

async function ensureWalletLedgerColumns(): Promise<void> {
  if (env.isJest || env.isProduction || env.isTest) {
    return
  }

  try {
    const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'wallet_ledger_entries'
      ) AS "exists"
    `

    if (!rows[0]?.exists) {
      return
    }

    const ddl = [
      'ALTER TABLE "wallet_ledger_entries" ADD COLUMN IF NOT EXISTS "game" TEXT',
      'ALTER TABLE "wallet_ledger_entries" ADD COLUMN IF NOT EXISTS "roundId" TEXT',
      'ALTER TABLE "wallet_ledger_entries" ADD COLUMN IF NOT EXISTS "actionId" TEXT',
      'ALTER TABLE "wallet_ledger_entries" ADD COLUMN IF NOT EXISTS "gameType" TEXT',
      'ALTER TABLE "wallet_ledger_entries" ADD COLUMN IF NOT EXISTS "balanceBefore" INTEGER',
      'ALTER TABLE "wallet_ledger_entries" ADD COLUMN IF NOT EXISTS "balanceAfter" INTEGER',
      'ALTER TABLE "wallet_ledger_entries" ADD COLUMN IF NOT EXISTS "settlementState" TEXT NOT NULL DEFAULT \'SETTLED\'',
      'ALTER TABLE "wallet_ledger_entries" ADD COLUMN IF NOT EXISTS "engineVersion" TEXT',
      'ALTER TABLE "wallet_ledger_entries" ADD COLUMN IF NOT EXISTS "rulesVersion" TEXT',
      'ALTER TABLE "wallet_ledger_entries" ADD COLUMN IF NOT EXISTS "payoutTableVersion" TEXT',
      'ALTER TABLE "wallet_ledger_entries" ADD COLUMN IF NOT EXISTS "rngVersion" TEXT',
      'ALTER TABLE "wallet_ledger_entries" ADD COLUMN IF NOT EXISTS "integrityHash" TEXT',
      'CREATE INDEX IF NOT EXISTS "wallet_ledger_entries_roundId_idx" ON "wallet_ledger_entries"("roundId")',
    ]

    for (const sql of ddl) {
      await prisma.$executeRawUnsafe(sql)
    }
  } catch (e) {
    rootLogger.warn({
      msg: 'wallet_ledger_columns_ensure_failed',
      detail: e instanceof Error ? e.message : String(e),
    })
  }
}

export const connectDB = async () => {
  try {
    await prisma.$connect()
    await prisma.$queryRaw`SELECT 1`
    await ensureWalletLedgerColumns()
    rootLogger.info({ msg: 'database_connected' })
  } catch (error) {
    metrics.incDbError('connect')
    rootLogger.error({
      msg: 'database_connection_failed',
      detail: error instanceof Error ? error.message : String(error),
    })
    process.exit(1)
  }
}

export const getDbPerformanceMetrics = async () => {
  try {
    const locks: { count: number }[] = await prisma.$queryRaw`
      SELECT count(*) as count FROM pg_locks WHERE granted = false;
    `

    const activeConns = pool.totalCount

    return {
      waitingLocks: Number(locks[0].count),
      poolConnections: activeConns,
    }
  } catch (error) {
    rootLogger.error({
      msg: 'db_performance_metrics_failed',
      detail: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

export const disconnectDB = async () => {
  await prisma.$disconnect()
  await pool.end()

  if (!env.isJest) {
    rootLogger.info({ msg: 'database_disconnected' })
  }
}
