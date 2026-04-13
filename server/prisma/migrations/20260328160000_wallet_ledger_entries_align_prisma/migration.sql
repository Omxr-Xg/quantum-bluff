-- Si `wallet_ledger_entries` existait déjà (ancien schéma Prisma) avant
-- 20260327183000, `CREATE TABLE IF NOT EXISTS` n’a rien fait et la table n’a pas
-- roundId, actionId, etc. On aligne la base sur le modèle actuel.

-- Colonne présente dans schema.prisma mais absente de 20260327183000
ALTER TABLE "wallet_ledger_entries" ADD COLUMN IF NOT EXISTS "game" TEXT;

ALTER TABLE "wallet_ledger_entries" ADD COLUMN IF NOT EXISTS "roundId" TEXT;
ALTER TABLE "wallet_ledger_entries" ADD COLUMN IF NOT EXISTS "actionId" TEXT;
ALTER TABLE "wallet_ledger_entries" ADD COLUMN IF NOT EXISTS "gameType" TEXT;
ALTER TABLE "wallet_ledger_entries" ADD COLUMN IF NOT EXISTS "balanceBefore" INTEGER;
ALTER TABLE "wallet_ledger_entries" ADD COLUMN IF NOT EXISTS "balanceAfter" INTEGER;
ALTER TABLE "wallet_ledger_entries" ADD COLUMN IF NOT EXISTS "settlementState" TEXT NOT NULL DEFAULT 'SETTLED';
ALTER TABLE "wallet_ledger_entries" ADD COLUMN IF NOT EXISTS "engineVersion" TEXT;
ALTER TABLE "wallet_ledger_entries" ADD COLUMN IF NOT EXISTS "rulesVersion" TEXT;
ALTER TABLE "wallet_ledger_entries" ADD COLUMN IF NOT EXISTS "payoutTableVersion" TEXT;
ALTER TABLE "wallet_ledger_entries" ADD COLUMN IF NOT EXISTS "rngVersion" TEXT;
ALTER TABLE "wallet_ledger_entries" ADD COLUMN IF NOT EXISTS "integrityHash" TEXT;

CREATE INDEX IF NOT EXISTS "wallet_ledger_entries_roundId_idx"
  ON "wallet_ledger_entries"("roundId");
