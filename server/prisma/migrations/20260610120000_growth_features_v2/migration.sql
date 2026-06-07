-- Growth features v2: referral, achievements, cosmetics, seasons, notifications

-- User profile extensions
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "equippedBannerId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "equippedFrameId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "equippedTitleId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_referralCode_key" ON "User"("referralCode");

-- PlayerStats streaks
ALTER TABLE "PlayerStats" ADD COLUMN IF NOT EXISTS "winStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PlayerStats" ADD COLUMN IF NOT EXISTS "lossStreak" INTEGER NOT NULL DEFAULT 0;

-- ReferralStatus enum
DO $$ BEGIN
  CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "referrals" (
  "id" TEXT NOT NULL,
  "referrerId" TEXT NOT NULL,
  "referredUserId" TEXT NOT NULL,
  "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
  "referrerRewardedAt" TIMESTAMP(3),
  "referredRewardedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "referrals_referredUserId_key" ON "referrals"("referredUserId");
CREATE INDEX IF NOT EXISTS "referrals_referrerId_idx" ON "referrals"("referrerId");
CREATE INDEX IF NOT EXISTS "referrals_status_idx" ON "referrals"("status");
DO $$ BEGIN
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Achievements
CREATE TABLE IF NOT EXISTS "user_achievements" (
  "userId" TEXT NOT NULL,
  "achievementId" TEXT NOT NULL,
  "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("userId","achievementId")
);
CREATE INDEX IF NOT EXISTS "user_achievements_achievementId_idx" ON "user_achievements"("achievementId");
DO $$ BEGIN
  ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Cosmetics
DO $$ BEGIN
  CREATE TYPE "CosmeticType" AS ENUM ('BANNER', 'AVATAR_FRAME', 'TITLE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "cosmetic_items" (
  "id" TEXT NOT NULL,
  "type" "CosmeticType" NOT NULL,
  "nameKey" TEXT NOT NULL,
  "priceChips" INTEGER NOT NULL DEFAULT 0,
  "purchasable" BOOLEAN NOT NULL DEFAULT true,
  "rarity" TEXT,
  "styleJson" TEXT,
  CONSTRAINT "cosmetic_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "cosmetic_items_type_idx" ON "cosmetic_items"("type");

CREATE TABLE IF NOT EXISTS "user_cosmetics" (
  "userId" TEXT NOT NULL,
  "cosmeticId" TEXT NOT NULL,
  "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_cosmetics_pkey" PRIMARY KEY ("userId","cosmeticId")
);
DO $$ BEGIN
  ALTER TABLE "user_cosmetics" ADD CONSTRAINT "user_cosmetics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "user_cosmetics" ADD CONSTRAINT "user_cosmetics_cosmeticId_fkey" FOREIGN KEY ("cosmeticId") REFERENCES "cosmetic_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seasons
DO $$ BEGIN
  CREATE TYPE "SeasonStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'ENDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "seasons" (
  "id" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" "SeasonStatus" NOT NULL DEFAULT 'UPCOMING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "seasons_number_key" ON "seasons"("number");
CREATE INDEX IF NOT EXISTS "seasons_status_idx" ON "seasons"("status");

CREATE TABLE IF NOT EXISTS "season_scores" (
  "id" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "xpEarned" INTEGER NOT NULL DEFAULT 0,
  "pokerWins" INTEGER NOT NULL DEFAULT 0,
  "beloteWins" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "season_scores_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "season_scores_seasonId_userId_key" ON "season_scores"("seasonId", "userId");
CREATE INDEX IF NOT EXISTS "season_scores_seasonId_xpEarned_idx" ON "season_scores"("seasonId", "xpEarned");
DO $$ BEGIN
  ALTER TABLE "season_scores" ADD CONSTRAINT "season_scores_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "season_scores" ADD CONSTRAINT "season_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "season_reward_claims" (
  "id" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tier" TEXT NOT NULL,
  "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "season_reward_claims_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "season_reward_claims_seasonId_userId_tier_key" ON "season_reward_claims"("seasonId", "userId", "tier");
CREATE INDEX IF NOT EXISTS "season_reward_claims_seasonId_idx" ON "season_reward_claims"("seasonId");

-- Notifications
DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('FRIEND_ONLINE', 'INVITATION', 'DAILY_REWARD', 'ACHIEVEMENT', 'SEASON_ENDED', 'REFERRAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "user_notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "payload" JSONB NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "user_notifications_userId_readAt_idx" ON "user_notifications"("userId", "readAt");
CREATE INDEX IF NOT EXISTS "user_notifications_userId_createdAt_idx" ON "user_notifications"("userId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
