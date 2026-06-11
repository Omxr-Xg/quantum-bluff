-- Mot de passe optionnel pour salles privées (poker waiting room, blackjack multi)
ALTER TABLE "waiting_rooms" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "blackjack_rooms" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
