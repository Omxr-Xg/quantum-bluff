-- AlterTable
ALTER TABLE "casino_stats" ADD COLUMN     "blackjackBiggestWin" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "blackjackHandsPlayed" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "casino_stats_blackjackBiggestWin_idx" ON "casino_stats"("blackjackBiggestWin");
