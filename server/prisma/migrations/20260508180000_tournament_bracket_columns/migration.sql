-- Bracket tournoi : colonnes pour reconstruction sans Redis
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "openingRoundTableCount" INTEGER;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "activeBracketPhase" TEXT;
