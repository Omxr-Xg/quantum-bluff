import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import type { CosmeticType } from '../generated/prisma/index.js'
import { prisma } from '../config/database.js'
import { createWalletLedgerMovement } from '../casino/services/walletLedger.service.js'
import { getPlayerHistory, getPlayerStats } from '../player/player.service.js'
import { ensureCosmeticsSeeded } from '../shop/shop.service.js'
import { registerRuntimeCosmetic, refreshRuntimeCosmeticsFromDb } from '../shop/cosmeticRegistry.js'
import { COSMETIC_BY_ID } from '../shop/cosmetics.catalog.js'
import {
  buildBannerStyleJson,
  buildFrameStyleJson,
  buildTitleStyleJson,
  type BannerStyle,
  type FrameStyle,
  type TitleStyle,
} from '../shop/cosmeticStyle.js'

export class AdminPlayerError extends Error {
  statusCode: number
  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export async function getAdminPlayerDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      chips: true,
      level: true,
      experience: true,
      loginStreakCount: true,
      bannedUntil: true,
      antiCheatAlerts: true,
      lastIp: true,
      createdAt: true,
      equippedBannerId: true,
      equippedFrameId: true,
      equippedTitleId: true,
      avatarUrl: true,
      avatarHasBinary: true,
    },
  })
  if (!user) {
    throw new AdminPlayerError(404, 'Utilisateur introuvable')
  }

  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
    include: {
      user1: { select: { id: true, username: true, level: true, chips: true } },
      user2: { select: { id: true, username: true, level: true, chips: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const friends = friendships.map((f) => {
    const friend = f.user1Id === userId ? f.user2 : f.user1
    return {
      id: friend.id,
      username: friend.username,
      level: friend.level,
      chips: friend.chips,
      friendsSince: f.createdAt.toISOString(),
    }
  })

  const pendingRequests = await prisma.friendRequest.findMany({
    where: {
      status: 'PENDING',
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    include: {
      sender: { select: { id: true, username: true } },
      receiver: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const [history, stats, ownedCosmetics, recentLedger, reportsAsReporter, reportsAsReported] =
    await Promise.all([
      getPlayerHistory(userId, { mode: 'all', limit: 30 }),
      getPlayerStats(userId),
      prisma.userCosmetic.findMany({
        where: { userId },
        include: { cosmetic: true },
        orderBy: { acquiredAt: 'desc' },
      }),
      prisma.walletLedgerEntry.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: {
          id: true,
          amount: true,
          reason: true,
          gameType: true,
          balanceAfter: true,
          createdAt: true,
        },
      }),
      prisma.playerReport.findMany({
        where: { reporterId: userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { reported: { select: { id: true, username: true } } },
      }),
      prisma.playerReport.findMany({
        where: { reportedUserId: userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { reporter: { select: { id: true, username: true } } },
      }),
    ])

  return {
    user: {
      ...user,
      createdAt: user.createdAt.toISOString(),
      bannedUntil: user.bannedUntil?.toISOString() ?? null,
    },
    friends,
    pendingFriendRequests: pendingRequests.map((r) => ({
      id: r.id,
      direction: r.senderId === userId ? ('outgoing' as const) : ('incoming' as const),
      other: r.senderId === userId ? r.receiver : r.sender,
      createdAt: r.createdAt.toISOString(),
    })),
    history,
    stats,
    cosmetics: ownedCosmetics.map((o) => ({
      cosmeticId: o.cosmeticId,
      acquiredAt: o.acquiredAt.toISOString(),
      type: o.cosmetic.type,
      nameKey: o.cosmetic.nameKey,
      rarity: o.cosmetic.rarity,
      purchasable: o.cosmetic.purchasable,
      styleJson: o.cosmetic.styleJson,
    })),
    loadout: {
      bannerId: user.equippedBannerId,
      frameId: user.equippedFrameId,
      titleId: user.equippedTitleId,
    },
    recentLedger: recentLedger.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
    reports: {
      filed: reportsAsReporter.map((r) => ({
        id: r.id,
        reason: r.reason,
        gameId: r.gameId,
        createdAt: r.createdAt.toISOString(),
        reported: r.reported,
      })),
      received: reportsAsReported.map((r) => ({
        id: r.id,
        reason: r.reason,
        gameId: r.gameId,
        createdAt: r.createdAt.toISOString(),
        reporter: r.reporter,
      })),
    },
  }
}

const grantChipsSchema = z.object({
  amount: z.number().int().min(-10_000_000).max(10_000_000),
  note: z.string().max(200).optional(),
})

export async function adminGrantChips(userId: string, body: unknown) {
  const parsed = grantChipsSchema.safeParse(body)
  if (!parsed.success) {
    throw new AdminPlayerError(400, 'Montant invalide')
  }
  const { amount, note } = parsed.data
  if (amount === 0) {
    throw new AdminPlayerError(400, 'Le montant ne peut pas être zéro')
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })
    if (!user) {
      throw new AdminPlayerError(404, 'Utilisateur introuvable')
    }
    const balanceBefore = user.chips
    const balanceAfter = Math.max(0, balanceBefore + amount)
    if (balanceAfter !== balanceBefore + amount) {
      throw new AdminPlayerError(400, 'Solde insuffisant pour ce retrait')
    }

    await tx.user.update({
      where: { id: userId },
      data: { chips: balanceAfter },
    })
    await createWalletLedgerMovement(tx, {
      userId,
      reason: note?.trim() ? `ADMIN_GRANT: ${note.trim()}` : 'ADMIN_GRANT',
      balanceBefore,
      balanceAfter,
      gameType: 'admin',
      roundId: randomUUID(),
    })

    return { chips: balanceAfter, delta: amount }
  })
}

export async function adminGrantCosmetic(userId: string, cosmeticId: string) {
  await ensureCosmeticsSeeded()
  const cosmetic = await prisma.cosmeticItem.findUnique({ where: { id: cosmeticId } })
  if (!cosmetic) {
    throw new AdminPlayerError(404, 'Cosmétique introuvable')
  }

  try {
    await prisma.userCosmetic.create({
      data: { userId, cosmeticId },
    })
  } catch {
    throw new AdminPlayerError(409, 'Cosmétique déjà possédé')
  }

  if (!COSMETIC_BY_ID.has(cosmeticId)) {
    registerRuntimeCosmetic({
      id: cosmetic.id,
      type: cosmetic.type,
      nameKey: cosmetic.nameKey,
      priceChips: cosmetic.priceChips,
      purchasable: cosmetic.purchasable,
      rarity: cosmetic.rarity ?? 'unique',
      styleJson: cosmetic.styleJson ?? '{}',
    })
  }

  return { cosmeticId, acquired: true }
}

export async function adminRevokeCosmetic(userId: string, cosmeticId: string) {
  const deleted = await prisma.userCosmetic.deleteMany({
    where: { userId, cosmeticId },
  })
  if (deleted.count === 0) {
    throw new AdminPlayerError(404, 'Cosmétique non possédé')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { equippedBannerId: true, equippedFrameId: true, equippedTitleId: true },
  })
  if (user) {
    const data: Record<string, null> = {}
    if (user.equippedBannerId === cosmeticId) data.equippedBannerId = null
    if (user.equippedFrameId === cosmeticId) data.equippedFrameId = null
    if (user.equippedTitleId === cosmeticId) data.equippedTitleId = null
    if (Object.keys(data).length > 0) {
      await prisma.user.update({ where: { id: userId }, data })
    }
  }

  return { cosmeticId, revoked: true }
}

const bannerStyleSchema = z.object({
  gradient: z.string().max(500).optional(),
  imageUrl: z.string().max(500).optional(),
  overlayOpacity: z.number().min(0).max(1).optional(),
  pattern: z.enum(['none', 'dots', 'lines', 'grid']).optional(),
})

const frameStyleSchema = z.object({
  border: z.string().max(120).optional(),
  glow: z.string().max(200).optional(),
  borderWidth: z.number().min(1).max(12).optional(),
  imageUrl: z.string().max(500).optional(),
})

const titleStyleSchema = z.object({
  color: z.string().max(80).optional(),
  textShadow: z.string().max(200).optional(),
  fontWeight: z.number().min(100).max(900).optional(),
  letterSpacing: z.string().max(20).optional(),
})

const createCosmeticSchema = z.object({
  id: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z][a-z0-9_]*$/),
  type: z.enum(['BANNER', 'AVATAR_FRAME', 'TITLE']),
  displayName: z.string().min(1).max(80),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary', 'unique']).default('unique'),
  /** Ancien format simplifié */
  gradient: z.string().max(500).optional(),
  border: z.string().max(120).optional(),
  glow: z.string().max(200).optional(),
  color: z.string().max(80).optional(),
  /** Studio admin — style structuré */
  bannerStyle: bannerStyleSchema.optional(),
  frameStyle: frameStyleSchema.optional(),
  titleStyle: titleStyleSchema.optional(),
  grantToUserId: z.string().uuid().optional(),
})

