-- Belote V1: rooms, waiting, results, stats

CREATE TYPE "BeloteRoomStatus" AS ENUM ('WAITING', 'STARTING', 'IN_GAME');

CREATE TABLE "belote_rooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "maxPlayers" INTEGER NOT NULL DEFAULT 4,
    "visibility" "RoomVisibility" NOT NULL DEFAULT 'PUBLIC',
    "status" "BeloteRoomStatus" NOT NULL DEFAULT 'WAITING',
    "joinCode" TEXT,
    "passwordHash" TEXT,
    "targetScore" INTEGER NOT NULL DEFAULT 1000,
    "gameId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "belote_rooms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "belote_room_seats" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "team" TEXT,
    "avatarUrl" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "belote_room_seats_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "belote_join_requests" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "belote_join_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "belote_room_invitations" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "belote_room_invitations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "belote_game_snapshots" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "belote_game_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "belote_game_results" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "roomId" TEXT,
    "teamAScore" INTEGER NOT NULL,
    "teamBScore" INTEGER NOT NULL,
    "winningTeam" TEXT NOT NULL,
    "targetScore" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" JSONB,

    CONSTRAINT "belote_game_results_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "belote_game_result_players" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "won" BOOLEAN NOT NULL,

    CONSTRAINT "belote_game_result_players_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "belote_player_stats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "belote_player_stats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "belote_rooms_joinCode_key" ON "belote_rooms"("joinCode");
CREATE INDEX "belote_rooms_hostId_idx" ON "belote_rooms"("hostId");
CREATE INDEX "belote_rooms_status_idx" ON "belote_rooms"("status");
CREATE INDEX "belote_rooms_visibility_status_idx" ON "belote_rooms"("visibility", "status");

CREATE UNIQUE INDEX "belote_room_seats_roomId_userId_key" ON "belote_room_seats"("roomId", "userId");
CREATE UNIQUE INDEX "belote_room_seats_roomId_position_key" ON "belote_room_seats"("roomId", "position");
CREATE INDEX "belote_room_seats_roomId_idx" ON "belote_room_seats"("roomId");

CREATE UNIQUE INDEX "belote_join_requests_roomId_userId_key" ON "belote_join_requests"("roomId", "userId");
CREATE INDEX "belote_join_requests_roomId_status_idx" ON "belote_join_requests"("roomId", "status");

CREATE UNIQUE INDEX "belote_room_invitations_roomId_receiverId_key" ON "belote_room_invitations"("roomId", "receiverId");
CREATE INDEX "belote_room_invitations_receiverId_status_idx" ON "belote_room_invitations"("receiverId", "status");

CREATE UNIQUE INDEX "belote_game_snapshots_roomId_key" ON "belote_game_snapshots"("roomId");
CREATE INDEX "belote_game_snapshots_gameId_idx" ON "belote_game_snapshots"("gameId");

CREATE UNIQUE INDEX "belote_game_results_gameId_key" ON "belote_game_results"("gameId");
CREATE INDEX "belote_game_results_endedAt_idx" ON "belote_game_results"("endedAt");

CREATE UNIQUE INDEX "belote_game_result_players_resultId_userId_key" ON "belote_game_result_players"("resultId", "userId");
CREATE INDEX "belote_game_result_players_userId_idx" ON "belote_game_result_players"("userId");

CREATE UNIQUE INDEX "belote_player_stats_userId_key" ON "belote_player_stats"("userId");
CREATE INDEX "belote_player_stats_wins_idx" ON "belote_player_stats"("wins");

ALTER TABLE "belote_rooms" ADD CONSTRAINT "belote_rooms_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "belote_room_seats" ADD CONSTRAINT "belote_room_seats_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "belote_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "belote_room_seats" ADD CONSTRAINT "belote_room_seats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "belote_join_requests" ADD CONSTRAINT "belote_join_requests_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "belote_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "belote_join_requests" ADD CONSTRAINT "belote_join_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "belote_room_invitations" ADD CONSTRAINT "belote_room_invitations_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "belote_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "belote_room_invitations" ADD CONSTRAINT "belote_room_invitations_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "belote_room_invitations" ADD CONSTRAINT "belote_room_invitations_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "belote_game_snapshots" ADD CONSTRAINT "belote_game_snapshots_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "belote_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "belote_game_result_players" ADD CONSTRAINT "belote_game_result_players_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "belote_game_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "belote_game_result_players" ADD CONSTRAINT "belote_game_result_players_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "belote_player_stats" ADD CONSTRAINT "belote_player_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
