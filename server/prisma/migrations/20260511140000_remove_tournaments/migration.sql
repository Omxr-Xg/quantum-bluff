-- Remove tournament feature (tables + enums)
DROP TABLE IF EXISTS "tournament_join_requests";
DROP TABLE IF EXISTS "tournament_players";
DROP TABLE IF EXISTS "tournaments";
DROP TYPE IF EXISTS "TournamentJoinRequestStatus";
DROP TYPE IF EXISTS "TournamentVisibility";
DROP TYPE IF EXISTS "TournamentStatus";
