-- Comptes e-mail : mot de passe déjà défini à l'inscription.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordSetAt" TIMESTAMP(3);

UPDATE "User"
SET "passwordSetAt" = NOW()
WHERE "passwordSetAt" IS NULL AND "authProvider" = 'LOCAL';
