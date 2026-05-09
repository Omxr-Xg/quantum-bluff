-- AlterTable
ALTER TABLE "gift_codes" ADD COLUMN "usageType" TEXT NOT NULL DEFAULT 'TOKENS';

-- CreateIndex
CREATE INDEX "gift_codes_usageType_idx" ON "gift_codes"("usageType");
