-- Supabase Advisors: covering index for GameInvitation_senderId_fkey

CREATE INDEX "GameInvitation_senderId_idx" ON "GameInvitation"("senderId");
