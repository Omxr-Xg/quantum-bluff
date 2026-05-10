-- CreateEnum
CREATE TYPE "TournamentVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "TournamentJoinRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN "visibility" "TournamentVisibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateTable
CREATE TABLE "tournament_join_requests" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "status" "TournamentJoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_join_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tournament_join_requests_tournamentId_requesterId_key" ON "tournament_join_requests"("tournamentId", "requesterId");

-- CreateIndex
CREATE INDEX "tournament_join_requests_tournamentId_status_idx" ON "tournament_join_requests"("tournamentId", "status");

-- CreateIndex
CREATE INDEX "tournament_join_requests_requesterId_status_idx" ON "tournament_join_requests"("requesterId", "status");

-- AddForeignKey
ALTER TABLE "tournament_join_requests" ADD CONSTRAINT "tournament_join_requests_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_join_requests" ADD CONSTRAINT "tournament_join_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
