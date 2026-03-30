-- Avatar public URL supplied by client when joining / creating waiting room (sanitized server-side).
ALTER TABLE "room_players" ADD COLUMN "avatarUrl" TEXT;
