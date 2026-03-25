-- CreateEnum
CREATE TYPE "BlackjackRoomStatus" AS ENUM ('WAITING', 'PLAYING');

-- CreateTable
CREATE TABLE "blackjack_rooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "maxSeats" INTEGER NOT NULL DEFAULT 5,
    "visibility" "RoomVisibility" NOT NULL DEFAULT 'PUBLIC',
    "status" "BlackjackRoomStatus" NOT NULL DEFAULT 'WAITING',
    "gameId" TEXT,
    "minBet" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blackjack_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blackjack_room_seats" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blackjack_room_seats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blackjack_rooms_hostId_idx" ON "blackjack_rooms"("hostId");

-- CreateIndex
CREATE INDEX "blackjack_rooms_status_idx" ON "blackjack_rooms"("status");

-- CreateIndex
CREATE UNIQUE INDEX "blackjack_room_seats_roomId_userId_key" ON "blackjack_room_seats"("roomId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "blackjack_room_seats_roomId_position_key" ON "blackjack_room_seats"("roomId", "position");

-- AddForeignKey
ALTER TABLE "blackjack_rooms" ADD CONSTRAINT "blackjack_rooms_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blackjack_room_seats" ADD CONSTRAINT "blackjack_room_seats_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "blackjack_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blackjack_room_seats" ADD CONSTRAINT "blackjack_room_seats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
