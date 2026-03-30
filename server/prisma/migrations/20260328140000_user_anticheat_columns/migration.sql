-- B4 anti-triche : colonnes sur User (alignées sur schema.prisma)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastIp" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "antiCheatAlerts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bannedUntil" TIMESTAMP(3);
