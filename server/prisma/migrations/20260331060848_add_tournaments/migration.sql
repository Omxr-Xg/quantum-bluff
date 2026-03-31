-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELED');

-- DropIndex
DROP INDEX "wallet_ledger_entries_actionId_userId_reason_key";

-- DropIndex
DROP INDEX "wallet_ledger_entries_userId_createdAt_idx";

-- AlterTable
ALTER TABLE "wallet_ledger_entries" ALTER COLUMN "roundId" DROP NOT NULL,
ALTER COLUMN "actionId" DROP NOT NULL,
ALTER COLUMN "gameType" DROP NOT NULL,
ALTER COLUMN "balanceBefore" DROP NOT NULL,
ALTER COLUMN "balanceAfter" DROP NOT NULL,
ALTER COLUMN "engineVersion" DROP NOT NULL,
ALTER COLUMN "rulesVersion" DROP NOT NULL,
ALTER COLUMN "payoutTableVersion" DROP NOT NULL,
ALTER COLUMN "rngVersion" DROP NOT NULL,
ALTER COLUMN "integrityHash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "buyIn" INTEGER NOT NULL,
    "maxPlayers" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'PENDING',
    "prizePool" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_players" (
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eliminatedAt" TIMESTAMP(3),

    CONSTRAINT "tournament_players_pkey" PRIMARY KEY ("tournamentId","userId")
);

-- CreateIndex
CREATE INDEX "wallet_ledger_entries_userId_idx" ON "wallet_ledger_entries"("userId");

-- CreateIndex
CREATE INDEX "wallet_ledger_entries_createdAt_idx" ON "wallet_ledger_entries"("createdAt");

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_players" ADD CONSTRAINT "tournament_players_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_players" ADD CONSTRAINT "tournament_players_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
