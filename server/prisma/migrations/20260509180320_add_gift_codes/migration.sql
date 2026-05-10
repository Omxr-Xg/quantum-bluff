/*
  Warnings:

  - The `resultSummaryJson` column on the `hidden_bet_tickets` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `stateSnapshotJson` column on the `hidden_bet_tickets` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropForeignKey
ALTER TABLE "blackjack_room_seats" DROP CONSTRAINT "blackjack_room_seats_userId_fkey";

-- DropForeignKey
ALTER TABLE "join_requests" DROP CONSTRAINT "join_requests_userId_fkey";

-- DropForeignKey
ALTER TABLE "room_players" DROP CONSTRAINT "room_players_userId_fkey";

-- AlterTable
ALTER TABLE "hidden_bet_tickets" DROP COLUMN "resultSummaryJson",
ADD COLUMN     "resultSummaryJson" JSONB,
DROP COLUMN "stateSnapshotJson",
ADD COLUMN     "stateSnapshotJson" JSONB;

-- CreateTable
CREATE TABLE "gift_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER NOT NULL DEFAULT -1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_code_usages" (
    "id" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_code_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gift_codes_code_key" ON "gift_codes"("code");

-- CreateIndex
CREATE INDEX "gift_codes_code_idx" ON "gift_codes"("code");

-- CreateIndex
CREATE INDEX "gift_codes_expiresAt_idx" ON "gift_codes"("expiresAt");

-- CreateIndex
CREATE INDEX "gift_codes_type_idx" ON "gift_codes"("type");

-- CreateIndex
CREATE INDEX "gift_code_usages_userId_idx" ON "gift_code_usages"("userId");

-- CreateIndex
CREATE INDEX "gift_code_usages_codeId_idx" ON "gift_code_usages"("codeId");

-- CreateIndex
CREATE INDEX "gift_code_usages_usedAt_idx" ON "gift_code_usages"("usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "gift_code_usages_codeId_userId_key" ON "gift_code_usages"("codeId", "userId");

-- CreateIndex
CREATE INDEX "blackjack_rooms_visibility_status_idx" ON "blackjack_rooms"("visibility", "status");

-- CreateIndex
CREATE INDEX "loan_repayments_borrowerId_createdAt_idx" ON "loan_repayments"("borrowerId", "createdAt");

-- CreateIndex
CREATE INDEX "loan_repayments_lenderId_createdAt_idx" ON "loan_repayments"("lenderId", "createdAt");

-- CreateIndex
CREATE INDEX "tournaments_status_startTime_idx" ON "tournaments"("status", "startTime");

-- AddForeignKey
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_players" ADD CONSTRAINT "room_players_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blackjack_room_seats" ADD CONSTRAINT "blackjack_room_seats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_code_usages" ADD CONSTRAINT "gift_code_usages_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "gift_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_code_usages" ADD CONSTRAINT "gift_code_usages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
