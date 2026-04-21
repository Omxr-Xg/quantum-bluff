-- AlterTable
ALTER TABLE "User" ADD COLUMN "lobbyTutorialCompletedAt" TIMESTAMP(3);

-- Comptes déjà existants : ne pas leur imposer le tuto (première connexion = nouveaux comptes uniquement).
UPDATE "User" SET "lobbyTutorialCompletedAt" = "createdAt" WHERE "lobbyTutorialCompletedAt" IS NULL;
