export const FELT_THEME_IDS = ['default', 'vegasRed', 'vegasPurple', 'darkBlue'] as const
export type FeltThemeId = (typeof FELT_THEME_IDS)[number]

export const FELT_BACKGROUND_IDS = ['ba1', 'ba2', 'ba3', 'ba4'] as const
export type FeltBackgroundId = (typeof FELT_BACKGROUND_IDS)[number]

export const FREE_FELT_THEME_ID: FeltThemeId = 'default'
export const FREE_FELT_BACKGROUND_ID: FeltBackgroundId = 'ba1'

export const CUSTOM_FELT_COLOR_UNLOCK = 'custom_felt_color'
export const CUSTOM_FELT_BACKGROUND_UNLOCK = 'custom_background'

export const FELT_THEME_PRICES: Record<FeltThemeId, number> = {
  default: 0,
  vegasRed: 10_000,
  vegasPurple: 20_000,
  darkBlue: 30_000,
}

export const FELT_BACKGROUND_PRICES: Record<FeltBackgroundId, number> = {
  ba1: 0,
  ba2: 15_000,
  ba3: 10_000,
  ba4: 15_000,
}

export const CUSTOM_FELT_COLOR_PRICE = 50_000
export const CUSTOM_FELT_BACKGROUND_PRICE = 40_000

const FELT_THEME_SET = new Set<string>(FELT_THEME_IDS)
const FELT_BG_SET = new Set<string>(FELT_BACKGROUND_IDS)

export function isFeltThemeId(id: string): id is FeltThemeId {
  return FELT_THEME_SET.has(id)
}

export function isFeltBackgroundId(id: string): id is FeltBackgroundId {
  return FELT_BG_SET.has(id)
}

export function isFreeFeltTheme(id: string): boolean {
  return id === FREE_FELT_THEME_ID
}

export function isFreeFeltBackground(id: string): boolean {
  return id === FREE_FELT_BACKGROUND_ID
}

export function feltThemePriceChips(id: string): number {
  if (!isFeltThemeId(id)) return 0
  return FELT_THEME_PRICES[id]
}

export function feltBackgroundPriceChips(id: string): number {
  if (!isFeltBackgroundId(id)) return 0
  return FELT_BACKGROUND_PRICES[id]
}

export type TableShopUnlockId =
  | FeltThemeId
  | FeltBackgroundId
  | typeof CUSTOM_FELT_COLOR_UNLOCK
  | typeof CUSTOM_FELT_BACKGROUND_UNLOCK

export function tableUnlockPriceChips(unlockId: string): number {
  if (unlockId === CUSTOM_FELT_COLOR_UNLOCK) return CUSTOM_FELT_COLOR_PRICE
  if (unlockId === CUSTOM_FELT_BACKGROUND_UNLOCK) return CUSTOM_FELT_BACKGROUND_PRICE
  if (isFeltThemeId(unlockId)) return feltThemePriceChips(unlockId)
  if (isFeltBackgroundId(unlockId)) return feltBackgroundPriceChips(unlockId)
  return 0
}

export function isTableShopUnlockId(id: string): id is TableShopUnlockId {
  return (
    isFeltThemeId(id) ||
    isFeltBackgroundId(id) ||
    id === CUSTOM_FELT_COLOR_UNLOCK ||
    id === CUSTOM_FELT_BACKGROUND_UNLOCK
  )
}
