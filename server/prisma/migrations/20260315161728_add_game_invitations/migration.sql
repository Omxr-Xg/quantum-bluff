-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "waiting_rooms" ALTER COLUMN "maxPlayers" SET DEFAULT 5;

-- CreateTable
CREATE TABLE "GameInvitation" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameInvitation_receiverId_status_idx" ON "GameInvitation"("receiverId", "status");

-- CreateIndex
CREATE INDEX "GameInvitation_roomId_idx" ON "GameInvitation"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "GameInvitation_roomId_receiverId_key" ON "GameInvitation"("roomId", "receiverId");

-- CreateIndex
CREATE INDEX "GameHistory_winnerId_idx" ON "GameHistory"("winnerId");

-- CreateIndex
CREATE INDEX "GameHistory_createdAt_idx" ON "GameHistory"("createdAt");

-- CreateIndex
CREATE INDEX "GameHistory_gameId_idx" ON "GameHistory"("gameId");

-- AddForeignKey
ALTER TABLE "GameInvitation" ADD CONSTRAINT "GameInvitation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "waiting_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameInvitation" ADD CONSTRAINT "GameInvitation_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameInvitation" ADD CONSTRAINT "GameInvitation_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
