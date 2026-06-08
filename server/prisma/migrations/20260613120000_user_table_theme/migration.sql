ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tableFeltThemeId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tableFeltCustomColor" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tableFeltBackgroundId" TEXT NOT NULL DEFAULT 'ba1';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tableFeltBackgroundImage" BYTEA;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tableFeltBackgroundMime" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tableFeltBackgroundHasBinary" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "user_table_unlocks" (
  "userId" TEXT NOT NULL,
  "unlockId" TEXT NOT NULL,
  "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_table_unlocks_pkey" PRIMARY KEY ("userId","unlockId")
);

DO $$ BEGIN
  ALTER TABLE "user_table_unlocks" ADD CONSTRAINT "user_table_unlocks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
