-- Belote Assisted AI: bot seats, auto-fill, analytics, benchmark, training samples

CREATE TYPE "BeloteParticipantType" AS ENUM ('HUMAN', 'BOT');
CREATE TYPE "BeloteBotDifficulty" AS ENUM ('EASY', 'NORMAL', 'EXPERT');

ALTER TABLE "belote_rooms"
  ADD COLUMN "autoFillBotsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "autoFillBotsDelaySec" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "defaultBotDifficulty" "BeloteBotDifficulty" NOT NULL DEFAULT 'NORMAL';

ALTER TABLE "belote_room_seats"
  ADD COLUMN "participantType" "BeloteParticipantType" NOT NULL DEFAULT 'HUMAN',
  ADD COLUMN "botId" TEXT,
  ADD COLUMN "displayName" TEXT,
  ADD COLUMN "botDifficulty" "BeloteBotDifficulty" NOT NULL DEFAULT 'NORMAL';

ALTER TABLE "belote_room_seats" ALTER COLUMN "userId" DROP NOT NULL;

DROP INDEX IF EXISTS "belote_room_seats_roomId_userId_key";

CREATE UNIQUE INDEX "belote_room_seats_roomId_botId_key"
  ON "belote_room_seats"("roomId", "botId")
  WHERE "botId" IS NOT NULL;

CREATE UNIQUE INDEX "belote_room_seats_roomId_userId_key"
  ON "belote_room_seats"("roomId", "userId")
  WHERE "userId" IS NOT NULL;

CREATE TABLE "belote_model_versions" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "artifactUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "belote_model_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "belote_model_versions_slug_key" ON "belote_model_versions"("slug");

CREATE TABLE "belote_decision_metrics" (
  "id" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "handId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "decisionSource" TEXT NOT NULL,
  "modelVersionId" TEXT,
  "variant" "BeloteGameVariant" NOT NULL,
  "phase" TEXT NOT NULL,
  "decisionTimeMs" INTEGER NOT NULL,
  "wonDeal" BOOLEAN,
  "wonGame" BOOLEAN,
  "teamScoreDelta" INTEGER,
  "tricksWon" INTEGER,
  "biddingError" BOOLEAN NOT NULL DEFAULT false,
  "cutError" BOOLEAN NOT NULL DEFAULT false,
  "neuralRejected" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "belote_decision_metrics_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "belote_decision_metrics_decisionSource_variant_idx"
  ON "belote_decision_metrics"("decisionSource", "variant");
CREATE INDEX "belote_decision_metrics_modelVersionId_idx"
  ON "belote_decision_metrics"("modelVersionId");
CREATE INDEX "belote_decision_metrics_gameId_handId_idx"
  ON "belote_decision_metrics"("gameId", "handId");
CREATE INDEX "belote_decision_metrics_createdAt_idx"
  ON "belote_decision_metrics"("createdAt");

ALTER TABLE "belote_decision_metrics"
  ADD CONSTRAINT "belote_decision_metrics_modelVersionId_fkey"
  FOREIGN KEY ("modelVersionId") REFERENCES "belote_model_versions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "belote_benchmark_runs" (
  "id" TEXT NOT NULL,
  "modelVersionId" TEXT,
  "matchup" TEXT NOT NULL,
  "variant" "BeloteGameVariant" NOT NULL,
  "gamesPlayed" INTEGER NOT NULL,
  "teamAWins" INTEGER NOT NULL,
  "teamBWins" INTEGER NOT NULL,
  "avgScoreA" DOUBLE PRECISION NOT NULL,
  "avgScoreB" DOUBLE PRECISION NOT NULL,
  "illegalActions" INTEGER NOT NULL DEFAULT 0,
  "avgDecisionMs" DOUBLE PRECISION NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "finishedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "belote_benchmark_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "belote_benchmark_runs_modelVersionId_matchup_idx"
  ON "belote_benchmark_runs"("modelVersionId", "matchup");
CREATE INDEX "belote_benchmark_runs_finishedAt_idx"
  ON "belote_benchmark_runs"("finishedAt");

ALTER TABLE "belote_benchmark_runs"
  ADD CONSTRAINT "belote_benchmark_runs_modelVersionId_fkey"
  FOREIGN KEY ("modelVersionId") REFERENCES "belote_model_versions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "belote_training_samples" (
  "id" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "handId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "phase" TEXT NOT NULL,
  "variant" "BeloteGameVariant" NOT NULL,
  "gameStateJson" JSONB NOT NULL,
  "legalActionsJson" JSONB NOT NULL,
  "chosenActionJson" JSONB NOT NULL,
  "reward" DOUBLE PRECISION,
  "source" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "belote_training_samples_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "belote_training_samples_gameId_handId_idx"
  ON "belote_training_samples"("gameId", "handId");
CREATE INDEX "belote_training_samples_variant_phase_idx"
  ON "belote_training_samples"("variant", "phase");
CREATE INDEX "belote_training_samples_createdAt_idx"
  ON "belote_training_samples"("createdAt");

INSERT INTO "belote_model_versions" ("id", "slug", "label", "isActive")
VALUES (gen_random_uuid()::text, 'belote-heuristic-v0', 'Heuristique NORMAL (V1)', true)
ON CONFLICT DO NOTHING;
