-- CreateTable
CREATE TABLE "blackjack_room_invitations" (
    "id" TEXT NOT NULL,
    "blackjackRoomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blackjack_room_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blackjack_room_invitations_receiverId_status_idx" ON "blackjack_room_invitations"("receiverId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "blackjack_room_invitations_blackjackRoomId_receiverId_key" ON "blackjack_room_invitations"("blackjackRoomId", "receiverId");

-- AddForeignKey
ALTER TABLE "blackjack_room_invitations" ADD CONSTRAINT "blackjack_room_invitations_blackjackRoomId_fkey" FOREIGN KEY ("blackjackRoomId") REFERENCES "blackjack_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blackjack_room_invitations" ADD CONSTRAINT "blackjack_room_invitations_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blackjack_room_invitations" ADD CONSTRAINT "blackjack_room_invitations_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
