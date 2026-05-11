-- CreateEnum
CREATE TYPE "TournamentVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('REGISTRATION_OPEN', 'STARTING', 'ROUND_IN_PROGRESS', 'WAITING_FOR_TABLES', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TournamentPlayerStatus" AS ENUM ('REGISTERED', 'ACTIVE', 'WAITING_NEXT_ROUND', 'ELIMINATED', 'WINNER');

-- CreateEnum
CREATE TYPE "TournamentRoundStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TournamentTableStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RECOVERING');

-- CreateEnum
CREATE TYPE "TournamentRewardLedgerKind" AS ENUM ('CHIPS_WINNER', 'XP_PLACEMENT');

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "visibility" "TournamentVisibility" NOT NULL DEFAULT 'PUBLIC',
    "codeHash" TEXT,
    "status" "TournamentStatus" NOT NULL DEFAULT 'REGISTRATION_OPEN',
    "maxPlayers" INTEGER NOT NULL,
    "initialStack" INTEGER NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "blindSmall" INTEGER NOT NULL,
    "blindBig" INTEGER NOT NULL,
    "currentRoundNumber" INTEGER NOT NULL DEFAULT 0,
    "bracketJson" JSONB,
    "finalTablePlayerIds" JSONB,
    "finalTableInitialStackSum" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_players" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "TournamentPlayerStatus" NOT NULL DEFAULT 'REGISTERED',
    "eliminatedAt" TIMESTAMP(3),
    "finalRank" INTEGER,
    "eliminationOrder" INTEGER,
    "eliminatedFromTableId" TEXT,
    "qualifiedRound" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_rounds" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "status" "TournamentRoundStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "tournament_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_tables" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "status" "TournamentTableStatus" NOT NULL DEFAULT 'PENDING',
    "winnerUserId" TEXT,
    "playerCount" INTEGER NOT NULL DEFAULT 0,
    "isFinalTable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_reward_ledger" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "TournamentRewardLedgerKind" NOT NULL,
    "chipsAmount" INTEGER,
    "xpDelta" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_reward_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tournament_players_tournamentId_userId_key" ON "tournament_players"("tournamentId", "userId");

-- CreateIndex
CREATE INDEX "tournament_players_tournamentId_status_idx" ON "tournament_players"("tournamentId", "status");

-- CreateIndex
CREATE INDEX "tournament_players_userId_idx" ON "tournament_players"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_rounds_tournamentId_roundNumber_key" ON "tournament_rounds"("tournamentId", "roundNumber");

-- CreateIndex
CREATE INDEX "tournament_rounds_tournamentId_status_idx" ON "tournament_rounds"("tournamentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_tables_gameId_key" ON "tournament_tables"("gameId");

-- CreateIndex
CREATE INDEX "tournament_tables_roundId_status_idx" ON "tournament_tables"("roundId", "status");

-- CreateIndex
CREATE INDEX "tournament_tables_gameId_idx" ON "tournament_tables"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_reward_ledger_tournamentId_userId_kind_key" ON "tournament_reward_ledger"("tournamentId", "userId", "kind");

-- CreateIndex
CREATE INDEX "tournament_reward_ledger_tournamentId_idx" ON "tournament_reward_ledger"("tournamentId");

-- CreateIndex
CREATE INDEX "tournaments_status_startAt_idx" ON "tournaments"("status", "startAt");

-- CreateIndex
CREATE INDEX "tournaments_hostId_idx" ON "tournaments"("hostId");

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_players" ADD CONSTRAINT "tournament_players_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_players" ADD CONSTRAINT "tournament_players_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_rounds" ADD CONSTRAINT "tournament_rounds_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_tables" ADD CONSTRAINT "tournament_tables_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "tournament_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_reward_ledger" ADD CONSTRAINT "tournament_reward_ledger_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
