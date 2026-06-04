-- Supabase Advisors: covering index for blackjack_room_invitations_senderId_fkey

CREATE INDEX IF NOT EXISTS "blackjack_room_invitations_senderId_idx" ON "blackjack_room_invitations"("senderId");