function buildStyleJsonFromInput(input: z.infer<typeof createCosmeticSchema>): string {
  const { type, id } = input
  if (type === 'BANNER') {
    const style: Omit<BannerStyle, 'className'> = input.bannerStyle ?? {
      gradient: input.gradient ?? 'linear-gradient(135deg, #6366f1, #a855f7)',
      pattern: 'none',
      overlayOpacity: 0.72,
    }
    return buildBannerStyleJson(id, style)
  }
  if (type === 'AVATAR_FRAME') {
    const style: Omit<FrameStyle, 'className'> = input.frameStyle ?? {
      border: input.border ?? '#c9a84c',
      glow: input.glow ?? '0 0 16px rgba(201,168,76,0.7)',
      borderWidth: 3,
    }
    return buildFrameStyleJson(id, style)
  }
  const style: Omit<TitleStyle, 'className'> = input.titleStyle ?? {
    color: input.color ?? '#fde047',
    textShadow: '0 0 12px rgba(253,224,71,0.6)',
    fontWeight: 700,
    letterSpacing: '0.08em',
  }
  return buildTitleStyleJson(id, style)
}

export async function adminCreateUniqueCosmetic(body: unknown) {
  const parsed = createCosmeticSchema.safeParse(body)
  if (!parsed.success) {
    throw new AdminPlayerError(400, 'Données cosmétique invalides')
  }
  const data = parsed.data
  if (COSMETIC_BY_ID.has(data.id)) {
    throw new AdminPlayerError(409, 'Cet identifiant est réservé au catalogue boutique')
  }

  const existing = await prisma.cosmeticItem.findUnique({ where: { id: data.id } })
  if (existing) {
    throw new AdminPlayerError(409, 'Cosmétique déjà existant')
  }

  const styleJson = buildStyleJsonFromInput(data)
  const entry = {
    id: data.id,
    type: data.type as CosmeticType,
    nameKey: data.displayName,
    priceChips: 0,
    purchasable: false,
    rarity: data.rarity,
    styleJson,
  }

  await prisma.cosmeticItem.create({ data: entry })
  registerRuntimeCosmetic(entry)

  let granted = false
  if (data.grantToUserId) {
    await adminGrantCosmetic(data.grantToUserId, data.id)
    granted = true
  }

  return {
    cosmetic: { ...entry, displayName: data.displayName },
    granted,
  }
}

export async function listAdminCosmetics() {
  await ensureCosmeticsSeeded()
  await refreshRuntimeCosmeticsFromDb()
  const rows = await prisma.cosmeticItem.findMany({
    orderBy: [{ purchasable: 'asc' }, { type: 'asc' }, { id: 'asc' }],
  })
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    nameKey: r.nameKey,
    priceChips: r.priceChips,
    purchasable: r.purchasable,
    rarity: r.rarity,
    styleJson: r.styleJson,
    isCatalog: COSMETIC_BY_ID.has(r.id),
  }))
}
