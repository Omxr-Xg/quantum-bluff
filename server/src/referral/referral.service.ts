import type { Server } from 'socket.io'
import { prisma } from '../config/database.js'
import { createWalletLedgerMovement } from '../casino/services/walletLedger.service.js'
import { emitUserRewardsUpdated } from '../rewards/userRewards.socket.js'
import { createNotification } from '../notifications/notification.service.js'
import {
  REFERRAL_REFERRED_CHIPS,
  REFERRAL_REFERRER_CHIPS,
  type ApplyReferralResult,
  type ReferralInviteRow,
  type ReferralMeResponse,
} from './referral.types.js'
import { generateReferralCode, normalizeReferralCode } from './referralCode.js'

class ReferralError extends Error {
  statusCode: number
  code: string

  constructor(statusCode: number, code: string, message: string) {
    super(message)
    this.statusCode = statusCode
    this.code = code
  }
}

export function isReferralError(err: unknown): err is ReferralError {
  return err instanceof ReferralError
}

function orderedUserPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

async function ensureReferralFriendship(
  tx: Pick<typeof prisma, 'friendship'>,
  referrerId: string,
  referredUserId: string,
): Promise<void> {
  const [user1Id, user2Id] = orderedUserPair(referrerId, referredUserId)
  const existing = await tx.friendship.findFirst({
    where: { user1Id, user2Id },
    select: { id: true },
  })
  if (!existing) {
    await tx.friendship.create({ data: { user1Id, user2Id } })
  }
}

export async function ensureUserReferralCode(userId: string): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  })
  if (existing?.referralCode) return existing.referralCode

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateReferralCode()
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
        select: { referralCode: true },
      })
      return updated.referralCode!
    } catch {
      /* collision — retry */
    }
  }
  throw new ReferralError(500, 'REFERRAL_CODE_FAILED', 'Impossible de générer un code de parrainage')
}

function buildReferralLink(code: string, publicBaseUrl?: string): string {
  const base = (publicBaseUrl ?? process.env.PUBLIC_APP_URL ?? 'https://quantumbluff.com').replace(/\/$/, '')
  return `${base}/register?ref=${encodeURIComponent(code)}`
}

export async function getReferralMe(
  userId: string,
  publicBaseUrl?: string,
): Promise<ReferralMeResponse> {
  const code = await ensureUserReferralCode(userId)
  const referrals = await prisma.referral.findMany({
    where: { referrerId: userId },
    select: { status: true },
  })
  const completed = referrals.filter((r) => r.status === 'COMPLETED').length
  return {
    referralCode: code,
    referralLink: buildReferralLink(code, publicBaseUrl),
    invitesCount: referrals.length,
    chipsEarned: completed * REFERRAL_REFERRER_CHIPS,
  }
}

export async function listReferralInvites(userId: string): Promise<ReferralInviteRow[]> {
  const rows = await prisma.referral.findMany({
    where: { referrerId: userId },
    orderBy: { createdAt: 'desc' },
    include: { referred: { select: { id: true, username: true } } },
  })
  return rows.map((r) => ({
    userId: r.referred.id,
    username: r.referred.username,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    rewardedAt: r.referrerRewardedAt?.toISOString() ?? null,
    chipsEarned: r.status === 'COMPLETED' ? REFERRAL_REFERRER_CHIPS : 0,
  }))
}

