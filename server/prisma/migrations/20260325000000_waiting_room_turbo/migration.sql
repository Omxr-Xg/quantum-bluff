-- AlterTable (IF NOT EXISTS : tolère base déjà alignée / échec partiel)
ALTER TABLE "waiting_rooms" ADD COLUMN IF NOT EXISTS "turbo" BOOLEAN NOT NULL DEFAULT false;
