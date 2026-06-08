import type { PrismaClient } from '../generated/prisma/index.js'
import { prisma } from '../config/database.js'
import { createWalletLedgerMovement } from '../casino/services/walletLedger.service.js'
import {
  CUSTOM_FELT_BACKGROUND_UNLOCK,
  CUSTOM_FELT_COLOR_UNLOCK,
  FELT_BACKGROUND_IDS,
  FELT_THEME_IDS,
  FREE_FELT_BACKGROUND_ID,
  FREE_FELT_THEME_ID,
  feltBackgroundPriceChips,
  feltThemePriceChips,
  isFeltBackgroundId,
  isFeltThemeId,
  isFreeFeltBackground,
  isFreeFeltTheme,
  isTableShopUnlockId,
  tableUnlockPriceChips,
  type FeltBackgroundId,
  type FeltThemeId,
} from './tableThemes.catalog.js'
import { ShopError } from './shop.service.js'

type Tx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>

export type TableVisuals = {
  feltThemeId: FeltThemeId | 'custom'
  feltCustomColor: string | null
  feltBackgroundId: FeltBackgroundId | 'custom'
  feltBackgroundUrl: string | null
}

const USER_TABLE_SELECT = {
  tableFeltThemeId: true,
  tableFeltCustomColor: true,
  tableFeltBackgroundId: true,
  tableFeltBackgroundHasBinary: true,
} as const

function clientTableBackgroundUrl(userId: string, hasBinary: boolean): string | null {
  if (!hasBinary) return null
  return `/api/auth/table-backgrounds/${userId}`
}

export function resolveTableVisualsFromUser(user: {
  id: string
  tableFeltThemeId: string
  tableFeltCustomColor: string | null
  tableFeltBackgroundId: string
  tableFeltBackgroundHasBinary: boolean
}): TableVisuals {
  const feltThemeId = user.tableFeltThemeId === 'custom' ? 'custom' : (
    isFeltThemeId(user.tableFeltThemeId) ? user.tableFeltThemeId : FREE_FELT_THEME_ID
  )
  const feltBackgroundId = user.tableFeltBackgroundId === 'custom' ? 'custom' : (
    isFeltBackgroundId(user.tableFeltBackgroundId) ? user.tableFeltBackgroundId : FREE_FELT_BACKGROUND_ID
  )
  return {
    feltThemeId,
    feltCustomColor: feltThemeId === 'custom' ? user.tableFeltCustomColor : null,
    feltBackgroundId,
    feltBackgroundUrl:
      feltBackgroundId === 'custom'
        ? clientTableBackgroundUrl(user.id, user.tableFeltBackgroundHasBinary)
        : null,
  }
}

export async function resolveTableVisualsForUserId(userId: string): Promise<TableVisuals> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, ...USER_TABLE_SELECT },
  })
  if (!user) {
    return {
      feltThemeId: FREE_FELT_THEME_ID,
      feltCustomColor: null,
      feltBackgroundId: FREE_FELT_BACKGROUND_ID,
      feltBackgroundUrl: null,
    }
  }
  return resolveTableVisualsFromUser(user)
}

async function ownedUnlockIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.userTableUnlock.findMany({
    where: { userId },
    select: { unlockId: true },
  })
  return new Set(rows.map((r) => r.unlockId))
}

function isUnlockOwned(owned: Set<string>, unlockId: string): boolean {
  if (unlockId === CUSTOM_FELT_COLOR_UNLOCK || unlockId === CUSTOM_FELT_BACKGROUND_UNLOCK) {
    return owned.has(unlockId)
  }
  if (isFreeFeltTheme(unlockId) || isFreeFeltBackground(unlockId)) return true
  return owned.has(unlockId)
}

export async function listTableThemeShop(userId: string) {
  const owned = await ownedUnlockIds(userId)
  const feltThemes = FELT_THEME_IDS.map((id) => ({
    id,
    kind: 'felt_theme' as const,
    priceChips: feltThemePriceChips(id),
    free: isFreeFeltTheme(id),
    owned: isUnlockOwned(owned, id),
  }))
  const feltBackgrounds = FELT_BACKGROUND_IDS.map((id) => ({
    id,
    kind: 'felt_background' as const,
    priceChips: feltBackgroundPriceChips(id),
    free: isFreeFeltBackground(id),
    owned: isUnlockOwned(owned, id),
  }))
  const extras = [
    {
      id: CUSTOM_FELT_COLOR_UNLOCK,
      kind: 'custom_felt_color' as const,
      priceChips: tableUnlockPriceChips(CUSTOM_FELT_COLOR_UNLOCK),
      free: false,
      owned: owned.has(CUSTOM_FELT_COLOR_UNLOCK),
    },
    {
      id: CUSTOM_FELT_BACKGROUND_UNLOCK,
      kind: 'custom_background' as const,
      priceChips: tableUnlockPriceChips(CUSTOM_FELT_BACKGROUND_UNLOCK),
      free: false,
      owned: owned.has(CUSTOM_FELT_BACKGROUND_UNLOCK),
    },
  ]
  return { feltThemes, feltBackgrounds, extras }
}

export async function getTablePreferences(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, ...USER_TABLE_SELECT },
  })
  if (!user) throw new ShopError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable')
  const owned = await ownedUnlockIds(userId)
  return {
    visuals: resolveTableVisualsFromUser(user),
    feltThemeId: user.tableFeltThemeId,
    feltCustomColor: user.tableFeltCustomColor,
    feltBackgroundId: user.tableFeltBackgroundId,
    ownedUnlockIds: [...owned],
  }
}

