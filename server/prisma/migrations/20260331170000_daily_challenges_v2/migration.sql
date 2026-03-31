-- CreateTable
CREATE TABLE "daily_challenge_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "challengeCode" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "goal" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "rewardTokens" INTEGER NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_challenge_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_challenge_progress_userId_dayKey_challengeCode_key"
ON "daily_challenge_progress"("userId", "dayKey", "challengeCode");

-- CreateIndex
CREATE INDEX "daily_challenge_progress_userId_dayKey_idx"
ON "daily_challenge_progress"("userId", "dayKey");

-- CreateIndex
CREATE INDEX "daily_challenge_progress_dayKey_challengeCode_idx"
ON "daily_challenge_progress"("dayKey", "challengeCode");

-- AddForeignKey
ALTER TABLE "daily_challenge_progress"
ADD CONSTRAINT "daily_challenge_progress_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
