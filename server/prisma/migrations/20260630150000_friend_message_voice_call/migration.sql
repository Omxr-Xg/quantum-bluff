-- Type de message ami (texte ou journal d'appel vocal)
CREATE TYPE "FriendMessageKind" AS ENUM ('TEXT', 'VOICE_CALL');

ALTER TABLE "friend_messages"
  ADD COLUMN "kind" "FriendMessageKind" NOT NULL DEFAULT 'TEXT',
  ADD COLUMN "callDurationSec" INTEGER,
  ADD COLUMN "callOutcome" TEXT;
