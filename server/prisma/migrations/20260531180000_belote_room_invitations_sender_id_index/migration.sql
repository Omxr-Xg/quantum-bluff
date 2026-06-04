-- Supabase Advisors: covering index for belote_room_invitations_senderId_fkey

CREATE INDEX "belote_room_invitations_senderId_idx" ON "belote_room_invitations"("senderId");
