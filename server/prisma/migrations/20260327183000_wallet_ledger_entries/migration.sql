CREATE TABLE IF NOT EXISTS "wallet_ledger_entries" (
  "id" TEXT NOT NULL,
  "roundId" TEXT NOT NULL,
  "actionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "gameType" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "balanceBefore" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "settlementState" TEXT NOT NULL DEFAULT 'SETTLED',
  "engineVersion" TEXT NOT NULL,
  "rulesVersion" TEXT NOT NULL,
  "payoutTableVersion" TEXT NOT NULL,
  "rngVersion" TEXT NOT NULL,
  "integrityHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallet_ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "wallet_ledger_entries_actionId_userId_reason_key"
  ON "wallet_ledger_entries"("actionId", "userId", "reason");

CREATE INDEX IF NOT EXISTS "wallet_ledger_entries_roundId_idx"
  ON "wallet_ledger_entries"("roundId");

CREATE INDEX IF NOT EXISTS "wallet_ledger_entries_userId_createdAt_idx"
  ON "wallet_ledger_entries"("userId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'wallet_ledger_entries_userId_fkey'
  ) THEN
    ALTER TABLE "wallet_ledger_entries"
      ADD CONSTRAINT "wallet_ledger_entries_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

