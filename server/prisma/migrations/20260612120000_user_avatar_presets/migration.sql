CREATE TABLE IF NOT EXISTS "user_avatar_presets" (
  "userId" TEXT NOT NULL,
  "presetId" TEXT NOT NULL,
  "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_avatar_presets_pkey" PRIMARY KEY ("userId","presetId")
);

DO $$ BEGIN
  ALTER TABLE "user_avatar_presets" ADD CONSTRAINT "user_avatar_presets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
