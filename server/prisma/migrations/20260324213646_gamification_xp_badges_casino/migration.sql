-- AlterTable
ALTER TABLE "User" ADD COLUMN     "experience" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "casino_stats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slotSpins" INTEGER NOT NULL DEFAULT 0,
    "rouletteSpins" INTEGER NOT NULL DEFAULT 0,
    "slotBiggestWin" INTEGER NOT NULL DEFAULT 0,
    "rouletteBiggestWin" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "casino_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "casino_stats_userId_key" ON "casino_stats"("userId");

-- CreateIndex
CREATE INDEX "casino_stats_slotBiggestWin_idx" ON "casino_stats"("slotBiggestWin");

-- CreateIndex
CREATE INDEX "casino_stats_rouletteBiggestWin_idx" ON "casino_stats"("rouletteBiggestWin");

-- CreateIndex
CREATE INDEX "user_badges_userId_idx" ON "user_badges"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_userId_badgeId_key" ON "user_badges"("userId", "badgeId");

-- CreateIndex
CREATE INDEX "User_chips_idx" ON "User"("chips");

-- CreateIndex
CREATE INDEX "User_experience_idx" ON "User"("experience");

-- AddForeignKey
ALTER TABLE "casino_stats" ADD CONSTRAINT "casino_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
