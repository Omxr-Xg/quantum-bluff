-- 2FA TOTP (souvent ajouté avec les travaux OAuth / sécurité)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpSecret" TEXT;
