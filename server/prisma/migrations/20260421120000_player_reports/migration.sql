-- CreateEnum
CREATE TYPE "PlayerReportReason" AS ENUM ('INAPPROPRIATE_LANGUAGE', 'CHEATING', 'HARASSMENT', 'SPAM', 'OTHER');

-- CreateTable
CREATE TABLE "player_reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedUserId" TEXT NOT NULL,
    "gameId" TEXT,
    "reason" "PlayerReportReason" NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "player_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "player_reports_createdAt_idx" ON "player_reports"("createdAt");

-- CreateIndex
CREATE INDEX "player_reports_reviewedAt_idx" ON "player_reports"("reviewedAt");

-- CreateIndex
CREATE INDEX "player_reports_reportedUserId_idx" ON "player_reports"("reportedUserId");

-- AddForeignKey
ALTER TABLE "player_reports" ADD CONSTRAINT "player_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_reports" ADD CONSTRAINT "player_reports_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
