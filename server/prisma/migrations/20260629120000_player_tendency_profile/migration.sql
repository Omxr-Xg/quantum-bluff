-- CreateTable
CREATE TABLE "PlayerTendencyProfile" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "handsObserved" INTEGER NOT NULL DEFAULT 0,
    "vpipOpportunities" INTEGER NOT NULL DEFAULT 0,
    "vpipTaken" INTEGER NOT NULL DEFAULT 0,
    "pfrOpportunities" INTEGER NOT NULL DEFAULT 0,
    "pfrTaken" INTEGER NOT NULL DEFAULT 0,
    "raisesFacing" INTEGER NOT NULL DEFAULT 0,
    "foldsToRaise" INTEGER NOT NULL DEFAULT 0,
    "raisesMade" INTEGER NOT NULL DEFAULT 0,
    "raiseEquitySamples" INTEGER NOT NULL DEFAULT 0,
    "raiseEquitySumBp" INTEGER NOT NULL DEFAULT 0,
    "lowEquityRaises" INTEGER NOT NULL DEFAULT 0,
    "styleTag" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "styleScoreAggressive" INTEGER NOT NULL DEFAULT 0,
    "styleScoreTight" INTEGER NOT NULL DEFAULT 0,
    "styleScoreCallingStation" INTEGER NOT NULL DEFAULT 0,
    "lastStyleEvaluationAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerTendencyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerTendencyAction" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "handId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" INTEGER,
    "equityBp" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerTendencyAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerTendencyProfile_playerId_key" ON "PlayerTendencyProfile"("playerId");

-- CreateIndex
CREATE INDEX "PlayerTendencyProfile_playerId_idx" ON "PlayerTendencyProfile"("playerId");

-- CreateIndex
CREATE INDEX "PlayerTendencyAction_playerId_createdAt_idx" ON "PlayerTendencyAction"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "PlayerTendencyAction_gameId_idx" ON "PlayerTendencyAction"("gameId");

-- AddForeignKey
ALTER TABLE "PlayerTendencyProfile" ADD CONSTRAINT "PlayerTendencyProfile_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerTendencyAction" ADD CONSTRAINT "PlayerTendencyAction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
