import type { PrismaClient } from '../generated/prisma/index.js'
import { prisma } from '../config/database.js'
import { createWalletLedgerMovement } from '../casino/services/walletLedger.service.js'
import { createNotification } from '../notifications/notification.service.js'
import { grantCosmetic } from '../shop/shop.service.js'
import { ACHIEVEMENT_BY_ID, type AchievementDefinition } from './achievement.catalog.js'

type Tx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>

export type AchievementEventType =
  | 'LOGIN_STREAK'
  | 'FRIEND_ADDED'
  | 'VOICE_CALL'
  | 'CASINO_SPIN'
  | 'CASINO_JACKPOT'
  | 'BELOTE_WIN'
  | 'POKER_HAND'
  | 'POKER_WIN'
  | 'CHIPS_BALANCE'

export type AchievementEvent =
  | { type: 'LOGIN_STREAK'; streakCount: number }
  | { type: 'FRIEND_ADDED'; friendsCount: number }
  | { type: 'VOICE_CALL' }
  | { type: 'CASINO_SPIN'; totalGames: number; blackjackBiggestWin?: number }
  | { type: 'CASINO_JACKPOT' }
  | { type: 'BELOTE_WIN'; wins: number }
  | { type: 'POKER_HAND'; handsPlayed: number }
  | { type: 'POKER_WIN'; wins: number }
  | { type: 'CHIPS_BALANCE'; chips: number }

export type UnlockedAchievement = {
  achievementId: string
  rewardChips: number
  rewardCosmeticId: string | null
}

function candidatesForEvent(event: AchievementEvent): AchievementDefinition[] {
  switch (event.type) {
    case 'LOGIN_STREAK':
      return [
        ACHIEVEMENT_BY_ID.get('login_streak_7')!,
        ACHIEVEMENT_BY_ID.get('login_streak_30')!,
      ].filter(Boolean)
    case 'FRIEND_ADDED':
      return [
        ACHIEVEMENT_BY_ID.get('first_friend')!,
        ACHIEVEMENT_BY_ID.get('friends_10')!,
      ].filter(Boolean)
    case 'VOICE_CALL':
      return [ACHIEVEMENT_BY_ID.get('first_voice_call')!].filter(Boolean)
    case 'CASINO_JACKPOT':
      return [ACHIEVEMENT_BY_ID.get('first_jackpot')!].filter(Boolean)
    case 'CASINO_SPIN':
      return [
        ACHIEVEMENT_BY_ID.get('casino_games_100')!,
        ACHIEVEMENT_BY_ID.get('blackjack_king')!,
      ].filter(Boolean)
    case 'BELOTE_WIN':
      return [
        ACHIEVEMENT_BY_ID.get('belote_wins_10')!,
        ACHIEVEMENT_BY_ID.get('belote_wins_100')!,
        ACHIEVEMENT_BY_ID.get('belote_king')!,
      ].filter(Boolean)
    case 'POKER_WIN':
      return [ACHIEVEMENT_BY_ID.get('poker_first_win')!].filter(Boolean)
    case 'POKER_HAND':
      return [
        ACHIEVEMENT_BY_ID.get('first_bluff')!,
        ACHIEVEMENT_BY_ID.get('poker_hands_100')!,
        ACHIEVEMENT_BY_ID.get('poker_hands_1000')!,
      ].filter(Boolean)
    case 'CHIPS_BALANCE':
      return [ACHIEVEMENT_BY_ID.get('millionaire')!].filter(Boolean)
    default:
      return []
  }
}

function meetsThreshold(def: AchievementDefinition, event: AchievementEvent): boolean {
  const threshold = def.threshold ?? 1
  switch (event.type) {
    case 'LOGIN_STREAK':
      return event.streakCount >= threshold
    case 'FRIEND_ADDED':
      return event.friendsCount >= threshold
    case 'VOICE_CALL':
    case 'CASINO_JACKPOT':
      return true
    case 'CASINO_SPIN':
      if (def.id === 'blackjack_king') {
        return (event.blackjackBiggestWin ?? 0) >= threshold
      }
      return event.totalGames >= threshold
    case 'BELOTE_WIN':
      return event.wins >= threshold
    case 'POKER_WIN':
      return event.wins >= threshold
    case 'POKER_HAND':
      return event.handsPlayed >= threshold
    case 'CHIPS_BALANCE':
      return event.chips >= threshold
    default:
      return false
  }
}

export async function unlockAchievement(
  userId: string,
  achievementId: string,
  db: Tx = prisma,
): Promise<UnlockedAchievement | null> {
  const def = ACHIEVEMENT_BY_ID.get(achievementId)
  if (!def) return null

  const existing = await db.userAchievement.findUnique({
    where: { userId_achievementId: { userId, achievementId } },
    select: { achievementId: true },
  })
  if (existing) return null

  try {
    await db.userAchievement.create({
      data: { userId, achievementId },
    })
  } catch {
    return null
  }

  const rewardChips = def.rewardChips ?? 0
  if (rewardChips > 0) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })
    if (user) {
      const balanceBefore = user.chips
      const balanceAfter = balanceBefore + rewardChips
      await db.user.update({
        where: { id: userId },
        data: { chips: balanceAfter },
      })
      await createWalletLedgerMovement(db, {
        userId,
        reason: 'ACHIEVEMENT_REWARD',
        balanceBefore,
        balanceAfter,
        gameType: 'achievement',
        roundId: achievementId,
      })
    }
  }

  if (def.rewardCosmeticId) {
    await grantCosmetic(userId, def.rewardCosmeticId, db)
  }

  await createNotification(userId, 'ACHIEVEMENT', {
    achievementId,
    rewardChips,
    rewardCosmeticId: def.rewardCosmeticId ?? null,
  })

  return {
    achievementId,
    rewardChips,
    rewardCosmeticId: def.rewardCosmeticId ?? null,
  }
}

export async function checkAchievements(
  userId: string,
  event: AchievementEvent,
): Promise<UnlockedAchievement[]> {
  const unlocked: UnlockedAchievement[] = []
  for (const def of candidatesForEvent(event)) {
    if (!meetsThreshold(def, event)) continue
    const result = await unlockAchievement(userId, def.id)
    if (result) unlocked.push(result)
  }
  return unlocked
}

export async function getUserAchievements(userId: string) {
  const rows = await prisma.userAchievement.findMany({
    where: { userId },
    orderBy: { unlockedAt: 'asc' },
  })
  const unlockedIds = new Set(rows.map((r) => r.achievementId))
  return {
    unlocked: rows.map((r) => ({
      achievementId: r.achievementId,
      unlockedAt: r.unlockedAt.toISOString(),
    })),
    catalog: [...ACHIEVEMENT_BY_ID.values()].map((def) => ({
      ...def,
      unlocked: unlockedIds.has(def.id),
      unlockedAt:
        rows.find((r) => r.achievementId === def.id)?.unlockedAt.toISOString() ?? null,
    })),
  }
}
