-- Tournois Belote : type de jeu + colonnes variante/score/mise + vainqueurs d'équipe par table.

CREATE TYPE "TournamentGameType" AS ENUM ('POKER', 'BELOTE');

ALTER TABLE "tournaments" ADD COLUMN "gameType" "TournamentGameType" NOT NULL DEFAULT 'POKER';
ALTER TABLE "tournaments" ADD COLUMN "beloteVariant" "BeloteGameVariant";
ALTER TABLE "tournaments" ADD COLUMN "beloteTargetScore" INTEGER;
ALTER TABLE "tournaments" ADD COLUMN "beloteBuyIn" INTEGER;

ALTER TABLE "tournament_tables" ADD COLUMN "advancingUserIds" JSONB;

CREATE INDEX "tournaments_gameType_status_startAt_idx" ON "tournaments"("gameType", "status", "startAt");
