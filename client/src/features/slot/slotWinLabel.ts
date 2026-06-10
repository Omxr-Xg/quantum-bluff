import type { SlotReels, SlotSymbolId } from "./slotTypes";

export type SlotWinKind =
  | "mega_jackpot"
  | "royal_win"
  | "diamond_win"
  | "bells"
  | "cherries"
  | "triple_bar"
  | "three_kind"
  | "pair"
  | "no_win";

const FOUR_KIND: Partial<Record<SlotSymbolId, SlotWinKind>> = {
  seven: "mega_jackpot",
  crown: "royal_win",
  diamond: "diamond_win",
  bell: "bells",
  cherry: "cherries",
  bar: "triple_bar",
};

export function classifySlotWin(reels: SlotReels, winAmount: number): SlotWinKind {
  if (winAmount <= 0) return "no_win";
  const [r0, r1, r2, r3] = reels;
  if (r0 === r1 && r1 === r2 && r2 === r3) return FOUR_KIND[r0] ?? "three_kind";
  if ((r0 === r1 && r1 === r2) || (r1 === r2 && r2 === r3)) return "three_kind";
  return "pair";
}
