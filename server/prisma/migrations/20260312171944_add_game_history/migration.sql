-- DropForeignKey
ALTER TABLE "GameHistory" DROP CONSTRAINT "GameHistory_winnerId_fkey";

-- AlterTable
ALTER TABLE "GameHistory" ALTER COLUMN "winnerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "GameHistory" ADD CONSTRAINT "GameHistory_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
