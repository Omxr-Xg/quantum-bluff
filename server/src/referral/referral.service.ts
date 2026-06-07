import type { Server } from 'socket.io'
import { prisma } from '../config/database.js'
import { createWalletLedgerMovement } from '../casino/services/walletLedger.service.js'
import { emitUserRewardsUpdated } from '../rewards/userRewards.socket.js'
import { createNotification } from '../notifications/notification.service.js'
import {
  REFERRAL_REFERRED_CHIPS,
  REFERRAL_REFERRER_CHIPS,
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
  }))
}

async function completeReferralRewards(
  referralId: string,
  io?: Server,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const referral = await tx.referral.findUnique({
      where: { id: referralId },
      include: {
        referrer: { select: { id: true, chips: true, username: true } },
        referred: { select: { id: true, chips: true, username: true } },
      },
    })
    if (!referral || referral.status === 'COMPLETED') return

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

    await tx.referral.update({
      where: { id: referralId },
      data: {
        status: 'COMPLETED',
        referrerRewardedAt: now,
        referredRewardedAt: now,
      },
    })
  })

  const referral = await prisma.referral.findUnique({
    where: { id: referralId },
    select: { referrerId: true, referredUserId: true },
  })
  if (!referral) return

  const [referrer, referred] = await Promise.all([
    prisma.user.findUnique({ where: { id: referral.referrerId }, select: { chips: true } }),
    prisma.user.findUnique({ where: { id: referral.referredUserId }, select: { chips: true } }),
  ])

  if (io) {
    if (referrer) {
      emitUserRewardsUpdated(io, referral.referrerId, {
        chips: referrer.chips,
        source: 'referral',
      })
    }
    if (referred) {
      emitUserRewardsUpdated(io, referral.referredUserId, {
        chips: referred.chips,
        source: 'referral',
      })
    }
  }

  await createNotification(referral.referrerId, 'REFERRAL', {
    messageKey: 'referral.referrerReward',
    chips: REFERRAL_REFERRER_CHIPS,
  })
  await createNotification(referral.referredUserId, 'REFERRAL', {
    messageKey: 'referral.referredReward',
    chips: REFERRAL_REFERRED_CHIPS,
  })
}

export async function applyReferralCode(
  referredUserId: string,
  rawCode: string,
  io?: Server,
): Promise<{ ok: true }> {
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

  await completeReferralRewards(referral.id, io)
  return { ok: true }
}

export async function applyReferralOnRegister(
  referredUserId: string,
  rawCode: string | undefined,
  io?: Server,
): Promise<void> {
  if (!rawCode?.trim()) return
  try {
    await applyReferralCode(referredUserId, rawCode, io)
  } catch (err) {
    if (isReferralError(err) && (err.code === 'CODE_NOT_FOUND' || err.code === 'SELF_REFERRAL')) {
      return
    }
    throw err
  }
}
