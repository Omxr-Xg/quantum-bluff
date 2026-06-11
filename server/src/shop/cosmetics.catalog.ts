import type { CosmeticType } from '../generated/prisma/index.js'

export type CosmeticCatalogEntry = {
  id: string
  type: CosmeticType
  nameKey: string
  priceChips: number
  purchasable: boolean
  rarity: string
  styleJson: string
}

function bannerImageStyle(file: string, className: string): string {
  const imageUrl = `/cosmetic-banners/${file}`
  const backgroundCss = `url("${imageUrl}")`
  return JSON.stringify({
    imageUrl,
    className,
    backgroundCss,
    gradient: backgroundCss,
    overlayOpacity: 0.32,
  })
}

function frameStyle(border: string, glow: string, className: string): string {
  return JSON.stringify({ border, glow, className })
}

function titleStyle(color: string, className: string): string {
  return JSON.stringify({ color, className })
}

/** Catalogue boutique — 11 bannières illustrées, 5 cadres, 10 titres. */
const SHOP_BANNER_DEFS = [
  { id: 'banner_ban_generic', nameKey: 'cosmetic.banner.generic', file: 'ban1.webp', priceChips: 1_000, rarity: 'common' },
  { id: 'banner_ban_france', nameKey: 'cosmetic.banner.france', file: 'ban2.webp', priceChips: 1_250, rarity: 'common' },
  { id: 'banner_ban_tunisia', nameKey: 'cosmetic.banner.tunisia', file: 'ban3.webp', priceChips: 1_500, rarity: 'common' },
  { id: 'banner_ban_ukraine', nameKey: 'cosmetic.banner.ukraine', file: 'ban4.webp', priceChips: 1_750, rarity: 'uncommon' },
  { id: 'banner_ban_palestine', nameKey: 'cosmetic.banner.palestine', file: 'ban5.webp', priceChips: 2_000, rarity: 'uncommon' },
  { id: 'banner_ban_turkey', nameKey: 'cosmetic.banner.turkey', file: 'ban6.webp', priceChips: 2_250, rarity: 'uncommon' },
  { id: 'banner_ban_algeria', nameKey: 'cosmetic.banner.algeria', file: 'ban7.webp', priceChips: 2_500, rarity: 'rare' },
  { id: 'banner_ban_iran', nameKey: 'cosmetic.banner.iran', file: 'ban8.webp', priceChips: 2_750, rarity: 'rare' },
  { id: 'banner_ban_premium', nameKey: 'cosmetic.banner.premium', file: 'ban9.webp', priceChips: 3_000, rarity: 'rare' },
  { id: 'banner_ban_sexy', nameKey: 'cosmetic.banner.bluffeur', file: 'ban10.webp', priceChips: 3_250, rarity: 'epic' },
  { id: 'banner_ban_bluffeur', nameKey: 'cosmetic.banner.sexy', file: 'ban11.webp', priceChips: 3_500, rarity: 'legendary' },
] as const

