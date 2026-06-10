import type { PrismaClient } from '../generated/prisma/index.js'
import { prisma } from '../config/database.js'
import { createWalletLedgerMovement } from '../casino/services/walletLedger.service.js'
import { COSMETIC_BY_ID, COSMETIC_CATALOG } from './cosmetics.catalog.js'
import { getCosmeticById, refreshRuntimeCosmeticsFromDb } from './cosmeticRegistry.js'

type Tx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>

export class ShopError extends Error {
  statusCode: number
  code: string

  constructor(statusCode: number, code: string, message: string) {
    super(message)
    this.statusCode = statusCode
    this.code = code
  }
}

export function isShopError(err: unknown): err is ShopError {
  return err instanceof ShopError
}

let cosmeticsSeedPromise: Promise<void> | null = null

export async function ensureCosmeticsSeeded(): Promise<void> {
  if (!cosmeticsSeedPromise) {
    cosmeticsSeedPromise = (async () => {
      for (const item of COSMETIC_CATALOG) {
        await prisma.cosmeticItem.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            type: item.type,
            nameKey: item.nameKey,
            priceChips: item.priceChips,
            purchasable: item.purchasable,
            rarity: item.rarity,
            styleJson: item.styleJson,
          },
          update: {
            type: item.type,
            nameKey: item.nameKey,
            priceChips: item.priceChips,
            purchasable: item.purchasable,
            rarity: item.rarity,
            styleJson: item.styleJson,
          },
        })
      }
      await refreshRuntimeCosmeticsFromDb()
    })().catch((err) => {
      cosmeticsSeedPromise = null
      throw err
    })
  }
  await cosmeticsSeedPromise
}

export async function listCosmetics(userId: string) {
  await ensureCosmeticsSeeded()
  const owned = await prisma.userCosmetic.findMany({
    where: { userId },
    select: { cosmeticId: true, acquiredAt: true },
  })
  const ownedSet = new Set(owned.map((o) => o.cosmeticId))
  const catalogIds = new Set(COSMETIC_CATALOG.map((c) => c.id))
  const catalogItems = COSMETIC_CATALOG.map((item) => ({
    ...item,
    owned: ownedSet.has(item.id),
    acquiredAt: owned.find((o) => o.cosmeticId === item.id)?.acquiredAt.toISOString() ?? null,
  }))

  const extraOwned = owned.filter((o) => !catalogIds.has(o.cosmeticId))
  if (extraOwned.length === 0) return catalogItems

  const extraRows = await prisma.cosmeticItem.findMany({
    where: { id: { in: extraOwned.map((o) => o.cosmeticId) } },
  })
  const extraItems = extraRows.map((row) => ({
    id: row.id,
    type: row.type,
    nameKey: row.nameKey,
    priceChips: row.priceChips,
    purchasable: row.purchasable,
    rarity: row.rarity ?? 'unique',
    styleJson: row.styleJson ?? '{}',
    owned: true,
    acquiredAt:
      extraOwned.find((o) => o.cosmeticId === row.id)?.acquiredAt.toISOString() ?? null,
  }))

  return [...catalogItems, ...extraItems]
}

export async function grantCosmetic(
  userId: string,
  cosmeticId: string,
  db: Tx = prisma,
): Promise<void> {
  await ensureCosmeticsSeeded()
  const exists = getCosmeticById(cosmeticId) ?? (await db.cosmeticItem.findUnique({ where: { id: cosmeticId } }))
  if (!exists) return
  try {
    await db.userCosmetic.create({
      data: { userId, cosmeticId },
    })
  } catch {
    /* déjà possédé */
  }
}

export async function purchaseCosmetic(userId: string, cosmeticId: string) {
  await ensureCosmeticsSeeded()
  const item = COSMETIC_BY_ID.get(cosmeticId)
  if (!item) {
    throw new ShopError(404, 'COSMETIC_NOT_FOUND', 'Cosmétique introuvable')
  }
  if (!item.purchasable) {
    throw new ShopError(403, 'NOT_PURCHASABLE', 'Ce cosmétique ne peut pas être acheté')
  }

  const existing = await prisma.userCosmetic.findUnique({
    where: { userId_cosmeticId: { userId, cosmeticId } },
  })
  if (existing) {
    throw new ShopError(409, 'ALREADY_OWNED', 'Cosmétique déjà possédé')
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })
    if (!user) {
      throw new ShopError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable')
    }
    if (user.chips < item.priceChips) {
      throw new ShopError(402, 'INSUFFICIENT_CHIPS', 'Jetons insuffisants')
    }

    const balanceBefore = user.chips
    const balanceAfter = balanceBefore - item.priceChips
    await tx.user.update({
      where: { id: userId },
      data: { chips: balanceAfter },
    })
    await tx.userCosmetic.create({
      data: { userId, cosmeticId },
    })
    await createWalletLedgerMovement(tx, {
      userId,
      reason: 'COSMETIC_PURCHASE',
      balanceBefore,
      balanceAfter,
      gameType: 'shop',
      roundId: cosmeticId,
    })

    return { cosmeticId, chips: balanceAfter }
  })
}

export type LoadoutUpdate = {
  bannerId?: string | null
  frameId?: string | null
  titleId?: string | null
}

async function assertOwned(userId: string, cosmeticId: string | null | undefined): Promise<void> {
  if (!cosmeticId) return
  const owned = await prisma.userCosmetic.findUnique({
    where: { userId_cosmeticId: { userId, cosmeticId } },
  })
  if (!owned) {
    throw new ShopError(403, 'NOT_OWNED', 'Cosmétique non possédé')
  }
}

export async function updateLoadout(userId: string, update: LoadoutUpdate) {
  if (update.bannerId !== undefined) await assertOwned(userId, update.bannerId)
  if (update.frameId !== undefined) await assertOwned(userId, update.frameId)
  if (update.titleId !== undefined) await assertOwned(userId, update.titleId)

  const data: {
    equippedBannerId?: string | null
    equippedFrameId?: string | null
    equippedTitleId?: string | null
  } = {}
  if (update.bannerId !== undefined) data.equippedBannerId = update.bannerId
  if (update.frameId !== undefined) data.equippedFrameId = update.frameId
  if (update.titleId !== undefined) data.equippedTitleId = update.titleId

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      equippedBannerId: true,
      equippedFrameId: true,
      equippedTitleId: true,
    },
  })

  return {
    bannerId: user.equippedBannerId,
    frameId: user.equippedFrameId,
    titleId: user.equippedTitleId,
  }
}

export async function getUserLoadout(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      equippedBannerId: true,
      equippedFrameId: true,
      equippedTitleId: true,
    },
  })
  if (!user) {
    throw new ShopError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable')
  }
  return {
    bannerId: user.equippedBannerId,
    frameId: user.equippedFrameId,
    titleId: user.equippedTitleId,
  }
}
