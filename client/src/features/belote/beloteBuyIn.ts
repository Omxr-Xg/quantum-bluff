export const BELOTE_BUY_IN_PRESETS = [100, 200, 500, 1000] as const;
export const BELOTE_BUY_IN_DEFAULT = 100;
export const BELOTE_BUY_IN_MIN = 10;
export const BELOTE_BUY_IN_MAX = 1_000_000;

export function normalizeBeloteBuyIn(raw: number): number {
  if (!Number.isFinite(raw)) return BELOTE_BUY_IN_DEFAULT;
  return Math.min(BELOTE_BUY_IN_MAX, Math.max(BELOTE_BUY_IN_MIN, Math.floor(raw)));
}

export function belotePotTotal(buyIn: number, players = 4): number {
  return buyIn * players;
}

export function beloteWinnerShare(potTotal: number, winners = 2): number {
  if (winners <= 0) return 0;
  return Math.floor(potTotal / winners);
}
