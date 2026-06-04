-- Index FK belote (après 20260603120000_belote_v1)

CREATE INDEX IF NOT EXISTS "belote_join_requests_userId_idx" ON "belote_join_requests"("userId");
CREATE INDEX IF NOT EXISTS "belote_room_invitations_senderId_idx" ON "belote_room_invitations"("senderId");
CREATE INDEX IF NOT EXISTS "belote_room_seats_userId_idx" ON "belote_room_seats"("userId");
