-- CreateEnum
CREATE TYPE "CosmeticGiftStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COSMETIC_GIFT';

-- CreateTable
CREATE TABLE "cosmetic_gift_offers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cosmeticId" TEXT NOT NULL,
    "status" "CosmeticGiftStatus" NOT NULL DEFAULT 'PENDING',
    "notificationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "cosmetic_gift_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cosmetic_gift_offers_userId_status_idx" ON "cosmetic_gift_offers"("userId", "status");

-- CreateIndex
CREATE INDEX "cosmetic_gift_offers_cosmeticId_idx" ON "cosmetic_gift_offers"("cosmeticId");

-- AddForeignKey
ALTER TABLE "cosmetic_gift_offers" ADD CONSTRAINT "cosmetic_gift_offers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cosmetic_gift_offers" ADD CONSTRAINT "cosmetic_gift_offers_cosmeticId_fkey" FOREIGN KEY ("cosmeticId") REFERENCES "cosmetic_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
