-- AlterEnum
ALTER TYPE "TournamentStatus" ADD VALUE 'WAITING_READY_CHECK';

-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN "nextRoundReadyOpen" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tournaments" ADD COLUMN "nextRoundReadyDeadline" TIMESTAMP(3);
ALTER TABLE "tournaments" ADD COLUMN "nextRoundReadyNumber" INTEGER;

-- CreateTable
CREATE TABLE "tournament_round_ready" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "readyAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autoReady" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tournament_round_ready_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tournament_round_ready_tournamentId_roundNumber_userId_key" ON "tournament_round_ready"("tournamentId", "roundNumber", "userId");

-- CreateIndex
CREATE INDEX "tournament_round_ready_tournamentId_roundNumber_idx" ON "tournament_round_ready"("tournamentId", "roundNumber");

-- AddForeignKey
ALTER TABLE "tournament_round_ready" ADD CONSTRAINT "tournament_round_ready_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
