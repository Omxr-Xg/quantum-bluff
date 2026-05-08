-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "loginStreakCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastLoginRewardDayKey" TEXT,
  ADD COLUMN "lastLoginRewardAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_lastLoginRewardDayKey_idx" ON "User"("lastLoginRewardDayKey");