async function completeReferralRewards(
  referralId: string,
  io?: Server,
): Promise<ApplyReferralResult | null> {
  const result = await prisma.$transaction(async (tx): Promise<ApplyReferralResult | null> => {
    const referral = await tx.referral.findUnique({
      where: { id: referralId },
      include: {
        referrer: { select: { id: true, chips: true, username: true } },
        referred: { select: { id: true, chips: true, username: true } },
      },
    })
    if (!referral || referral.status === 'COMPLETED') return null

    const referrerBefore = referral.referrer.chips
    const referredBefore = referral.referred.chips
    const referrerAfter = referrerBefore + REFERRAL_REFERRER_CHIPS
    const referredAfter = referredBefore + REFERRAL_REFERRED_CHIPS
    const now = new Date()

    await tx.user.update({
      where: { id: referral.referrerId },
      data: { chips: referrerAfter },
    })
    await tx.user.update({
      where: { id: referral.referredUserId },
      data: { chips: referredAfter },
    })

    await createWalletLedgerMovement(tx, {
      userId: referral.referrerId,
      reason: 'REFERRAL_REFERRER_BONUS',
      balanceBefore: referrerBefore,
      balanceAfter: referrerAfter,
      gameType: 'referral',
      roundId: referral.id,
    })
    await createWalletLedgerMovement(tx, {
      userId: referral.referredUserId,
      reason: 'REFERRAL_REFERRED_BONUS',
      balanceBefore: referredBefore,
      balanceAfter: referredAfter,
      gameType: 'referral',
      roundId: referral.id,
    })

    await ensureReferralFriendship(tx, referral.referrerId, referral.referredUserId)

    await tx.referral.update({
      where: { id: referralId },
      data: {
        status: 'COMPLETED',
        referrerRewardedAt: now,
        referredRewardedAt: now,
      },
    })

    return {
      referralId: referral.id,
      referrerId: referral.referrerId,
      referredUserId: referral.referredUserId,
      referredUsername: referral.referred.username,
      referrerUsername: referral.referrer.username,
      referredChips: referredAfter,
      referrerChips: referrerAfter,
    }
  })

  if (!result) return null

  if (io) {
    emitUserRewardsUpdated(io, result.referrerId, {
      chips: result.referrerChips,
      source: 'referral',
    })
    emitUserRewardsUpdated(io, result.referredUserId, {
      chips: result.referredChips,
      source: 'referral',
    })
  }

  await createNotification(result.referrerId, 'REFERRAL', {
    role: 'referrer',
    username: result.referredUsername,
    chips: REFERRAL_REFERRER_CHIPS,
  })
  await createNotification(result.referredUserId, 'REFERRAL', {
    role: 'referred',
    username: result.referrerUsername,
    chips: REFERRAL_REFERRED_CHIPS,
  })

  void import('../achievements/achievement.service.js').then(async ({ checkAchievements }) => {
    const friendCountFor = async (uid: string) =>
      prisma.friendship.count({
        where: { OR: [{ user1Id: uid }, { user2Id: uid }] },
      })
    const [referrerCount, referredCount] = await Promise.all([
      friendCountFor(result.referrerId),
      friendCountFor(result.referredUserId),
    ])
    await checkAchievements(result.referrerId, { type: 'FRIEND_ADDED', friendsCount: referrerCount })
    await checkAchievements(result.referredUserId, { type: 'FRIEND_ADDED', friendsCount: referredCount })
  })

  return result
}

export async function applyReferralCode(
  referredUserId: string,
  rawCode: string,
  io?: Server,
): Promise<ApplyReferralResult> {
  const code = normalizeReferralCode(rawCode)
  if (!code || code.length < 4) {
    throw new ReferralError(400, 'INVALID_CODE', 'Code de parrainage invalide')
  }

  const existing = await prisma.referral.findUnique({
    where: { referredUserId },
    select: { id: true },
  })
  if (existing) {
    throw new ReferralError(409, 'ALREADY_REFERRED', 'Un code de parrainage a déjà été appliqué')
  }

  const referrer = await prisma.user.findFirst({
    where: { referralCode: code },
    select: { id: true },
  })
  if (!referrer) {
    throw new ReferralError(404, 'CODE_NOT_FOUND', 'Code de parrainage introuvable')
  }
  if (referrer.id === referredUserId) {
    throw new ReferralError(400, 'SELF_REFERRAL', 'Vous ne pouvez pas utiliser votre propre code')
  }

  const referral = await prisma.referral.create({
    data: {
      referrerId: referrer.id,
      referredUserId,
      status: 'PENDING',
    },
  })

  const result = await completeReferralRewards(referral.id, io)
  if (!result) {
    throw new ReferralError(500, 'REFERRAL_REWARD_FAILED', 'Impossible de créditer le parrainage')
  }
  return result
}

export async function applyReferralOnRegister(
  referredUserId: string,
  rawCode: string | undefined,
  io?: Server,
): Promise<ApplyReferralResult | null> {
  if (!rawCode?.trim()) return null
  try {
    return await applyReferralCode(referredUserId, rawCode, io)
  } catch (err) {
    if (isReferralError(err) && (err.code === 'CODE_NOT_FOUND' || err.code === 'SELF_REFERRAL')) {
      return null
    }
    throw err
  }
}
