import type { CosmeticType } from '../generated/prisma/index.js'
import { prisma } from '../config/database.js'
import type { CosmeticCatalogEntry } from './cosmetics.catalog.js'
import { COSMETIC_BY_ID } from './cosmetics.catalog.js'

/** Cosmétiques hors catalogue (créés en admin, événements, etc.). */
const runtimeCosmetics = new Map<string, CosmeticCatalogEntry>()

function rowToEntry(row: {
  id: string
  type: CosmeticType
  nameKey: string
  priceChips: number
  purchasable: boolean
  rarity: string | null
  styleJson: string | null
}): CosmeticCatalogEntry {
  return {
    id: row.id,
    type: row.type,
    nameKey: row.nameKey,
    priceChips: row.priceChips,
    purchasable: row.purchasable,
    rarity: row.rarity ?? 'unique',
    styleJson: row.styleJson ?? '{}',
  }
}

export function registerRuntimeCosmetic(entry: CosmeticCatalogEntry): void {
  runtimeCosmetics.set(entry.id, entry)
}

export function getCosmeticById(id: string): CosmeticCatalogEntry | undefined {
  return COSMETIC_BY_ID.get(id) ?? runtimeCosmetics.get(id)
}

export async function refreshRuntimeCosmeticsFromDb(): Promise<void> {
  const rows = await prisma.cosmeticItem.findMany()
  for (const row of rows) {
    if (!COSMETIC_BY_ID.has(row.id)) {
      runtimeCosmetics.set(row.id, rowToEntry(row))
    }
  }
}
