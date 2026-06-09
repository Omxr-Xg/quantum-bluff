export function parseBeloteActionLogLine(line: string): {
  phase: string;
  playerName: string;
  action: string;
  value?: number;
  trump?: string;
  cardSuit?: string;
  cardRank?: string;
} | null {
  const parts = line.split("|");
  if (parts.length < 3) return null;
  const [phase, playerName, action, valueRaw, trump, cardSuit, cardRank] = parts;
  const value = valueRaw ? Number(valueRaw) : undefined;
  return {
    phase,
    playerName,
    action,
    value: Number.isFinite(value) ? value : undefined,
    trump: trump || undefined,
    cardSuit: cardSuit || undefined,
    cardRank: cardRank || undefined,
  };
}
