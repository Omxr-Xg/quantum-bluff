-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "friendsInboxSeenAt" TIMESTAMP(3);

-- Éviter une vague de « non lus » pour les comptes existants au déploiement.
UPDATE "User" SET "friendsInboxSeenAt" = CURRENT_TIMESTAMP WHERE "friendsInboxSeenAt" IS NULL;