export const COSMETIC_CATALOG: CosmeticCatalogEntry[] = [
  ...SHOP_BANNER_DEFS.map((b) => ({
    id: b.id,
    type: 'BANNER' as const,
    nameKey: b.nameKey,
    priceChips: b.priceChips,
    purchasable: true,
    rarity: b.rarity,
    styleJson: bannerImageStyle(b.file, b.id.replace(/_/g, '-')),
  })),

  // Cadres avatar (5)
  {
    id: 'frame_bronze',
    type: 'AVATAR_FRAME',
    nameKey: 'cosmetic.frame.bronze',
    priceChips: 1_500,
    purchasable: true,
    rarity: 'common',
    styleJson: frameStyle('#cd7f32', '0 0 8px rgba(205,127,50,0.5)', 'cosmetic-frame-bronze'),
  },
  {
    id: 'frame_silver',
    type: 'AVATAR_FRAME',
    nameKey: 'cosmetic.frame.silver',
    priceChips: 3_000,
    purchasable: true,
    rarity: 'uncommon',
    styleJson: frameStyle('#c0c0c0', '0 0 10px rgba(192,192,192,0.6)', 'cosmetic-frame-silver'),
  },
  {
    id: 'frame_gold',
    type: 'AVATAR_FRAME',
    nameKey: 'cosmetic.frame.gold',
    priceChips: 5_000,
    purchasable: true,
    rarity: 'rare',
    styleJson: frameStyle('#ffd700', '0 0 12px rgba(255,215,0,0.7)', 'cosmetic-frame-gold'),
  },
  {
    id: 'frame_diamond',
    type: 'AVATAR_FRAME',
    nameKey: 'cosmetic.frame.diamond',
    priceChips: 8_000,
    purchasable: true,
    rarity: 'epic',
    styleJson: frameStyle('#67e8f9', '0 0 16px rgba(103,232,249,0.8)', 'cosmetic-frame-diamond'),
  },
  {
    id: 'frame_quantum',
    type: 'AVATAR_FRAME',
    nameKey: 'cosmetic.frame.quantum',
    priceChips: 10_000,
    purchasable: true,
    rarity: 'legendary',
    styleJson: frameStyle(
      'linear-gradient(135deg, #6366f1, #a855f7)',
      '0 0 20px rgba(99,102,241,0.9)',
      'cosmetic-frame-quantum',
    ),
  },

  // Titres (10)
  {
    id: 'title_bluffer',
    type: 'TITLE',
    nameKey: 'cosmetic.title.bluffer',
    priceChips: 500,
    purchasable: true,
    rarity: 'common',
    styleJson: titleStyle('#94a3b8', 'cosmetic-title-bluffer'),
  },
  {
    id: 'title_regular',
    type: 'TITLE',
    nameKey: 'cosmetic.title.regular',
    priceChips: 750,
    purchasable: true,
    rarity: 'common',
    styleJson: titleStyle('#64748b', 'cosmetic-title-regular'),
  },
  {
    id: 'title_strategist',
    type: 'TITLE',
    nameKey: 'cosmetic.title.strategist',
    priceChips: 1_000,
    purchasable: true,
    rarity: 'uncommon',
    styleJson: titleStyle('#38bdf8', 'cosmetic-title-strategist'),
  },
  {
    id: 'title_veteran',
    type: 'TITLE',
    nameKey: 'cosmetic.title.veteran',
    priceChips: 1_500,
    purchasable: true,
    rarity: 'uncommon',
    styleJson: titleStyle('#22c55e', 'cosmetic-title-veteran'),
  },
  {
    id: 'title_expert',
    type: 'TITLE',
    nameKey: 'cosmetic.title.expert',
    priceChips: 2_000,
    purchasable: true,
    rarity: 'rare',
    styleJson: titleStyle('#818cf8', 'cosmetic-title-expert'),
  },
  {
    id: 'title_elite',
    type: 'TITLE',
    nameKey: 'cosmetic.title.elite',
    priceChips: 2_500,
    purchasable: true,
    rarity: 'rare',
    styleJson: titleStyle('#c084fc', 'cosmetic-title-elite'),
  },
  {
    id: 'title_master',
    type: 'TITLE',
    nameKey: 'cosmetic.title.master',
    priceChips: 3_000,
    purchasable: true,
    rarity: 'epic',
    styleJson: titleStyle('#f472b6', 'cosmetic-title-master'),
  },
  {
    id: 'title_champion',
    type: 'TITLE',
    nameKey: 'cosmetic.title.champion',
    priceChips: 3_500,
    purchasable: true,
    rarity: 'epic',
    styleJson: titleStyle('#fb923c', 'cosmetic-title-champion'),
  },
  {
    id: 'title_legend',
    type: 'TITLE',
    nameKey: 'cosmetic.title.legend',
    priceChips: 4_500,
    purchasable: true,
    rarity: 'legendary',
    styleJson: titleStyle('#fbbf24', 'cosmetic-title-legend'),
  },
  {
    id: 'title_millionaire',
    type: 'TITLE',
    nameKey: 'cosmetic.title.millionaire',
    priceChips: 0,
    purchasable: false,
    rarity: 'legendary',
    styleJson: titleStyle('#fde047', 'cosmetic-title-millionaire'),
  },
]

export const COSMETIC_BY_ID = new Map(COSMETIC_CATALOG.map((c) => [c.id, c] as const))
