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

/** Catalogue boutique — 11 bannières illustrées, 30 cadres, 10 titres. */
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

const SHOP_FRAME_DEFS = [
  { id: 'frame_iron', nameKey: 'cosmetic.frame.iron', border: '#71797e', glow: '0 0 6px rgba(113,121,126,0.45)', className: 'cosmetic-frame-iron', priceChips: 1_000, rarity: 'common' },
  { id: 'frame_bronze', nameKey: 'cosmetic.frame.bronze', border: '#cd7f32', glow: '0 0 8px rgba(205,127,50,0.5)', className: 'cosmetic-frame-bronze', priceChips: 1_500, rarity: 'common' },
  { id: 'frame_copper', nameKey: 'cosmetic.frame.copper', border: '#b87333', glow: '0 0 9px rgba(184,115,51,0.55)', className: 'cosmetic-frame-copper', priceChips: 1_800, rarity: 'common' },
  { id: 'frame_pearl', nameKey: 'cosmetic.frame.pearl', border: '#f8f6f0', glow: '0 0 10px rgba(248,246,240,0.65)', className: 'cosmetic-frame-pearl', priceChips: 2_200, rarity: 'uncommon' },
  { id: 'frame_rose_gold', nameKey: 'cosmetic.frame.roseGold', border: '#e8b4b8', glow: '0 0 11px rgba(232,180,184,0.7)', className: 'cosmetic-frame-rose-gold', priceChips: 2_500, rarity: 'uncommon' },
  { id: 'frame_silver', nameKey: 'cosmetic.frame.silver', border: '#c0c0c0', glow: '0 0 10px rgba(192,192,192,0.6)', className: 'cosmetic-frame-silver', priceChips: 3_000, rarity: 'uncommon' },
  { id: 'frame_platinum', nameKey: 'cosmetic.frame.platinum', border: '#e5e4e2', glow: '0 0 12px rgba(229,228,226,0.75)', className: 'cosmetic-frame-platinum', priceChips: 3_500, rarity: 'uncommon' },
  { id: 'frame_ruby', nameKey: 'cosmetic.frame.ruby', border: '#e0115f', glow: '0 0 14px rgba(224,17,95,0.75)', className: 'cosmetic-frame-ruby', priceChips: 4_500, rarity: 'rare' },
  { id: 'frame_emerald', nameKey: 'cosmetic.frame.emerald', border: '#50c878', glow: '0 0 14px rgba(80,200,120,0.75)', className: 'cosmetic-frame-emerald', priceChips: 4_800, rarity: 'rare' },
  { id: 'frame_sapphire', nameKey: 'cosmetic.frame.sapphire', border: '#0f52ba', glow: '0 0 14px rgba(15,82,186,0.75)', className: 'cosmetic-frame-sapphire', priceChips: 5_100, rarity: 'rare' },
  { id: 'frame_amethyst', nameKey: 'cosmetic.frame.amethyst', border: '#9966cc', glow: '0 0 15px rgba(153,102,204,0.8)', className: 'cosmetic-frame-amethyst', priceChips: 5_400, rarity: 'rare' },
  { id: 'frame_crimson', nameKey: 'cosmetic.frame.crimson', border: '#dc143c', glow: '0 0 15px rgba(220,20,60,0.8)', className: 'cosmetic-frame-crimson', priceChips: 5_700, rarity: 'rare' },
  { id: 'frame_midnight', nameKey: 'cosmetic.frame.midnight', border: '#1e293b', glow: '0 0 16px rgba(59,130,246,0.55)', className: 'cosmetic-frame-midnight', priceChips: 6_000, rarity: 'rare' },
  { id: 'frame_gold', nameKey: 'cosmetic.frame.gold', border: '#ffd700', glow: '0 0 12px rgba(255,215,0,0.7)', className: 'cosmetic-frame-gold', priceChips: 6_500, rarity: 'rare' },
  { id: 'frame_obsidian', nameKey: 'cosmetic.frame.obsidian', border: '#1a1a2e', glow: '0 0 18px rgba(168,85,247,0.65)', className: 'cosmetic-frame-obsidian', priceChips: 7_000, rarity: 'epic' },
  { id: 'frame_ocean', nameKey: 'cosmetic.frame.ocean', border: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', glow: '0 0 18px rgba(14,165,233,0.8)', className: 'cosmetic-frame-ocean', priceChips: 7_400, rarity: 'epic' },
  { id: 'frame_sunset', nameKey: 'cosmetic.frame.sunset', border: 'linear-gradient(135deg, #f97316, #ec4899)', glow: '0 0 18px rgba(249,115,22,0.8)', className: 'cosmetic-frame-sunset', priceChips: 7_800, rarity: 'epic' },
  { id: 'frame_forest', nameKey: 'cosmetic.frame.forest', border: 'linear-gradient(135deg, #16a34a, #84cc16)', glow: '0 0 18px rgba(22,163,74,0.75)', className: 'cosmetic-frame-forest', priceChips: 8_200, rarity: 'epic' },
  { id: 'frame_diamond', nameKey: 'cosmetic.frame.diamond', border: '#67e8f9', glow: '0 0 16px rgba(103,232,249,0.8)', className: 'cosmetic-frame-diamond', priceChips: 8_600, rarity: 'epic' },
  { id: 'frame_neon_cyan', nameKey: 'cosmetic.frame.neonCyan', border: '#00ffff', glow: '0 0 20px rgba(0,255,255,0.9)', className: 'cosmetic-frame-neon-cyan', priceChips: 9_000, rarity: 'epic' },
  { id: 'frame_neon_magenta', nameKey: 'cosmetic.frame.neonMagenta', border: '#ff00ff', glow: '0 0 20px rgba(255,0,255,0.9)', className: 'cosmetic-frame-neon-magenta', priceChips: 9_400, rarity: 'epic' },
  { id: 'frame_ace', nameKey: 'cosmetic.frame.ace', border: 'linear-gradient(135deg, #dc2626, #0f172a)', glow: '0 0 20px rgba(220,38,38,0.85)', className: 'cosmetic-frame-ace', priceChips: 9_800, rarity: 'epic' },
  { id: 'frame_fire', nameKey: 'cosmetic.frame.fire', border: 'linear-gradient(135deg, #ef4444, #f97316)', glow: '0 0 22px rgba(239,68,68,0.9)', className: 'cosmetic-frame-fire', priceChips: 10_200, rarity: 'legendary' },
  { id: 'frame_ice', nameKey: 'cosmetic.frame.ice', border: 'linear-gradient(135deg, #e0f2fe, #38bdf8)', glow: '0 0 22px rgba(56,189,248,0.9)', className: 'cosmetic-frame-ice', priceChips: 10_600, rarity: 'legendary' },
  { id: 'frame_lightning', nameKey: 'cosmetic.frame.lightning', border: '#facc15', glow: '0 0 24px rgba(250,204,21,0.95)', className: 'cosmetic-frame-lightning', priceChips: 11_000, rarity: 'legendary' },
  { id: 'frame_galaxy', nameKey: 'cosmetic.frame.galaxy', border: 'linear-gradient(135deg, #4c1d95, #312e81)', glow: '0 0 24px rgba(99,102,241,0.95)', className: 'cosmetic-frame-galaxy', priceChips: 11_400, rarity: 'legendary' },
  { id: 'frame_rainbow', nameKey: 'cosmetic.frame.rainbow', border: 'linear-gradient(135deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #a855f7)', glow: '0 0 26px rgba(168,85,247,0.85)', className: 'cosmetic-frame-rainbow', priceChips: 11_800, rarity: 'legendary' },
  { id: 'frame_holographic', nameKey: 'cosmetic.frame.holographic', border: 'linear-gradient(135deg, #67e8f9, #c084fc, #f472b6)', glow: '0 0 26px rgba(192,132,252,0.9)', className: 'cosmetic-frame-holographic', priceChips: 12_200, rarity: 'legendary' },
  { id: 'frame_royal', nameKey: 'cosmetic.frame.royal', border: 'linear-gradient(135deg, #fbbf24, #7c3aed)', glow: '0 0 28px rgba(124,58,237,0.95)', className: 'cosmetic-frame-royal', priceChips: 12_600, rarity: 'legendary' },
  { id: 'frame_quantum', nameKey: 'cosmetic.frame.quantum', border: 'linear-gradient(135deg, #6366f1, #a855f7)', glow: '0 0 20px rgba(99,102,241,0.9)', className: 'cosmetic-frame-quantum', priceChips: 13_000, rarity: 'legendary' },
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

  ...SHOP_FRAME_DEFS.map((f) => ({
    id: f.id,
    type: 'AVATAR_FRAME' as const,
    nameKey: f.nameKey,
    priceChips: f.priceChips,
    purchasable: true,
    rarity: f.rarity,
    styleJson: frameStyle(f.border, f.glow, f.className),
  })),

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
