import { prisma } from '../config/database.js'

const EXPORT_VERSION = '1.0'

function omitSecrets<T extends Record<string, unknown>>(row: T): Omit<T, 'password' | 'totpSecret' | 'secretAnswerHash' | 'avatarImage'> {
  const { password: _p, totpSecret: _t, secretAnswerHash: _s, avatarImage: _a, ...rest } = row as T & {
    password?: unknown
    totpSecret?: unknown
    secretAnswerHash?: unknown
    avatarImage?: unknown
  }
  return rest
}

/** Export RGPD : données personnelles et activité du joueur (sans secrets). */
export async function buildUserDataExport(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      stats: true,
      playerStats: true,
      friendshipsAsUser1: { select: { user2Id: true, createdAt: true } },
      friendshipsAsUser2: { select: { user1Id: true, createdAt: true } },
      sentFriendMessages: {
        select: { id: true, receiverId: true, content: true, kind: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      },
      receivedFriendMessages: {
        select: { id: true, senderId: true, content: true, kind: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      },
      histories: {
        select: { id: true, gameId: true, pot: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      },
      walletEntries: {
        select: { id: true, amount: true, reason: true, gameType: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      },
      userAchievements: { select: { achievementId: true, unlockedAt: true } },
      userBadges: { select: { badgeId: true, unlockedAt: true } },
      userCosmetics: { select: { cosmeticId: true, acquiredAt: true } },
      seasonScores: {
        select: { seasonId: true, xpEarned: true, pokerWins: true, beloteWins: true, updatedAt: true },
      },
    },
  })

  if (!user) return null

  const {
    friendshipsAsUser1,
    friendshipsAsUser2,
    sentFriendMessages,
    receivedFriendMessages,
    histories,
    walletEntries,
    userAchievements,
    userBadges,
    userCosmetics,
    seasonScores,
    stats,
    playerStats,
    ...userScalars
  } = user

  const profile = omitSecrets(userScalars as Record<string, unknown>)

  return {
    exportVersion: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    userId,
    profile,
    stats,
    playerStats,
    friendships: [
      ...friendshipsAsUser1.map((f) => ({ friendId: f.user2Id, since: f.createdAt })),
      ...friendshipsAsUser2.map((f) => ({ friendId: f.user1Id, since: f.createdAt })),
    ],
    messagesSent: sentFriendMessages,
    messagesReceived: receivedFriendMessages,
    gameHistory: histories,
    walletLedger: walletEntries,
    achievements: userAchievements,
    badges: userBadges,
    cosmetics: userCosmetics,
    seasonScores,
  }
}
