import type { TableThemeId, TableFeltBackgroundId } from "../contexts/TableThemeContext";

export const FELT_THEME_PRICES: Record<TableThemeId, number> = {
  default: 0,
  vegasRed: 10_000,
  vegasPurple: 20_000,
  darkBlue: 30_000,
};

export const FELT_BACKGROUND_PRICES: Record<TableFeltBackgroundId, number> = {
  ba1: 0,
  ba2: 15_000,
  ba3: 10_000,
  ba4: 15_000,
};

export const CUSTOM_FELT_COLOR_UNLOCK = "custom_felt_color";
export const CUSTOM_FELT_BACKGROUND_UNLOCK = "custom_background";
export const CUSTOM_FELT_COLOR_PRICE = 50_000;
export const CUSTOM_FELT_BACKGROUND_PRICE = 40_000;

export type TableVisualsPayload = {
  feltThemeId: TableThemeId | "custom";
  feltCustomColor?: string | null;
  feltBackgroundId: TableFeltBackgroundId | "custom";
  feltBackgroundUrl?: string | null;
};

export function feltThemePriceChips(id: TableThemeId): number {
  return FELT_THEME_PRICES[id] ?? 0;
}

export function feltBackgroundPriceChips(id: TableFeltBackgroundId): number {
  return FELT_BACKGROUND_PRICES[id] ?? 0;
}

export function tableUnlockPriceChips(unlockId: string): number {
  if (unlockId === CUSTOM_FELT_COLOR_UNLOCK) return CUSTOM_FELT_COLOR_PRICE;
  if (unlockId === CUSTOM_FELT_BACKGROUND_UNLOCK) return CUSTOM_FELT_BACKGROUND_PRICE;
  if (unlockId in FELT_THEME_PRICES) return FELT_THEME_PRICES[unlockId as TableThemeId];
  if (unlockId in FELT_BACKGROUND_PRICES) return FELT_BACKGROUND_PRICES[unlockId as TableFeltBackgroundId];
  return 0;
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function feltGradientFromCustomColor(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) {
    return "radial-gradient(ellipse at center, #0b7f52 0%, #032a19 100%)";
  }
  const mix = (f: number) =>
    `rgb(${Math.round(rgb.r * f)}, ${Math.round(rgb.g * f)}, ${Math.round(rgb.b * f)})`;
  return `radial-gradient(ellipse at center, ${mix(1)} 0%, ${mix(0.78)} 35%, ${mix(0.55)} 70%, ${mix(0.28)} 100%)`;
}
