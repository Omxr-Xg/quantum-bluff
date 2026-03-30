-- CreateEnum
CREATE TYPE "HiddenBetMarketPhase" AS ENUM ('PRE_HAND', 'LIVE_FLOP', 'LIVE_TURN', 'LIVE_RIVER');

-- AlterTable
ALTER TABLE "hidden_bet_tickets" ADD COLUMN "marketPhase" "HiddenBetMarketPhase" NOT NULL DEFAULT 'PRE_HAND';
ALTER TABLE "hidden_bet_tickets" ADD COLUMN "quoteExpiresAt" TIMESTAMP(3);
ALTER TABLE "hidden_bet_tickets" ADD COLUMN "stateSnapshotJson" TEXT;
ALTER TABLE "hidden_bet_tickets" ADD COLUMN "houseEdgeVersion" TEXT;

-- Backfill legacy pricing version label for display/history consistency (read-only semantics preserved)
UPDATE "hidden_bet_tickets" SET "pricingVersion" = 'hidden-bets-pre-v1' WHERE "pricingVersion" = 'hidden-bets-v1';

-- CreateIndex
CREATE INDEX "hidden_bet_tickets_gameId_handId_marketPhase_idx" ON "hidden_bet_tickets"("gameId", "handId", "marketPhase");
