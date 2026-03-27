-- CreateTable
CREATE TABLE "blackjack_room_snapshots" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blackjack_room_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blackjack_room_snapshots_roomId_key" ON "blackjack_room_snapshots"("roomId");

-- CreateIndex
CREATE INDEX "blackjack_room_snapshots_updatedAt_idx" ON "blackjack_room_snapshots"("updatedAt");

-- AddForeignKey
ALTER TABLE "blackjack_room_snapshots" ADD CONSTRAINT "blackjack_room_snapshots_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "blackjack_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

