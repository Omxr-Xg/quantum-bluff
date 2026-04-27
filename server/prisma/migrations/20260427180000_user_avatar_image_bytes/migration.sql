-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatarImage" BYTEA;
ALTER TABLE "User" ADD COLUMN "avatarMime" TEXT;
ALTER TABLE "User" ADD COLUMN "avatarHasBinary" BOOLEAN NOT NULL DEFAULT false;
UPDATE "User" SET "avatarHasBinary" = true WHERE "avatarImage" IS NOT NULL AND octet_length("avatarImage") > 0;
