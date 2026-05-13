-- CreateEnum
CREATE TYPE "TournamentWinnerBetStatus" AS ENUM ('PENDING', 'WON', 'LOST', 'REFUNDED');

-- CreateTable
CREATE TABLE "tournament_winner_bets" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "bettorUserId" TEXT NOT NULL,
    "predictedWinnerUserId" TEXT NOT NULL,
    "stake" INTEGER NOT NULL,
    "status" "TournamentWinnerBetStatus" NOT NULL DEFAULT 'PENDING',
    "payout" INTEGER,
    "oddsSnapshot" DOUBLE PRECISION,
    "resolvedAt" TIMESTAMP(3),
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_winner_bets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tournament_winner_bets_tournamentId_idx" ON "tournament_winner_bets"("tournamentId");

-- CreateIndex
CREATE INDEX "tournament_winner_bets_tournamentId_status_idx" ON "tournament_winner_bets"("tournamentId", "status");

-- CreateIndex
CREATE INDEX "tournament_winner_bets_tournamentId_predictedWinnerUserId_idx" ON "tournament_winner_bets"("tournamentId", "predictedWinnerUserId");

-- CreateIndex
CREATE INDEX "tournament_winner_bets_bettorUserId_placedAt_idx" ON "tournament_winner_bets"("bettorUserId", "placedAt");

-- AddForeignKey
ALTER TABLE "tournament_winner_bets" ADD CONSTRAINT "tournament_winner_bets_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_winner_bets" ADD CONSTRAINT "tournament_winner_bets_bettorUserId_fkey" FOREIGN KEY ("bettorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_winner_bets" ADD CONSTRAINT "tournament_winner_bets_predictedWinnerUserId_fkey" FOREIGN KEY ("predictedWinnerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
