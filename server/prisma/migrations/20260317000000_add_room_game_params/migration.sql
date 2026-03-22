-- AlterTable
ALTER TABLE "waiting_rooms" ADD COLUMN IF NOT EXISTS "smallBlind" INTEGER;
ALTER TABLE "waiting_rooms" ADD COLUMN IF NOT EXISTS "bigBlind" INTEGER;
ALTER TABLE "waiting_rooms" ADD COLUMN IF NOT EXISTS "minBalance" INTEGER;