export async function assertCanUseFeltTheme(userId: string, themeId: string): Promise<void> {
  if (themeId === 'custom') {
    const owned = await ownedUnlockIds(userId)
    if (!owned.has(CUSTOM_FELT_COLOR_UNLOCK)) {
      throw new ShopError(403, 'TABLE_THEME_LOCKED', 'Couleur personnalisée non débloquée')
    }
    return
  }
  if (!isFeltThemeId(themeId)) {
    throw new ShopError(400, 'INVALID_FELT_THEME', 'Couleur de tapis invalide')
  }
  if (isFreeFeltTheme(themeId)) return
  const owned = await ownedUnlockIds(userId)
  if (!owned.has(themeId)) {
    throw new ShopError(403, 'TABLE_THEME_LOCKED', 'Couleur de tapis non débloquée')
  }
}

export async function assertCanUseFeltBackground(userId: string, backgroundId: string): Promise<void> {
  if (backgroundId === 'custom') {
    const owned = await ownedUnlockIds(userId)
    if (!owned.has(CUSTOM_FELT_BACKGROUND_UNLOCK)) {
      throw new ShopError(403, 'TABLE_BACKGROUND_LOCKED', 'Fond personnalisé non débloqué')
    }
    return
  }
  if (!isFeltBackgroundId(backgroundId)) {
    throw new ShopError(400, 'INVALID_FELT_BACKGROUND', 'Fond invalide')
  }
  if (isFreeFeltBackground(backgroundId)) return
  const owned = await ownedUnlockIds(userId)
  if (!owned.has(backgroundId)) {
    throw new ShopError(403, 'TABLE_BACKGROUND_LOCKED', 'Fond non débloqué')
  }
}

export async function updateTablePreferences(
  userId: string,
  input: {
    feltThemeId?: string
    feltCustomColor?: string | null
    feltBackgroundId?: string
  },
) {
  const data: {
    tableFeltThemeId?: string
    tableFeltCustomColor?: string | null
    tableFeltBackgroundId?: string
  } = {}

  if (input.feltThemeId !== undefined) {
    await assertCanUseFeltTheme(userId, input.feltThemeId)
    data.tableFeltThemeId = input.feltThemeId
    if (input.feltThemeId !== 'custom') {
      data.tableFeltCustomColor = null
    }
  }

  if (input.feltCustomColor !== undefined) {
    const theme = input.feltThemeId ?? (
      await prisma.user.findUnique({ where: { id: userId }, select: { tableFeltThemeId: true } })
    )?.tableFeltThemeId
    if (theme === 'custom') {
      const color = input.feltCustomColor?.trim()
      if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) {
        throw new ShopError(400, 'INVALID_COLOR', 'Couleur invalide (#RRGGBB)')
      }
      data.tableFeltCustomColor = color.toLowerCase()
    }
  }

  if (input.feltBackgroundId !== undefined) {
    await assertCanUseFeltBackground(userId, input.feltBackgroundId)
    data.tableFeltBackgroundId = input.feltBackgroundId
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, ...USER_TABLE_SELECT },
  })
  return resolveTableVisualsFromUser(user)
}

export async function purchaseTableUnlock(userId: string, unlockId: string) {
  if (!isTableShopUnlockId(unlockId)) {
    throw new ShopError(404, 'TABLE_UNLOCK_NOT_FOUND', 'Article introuvable')
  }
  if (isFreeFeltTheme(unlockId) || isFreeFeltBackground(unlockId)) {
    throw new ShopError(400, 'TABLE_UNLOCK_FREE', 'Cet article est gratuit')
  }

  const price = tableUnlockPriceChips(unlockId)
  const existing = await prisma.userTableUnlock.findUnique({
    where: { userId_unlockId: { userId, unlockId } },
  })
  if (existing) {
    throw new ShopError(409, 'ALREADY_OWNED', 'Article déjà possédé')
  }

  return prisma.$transaction(async (tx: Tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })
    if (!user) throw new ShopError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable')
    if (user.chips < price) {
      throw new ShopError(402, 'INSUFFICIENT_CHIPS', 'Jetons insuffisants')
    }
    const balanceBefore = user.chips
    const balanceAfter = balanceBefore - price
    await tx.user.update({
      where: { id: userId },
      data: { chips: balanceAfter },
    })
    await tx.userTableUnlock.create({
      data: { userId, unlockId },
    })
    await createWalletLedgerMovement(tx, {
      userId,
      reason: 'TABLE_THEME_PURCHASE',
      balanceBefore,
      balanceAfter,
      gameType: 'shop',
      roundId: unlockId,
    })
    return { unlockId, chips: balanceAfter }
  })
}

export async function saveCustomTableBackground(
  userId: string,
  buffer: Buffer,
  mime: string,
): Promise<TableVisuals> {
  const owned = await ownedUnlockIds(userId)
  if (!owned.has(CUSTOM_FELT_BACKGROUND_UNLOCK)) {
    throw new ShopError(403, 'TABLE_BACKGROUND_LOCKED', 'Fond personnalisé non débloqué')
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      tableFeltBackgroundId: 'custom',
      tableFeltBackgroundImage: new Uint8Array(buffer),
      tableFeltBackgroundMime: mime,
      tableFeltBackgroundHasBinary: true,
    },
    select: { id: true, ...USER_TABLE_SELECT },
  })
  return resolveTableVisualsFromUser(user)
}
