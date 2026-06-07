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

function bannerStyle(gradient: string, className: string): string {
  return JSON.stringify({ gradient, className })
}

function frameStyle(border: string, glow: string, className: string): string {
  return JSON.stringify({ border, glow, className })
}

function titleStyle(color: string, className: string): string {
  return JSON.stringify({ color, className })
}

/** Catalogue V1 — exactement 20 cosmétiques (5 bannières, 5 cadres, 10 titres). */
export const COSMETIC_CATALOG: CosmeticCatalogEntry[] = [
  // Bannières (5)
  {
    id: 'banner_quantum_blue',
    type: 'BANNER',
    nameKey: 'cosmetic.banner.quantumBlue',
    priceChips: 2_000,
    purchasable: true,
    rarity: 'common',
    styleJson: bannerStyle(
      'linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #312e81 100%)',
      'cosmetic-banner-quantum-blue',
    ),
  },
  {
    id: 'banner_royal_gold',
    type: 'BANNER',
    nameKey: 'cosmetic.banner.royalGold',
    priceChips: 4_000,
    purchasable: true,
    rarity: 'rare',
    styleJson: bannerStyle(
      'linear-gradient(135deg, #fbbf24 0%, #d97706 50%, #78350f 100%)',
      'cosmetic-banner-royal-gold',
    ),
  },
  {
    id: 'banner_neon_casino',
    type: 'BANNER',
    nameKey: 'cosmetic.banner.neonCasino',
    priceChips: 5_000,
    purchasable: true,
    rarity: 'rare',
    styleJson: bannerStyle(
      'linear-gradient(135deg, #f472b6 0%, #a855f7 50%, #06b6d4 100%)',
      'cosmetic-banner-neon-casino',
    ),
  },
  {
    id: 'banner_dark_legend',
    type: 'BANNER',
    nameKey: 'cosmetic.banner.darkLegend',
    priceChips: 6_500,
    purchasable: true,
    rarity: 'epic',
    styleJson: bannerStyle(
      'linear-gradient(135deg, #18181b 0%, #3f3f46 50%, #71717a 100%)',
      'cosmetic-banner-dark-legend',
    ),
  },
  {
    id: 'banner_crimson_poker',
    type: 'BANNER',
    nameKey: 'cosmetic.banner.crimsonPoker',
    priceChips: 8_000,
    purchasable: true,
    rarity: 'legendary',
    styleJson: bannerStyle(
      'linear-gradient(135deg, #991b1b 0%, #dc2626 50%, #450a0a 100%)',
      'cosmetic-banner-crimson-poker',
    ),
  },

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
