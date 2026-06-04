CREATE TYPE "BeloteGameVariant" AS ENUM ('CLASSIQUE', 'COINCHE', 'CONTEE', 'MODERNE');

ALTER TABLE "belote_rooms" ADD COLUMN "variant" "BeloteGameVariant" NOT NULL DEFAULT 'CONTEE';
