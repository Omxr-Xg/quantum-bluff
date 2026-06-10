export type SlotSymbolId = "seven" | "crown" | "diamond" | "cherry" | "bell" | "bar";

export type SlotReels = [SlotSymbolId, SlotSymbolId, SlotSymbolId, SlotSymbolId];

export const SLOT_SYMBOLS: SlotSymbolId[] = ["seven", "crown", "diamond", "cherry", "bell", "bar"];

export const SLOT_BET_PRESETS = [10, 20, 50, 100, 250, 500] as const;

export function parseApiSymbol(raw: string): SlotSymbolId {
  if ((SLOT_SYMBOLS as readonly string[]).includes(raw)) return raw as SlotSymbolId;
  if (raw === "lemon") return "crown";
  return "cherry";
}

export function parseApiReels(raw: string[]): SlotReels {
  const mapped = raw.map(parseApiSymbol);
  while (mapped.length < 4) mapped.push("cherry");
  return [mapped[0]!, mapped[1]!, mapped[2]!, mapped[3]!];
}
