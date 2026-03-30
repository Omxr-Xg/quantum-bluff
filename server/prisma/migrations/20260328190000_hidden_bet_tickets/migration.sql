-- CreateEnum
CREATE TYPE "HiddenBetTicketStatus" AS ENUM ('PENDING', 'SETTLING', 'WON', 'LOST', 'VOID', 'CANCELED');

-- CreateEnum
CREATE TYPE "HiddenBetCombinator" AS ENUM ('SINGLE', 'AND');

-- CreateTable
CREATE TABLE "hidden_bet_tickets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "handId" TEXT NOT NULL,
    "status" "HiddenBetTicketStatus" NOT NULL DEFAULT 'PENDING',
    "stake" INTEGER NOT NULL,
    "quotedOdds" DOUBLE PRECISION NOT NULL,
    "potentialPayout" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CHIPS',
    "combinator" "HiddenBetCombinator" NOT NULL DEFAULT 'SINGLE',
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolutionStartedAt" TIMESTAMP(3),
    "actionId" TEXT NOT NULL,
    "pricingVersion" TEXT NOT NULL,
    "resolutionVersion" TEXT NOT NULL DEFAULT 'hidden-bets-resolve-v1',
    "resultSummaryJson" TEXT,
    "ticketHash" TEXT,
    "quoteHash" TEXT,
    "quotedProbability" DOUBLE PRECISION,

    CONSTRAINT "hidden_bet_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hidden_bet_selections" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "marketType" TEXT NOT NULL,
    "marketKey" TEXT NOT NULL,
    "paramSignature" TEXT NOT NULL,
    "paramsJson" TEXT NOT NULL,
    "displayLabel" TEXT,
    "sequenceOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "hidden_bet_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hidden_bet_hand_resolutions" (
    "gameId" TEXT NOT NULL,
    "handId" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hidden_bet_hand_resolutions_pkey" PRIMARY KEY ("gameId","handId")
);

-- CreateIndex
CREATE UNIQUE INDEX "hidden_bet_tickets_userId_actionId_key" ON "hidden_bet_tickets"("userId", "actionId");

-- CreateIndex
CREATE INDEX "hidden_bet_tickets_userId_gameId_handId_idx" ON "hidden_bet_tickets"("userId", "gameId", "handId");

-- CreateIndex
CREATE INDEX "hidden_bet_tickets_gameId_handId_status_idx" ON "hidden_bet_tickets"("gameId", "handId", "status");

-- CreateIndex
CREATE INDEX "hidden_bet_tickets_userId_status_idx" ON "hidden_bet_tickets"("userId", "status");

-- CreateIndex
CREATE INDEX "hidden_bet_selections_ticketId_idx" ON "hidden_bet_selections"("ticketId");

-- AddForeignKey
ALTER TABLE "hidden_bet_tickets" ADD CONSTRAINT "hidden_bet_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hidden_bet_selections" ADD CONSTRAINT "hidden_bet_selections_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "hidden_bet_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
