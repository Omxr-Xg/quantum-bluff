import type { CosmeticType } from '../generated/prisma/index.js'
import { prisma } from '../config/database.js'
import { createNotification } from '../notifications/notification.service.js'
import { ensureCosmeticsSeeded, grantCosmetic, updateLoadout } from './shop.service.js'
import { registerRuntimeCosmetic } from './cosmeticRegistry.js'
import { COSMETIC_BY_ID } from './cosmetics.catalog.js'
import { parseBannerStyle, parseFrameStyle, parseTitleStyle } from './cosmeticStyle.js'

export class CosmeticGiftError extends Error {
  statusCode: number
  code: string

  constructor(statusCode: number, code: string, message: string) {
    super(message)
    this.statusCode = statusCode
    this.code = code
  }
}

function registerRuntimeIfNeeded(cosmetic: {
  id: string
  type: CosmeticType
  nameKey: string
  priceChips: number
  purchasable: boolean
  rarity: string | null
  styleJson: string | null
}): void {
  if (!COSMETIC_BY_ID.has(cosmetic.id)) {
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
}

export async function offerCosmeticGift(userId: string, cosmeticId: string) {
  await ensureCosmeticsSeeded()

  const cosmetic = await prisma.cosmeticItem.findUnique({ where: { id: cosmeticId } })
  if (!cosmetic) {
    throw new CosmeticGiftError(404, 'COSMETIC_NOT_FOUND', 'Cosmétique introuvable')
  }

  const owned = await prisma.userCosmetic.findUnique({
    where: { userId_cosmeticId: { userId, cosmeticId } },
  })
  if (owned) {
    throw new CosmeticGiftError(409, 'ALREADY_OWNED', 'Le joueur possède déjà ce cosmétique')
  }

  const pending = await prisma.cosmeticGiftOffer.findFirst({
    where: { userId, cosmeticId, status: 'PENDING' },
  })
  if (pending) {
    throw new CosmeticGiftError(409, 'OFFER_PENDING', 'Une offre est déjà en attente pour ce cosmétique')
  }

  registerRuntimeIfNeeded(cosmetic)

  const offer = await prisma.cosmeticGiftOffer.create({
    data: { userId, cosmeticId },
  })

  const payload = {
    offerId: offer.id,
    cosmeticId: cosmetic.id,
    cosmeticName: cosmetic.nameKey,
    cosmeticType: cosmetic.type,
    rarity: cosmetic.rarity,
    status: 'PENDING',
  }

  const notification = await createNotification(userId, 'COSMETIC_GIFT', payload)
  await prisma.cosmeticGiftOffer.update({
    where: { id: offer.id },
    data: { notificationId: notification.id },
  })

  return { offerId: offer.id, cosmeticId, status: 'PENDING' as const }
}

export async function getCosmeticGiftOfferDetail(userId: string, offerId: string) {
  const offer = await prisma.cosmeticGiftOffer.findFirst({
    where: { id: offerId, userId },
    include: { cosmetic: true },
  })
  if (!offer) {
    throw new CosmeticGiftError(404, 'OFFER_NOT_FOUND', 'Offre introuvable')
  }

  const styleJson = offer.cosmetic.styleJson ?? '{}'
  let preview: Record<string, unknown> = { type: offer.cosmetic.type }

  if (offer.cosmetic.type === 'BANNER') {
    const style = parseBannerStyle(styleJson)
    preview = {
      type: 'BANNER',
      background: style.backgroundCss ?? style.gradient ?? null,
      overlayOpacity: style.overlayOpacity,
      name: offer.cosmetic.nameKey,
    }
  } else if (offer.cosmetic.type === 'AVATAR_FRAME') {
    const style = parseFrameStyle(styleJson)
    preview = {
      type: 'AVATAR_FRAME',
      border: style.border,
      glow: style.glow,
      borderWidth: style.borderWidth,
      imageUrl: style.imageUrl,
      name: offer.cosmetic.nameKey,
    }
  } else {
    const style = parseTitleStyle(styleJson)
    preview = {
      type: 'TITLE',
      color: style.color,
      textShadow: style.textShadow,
      fontWeight: style.fontWeight,
      letterSpacing: style.letterSpacing,
      name: offer.cosmetic.nameKey,
    }
  }

  return {
    id: offer.id,
    status: offer.status,
    cosmeticId: offer.cosmeticId,
    cosmeticName: offer.cosmetic.nameKey,
    cosmeticType: offer.cosmetic.type,
    rarity: offer.cosmetic.rarity,
    purchasable: offer.cosmetic.purchasable,
    preview,
    createdAt: offer.createdAt.toISOString(),
  }
}

export async function acceptCosmeticGift(userId: string, offerId: string, apply = true) {
  const offer = await prisma.cosmeticGiftOffer.findFirst({
    where: { id: offerId, userId },
    include: { cosmetic: true },
  })
  if (!offer) {
    throw new CosmeticGiftError(404, 'OFFER_NOT_FOUND', 'Offre introuvable')
  }
  if (offer.status !== 'PENDING') {
    throw new CosmeticGiftError(409, 'OFFER_CLOSED', 'Cette offre a déjà été traitée')
  }

  const owned = await prisma.userCosmetic.findUnique({
    where: { userId_cosmeticId: { userId, cosmeticId: offer.cosmeticId } },
  })
  if (owned) {
    await prisma.cosmeticGiftOffer.update({
      where: { id: offer.id },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
    })
    throw new CosmeticGiftError(409, 'ALREADY_OWNED', 'Cosmétique déjà possédé')
  }

  registerRuntimeIfNeeded(offer.cosmetic)
  await grantCosmetic(userId, offer.cosmeticId)

  if (apply) {
    const type = offer.cosmetic.type
    if (type === 'BANNER') {
      await updateLoadout(userId, { bannerId: offer.cosmeticId })
    } else if (type === 'AVATAR_FRAME') {
      await updateLoadout(userId, { frameId: offer.cosmeticId })
    } else if (type === 'TITLE') {
      await updateLoadout(userId, { titleId: offer.cosmeticId })
    }
  }

  await prisma.cosmeticGiftOffer.update({
    where: { id: offer.id },
    data: { status: 'ACCEPTED', respondedAt: new Date() },
  })

  return {
    offerId: offer.id,
    cosmeticId: offer.cosmeticId,
    applied: apply,
    status: 'ACCEPTED' as const,
  }
}

export async function declineCosmeticGift(userId: string, offerId: string) {
  const offer = await prisma.cosmeticGiftOffer.findFirst({
    where: { id: offerId, userId },
  })
  if (!offer) {
    throw new CosmeticGiftError(404, 'OFFER_NOT_FOUND', 'Offre introuvable')
  }
  if (offer.status !== 'PENDING') {
    throw new CosmeticGiftError(409, 'OFFER_CLOSED', 'Cette offre a déjà été traitée')
  }

  await prisma.cosmeticGiftOffer.update({
    where: { id: offer.id },
    data: { status: 'DECLINED', respondedAt: new Date() },
  })

  return { offerId: offer.id, status: 'DECLINED' as const }
}
