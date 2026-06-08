import type { PrismaClient } from '../generated/prisma/index.js'
import { prisma } from '../config/database.js'
import { createWalletLedgerMovement } from '../casino/services/walletLedger.service.js'
import {
  AVATAR_PRESET_IDS,
  avatarPresetPriceChips,
  isAvatarPresetId,
  isFreeAvatarPreset,
} from './avatars.catalog.js'
import { ShopError } from './shop.service.js'

type Tx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>

export async function listAvatarPresets(userId: string) {
  const owned = await prisma.userAvatarPreset.findMany({
    where: { userId },
    select: { presetId: true, acquiredAt: true },
  })
  const ownedMap = new Map(owned.map((row) => [row.presetId, row.acquiredAt.toISOString()]))

  return AVATAR_PRESET_IDS.map((id) => {
    const free = isFreeAvatarPreset(id)
    const ownedRow = ownedMap.get(id)
    return {
      id,
      priceChips: avatarPresetPriceChips(id),
      free,
      owned: free || ownedRow != null,
      acquiredAt: ownedRow ?? null,
    }
  })
}

export async function assertCanUseAvatarPreset(userId: string, presetId: string): Promise<void> {
  if (!isAvatarPresetId(presetId)) {
    throw new ShopError(400, 'INVALID_AVATAR', 'Avatar prédéfini invalide')
  }
  if (isFreeAvatarPreset(presetId)) return

  const owned = await prisma.userAvatarPreset.findUnique({
    where: { userId_presetId: { userId, presetId } },
  })
  if (!owned) {
    throw new ShopError(403, 'AVATAR_NOT_OWNED', 'Avatar non débloqué')
  }
}

export async function purchaseAvatarPreset(userId: string, presetId: string) {
  if (!isAvatarPresetId(presetId)) {
    throw new ShopError(404, 'AVATAR_NOT_FOUND', 'Avatar introuvable')
  }
  if (isFreeAvatarPreset(presetId)) {
    throw new ShopError(400, 'AVATAR_FREE', 'Cet avatar est gratuit')
  }

  const price = avatarPresetPriceChips(presetId)
  const existing = await prisma.userAvatarPreset.findUnique({
    where: { userId_presetId: { userId, presetId } },
  })
  if (existing) {
    throw new ShopError(409, 'ALREADY_OWNED', 'Avatar déjà possédé')
  }

  return prisma.$transaction(async (tx: Tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })
    if (!user) {
      throw new ShopError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable')
    }
    if (user.chips < price) {
      throw new ShopError(402, 'INSUFFICIENT_CHIPS', 'Jetons insuffisants')
    }

    const balanceBefore = user.chips
    const balanceAfter = balanceBefore - price
    await tx.user.update({
      where: { id: userId },
      data: { chips: balanceAfter },
    })
    await tx.userAvatarPreset.create({
      data: { userId, presetId },
    })
    await createWalletLedgerMovement(tx, {
      userId,
      reason: 'AVATAR_PURCHASE',
      balanceBefore,
      balanceAfter,
      gameType: 'shop',
      roundId: presetId,
    })

    return { presetId, chips: balanceAfter }
  })
}
