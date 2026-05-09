-- CreateTable FreeRecharge
CREATE TABLE "free_recharges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastRechargeAt" TIMESTAMP(3),
    "nextRechargeAfter" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "free_recharges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "free_recharges_userId_key" ON "free_recharges"("userId");

-- CreateIndex
CREATE INDEX "free_recharges_userId_idx" ON "free_recharges"("userId");

-- CreateIndex
CREATE INDEX "free_recharges_nextRechargeAfter_idx" ON "free_recharges"("nextRechargeAfter");

-- AddForeignKey
ALTER TABLE "free_recharges" ADD CONSTRAINT "free_recharges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
