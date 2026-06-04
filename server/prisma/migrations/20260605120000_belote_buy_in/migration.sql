-- Mise d'entrée configurable par salle belote
ALTER TABLE "belote_rooms" ADD COLUMN "buyIn" INTEGER NOT NULL DEFAULT 100;
