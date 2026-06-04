-- Supabase Advisors: covering index for GameInvitation_senderId_fkey

CREATE INDEX IF NOT EXISTS "GameInvitation_senderId_idx" ON "GameInvitation"("senderId");
