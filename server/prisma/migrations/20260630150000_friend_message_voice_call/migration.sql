-- Type de message ami (texte ou journal d'appel vocal)
CREATE TYPE "FriendMessageKind" AS ENUM ('TEXT', 'VOICE_CALL');

ALTER TABLE "FriendMessage"
  ADD COLUMN "kind" "FriendMessageKind" NOT NULL DEFAULT 'TEXT',
  ADD COLUMN "callDurationSec" INTEGER,
  ADD COLUMN "callOutcome" TEXT;
