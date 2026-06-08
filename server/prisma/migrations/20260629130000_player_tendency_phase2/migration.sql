-- AlterTable
ALTER TABLE "PlayerTendencyProfile" ADD COLUMN "positionStats" JSONB;

-- AlterTable
ALTER TABLE "PlayerTendencyAction" ADD COLUMN "position" TEXT;
ALTER TABLE "PlayerTendencyAction" ADD COLUMN "potBefore" INTEGER;

-- CreateIndex
CREATE INDEX "PlayerTendencyAction_handId_idx" ON "PlayerTendencyAction"("handId");

-- CreateTable
CREATE TABLE "PlayerTendencyHandSummary" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "handId" TEXT NOT NULL,
    "position" TEXT,
    "vpip" BOOLEAN NOT NULL DEFAULT false,
    "pfr" BOOLEAN NOT NULL DEFAULT false,
    "raised" BOOLEAN NOT NULL DEFAULT false,
    "lowEquityRaises" INTEGER NOT NULL DEFAULT 0,
    "foldsToRaise" INTEGER NOT NULL DEFAULT 0,
    "reachedShowdown" BOOLEAN NOT NULL DEFAULT false,
    "wonPot" BOOLEAN NOT NULL DEFAULT false,
    "endedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerTendencyHandSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotSimulationRun" (
    "id" TEXT NOT NULL,
    "matchup" TEXT NOT NULL,
    "handsPlayed" INTEGER NOT NULL,
    "gitSha" TEXT,
    "engineVersion" TEXT,
    "metricsJson" JSONB NOT NULL,
    "isBaseline" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotSimulationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerTendencyHandSummary_playerId_handId_key" ON "PlayerTendencyHandSummary"("playerId", "handId");

-- CreateIndex
CREATE INDEX "PlayerTendencyHandSummary_playerId_gameId_endedAt_idx" ON "PlayerTendencyHandSummary"("playerId", "gameId", "endedAt");

-- CreateIndex
CREATE INDEX "BotSimulationRun_matchup_completedAt_idx" ON "BotSimulationRun"("matchup", "completedAt");

-- CreateIndex
CREATE INDEX "BotSimulationRun_isBaseline_idx" ON "BotSimulationRun"("isBaseline");

-- AddForeignKey
ALTER TABLE "PlayerTendencyHandSummary" ADD CONSTRAINT "PlayerTendencyHandSummary_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PlayerTendencyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
