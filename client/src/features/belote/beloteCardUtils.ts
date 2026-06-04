/** Map moteur Belote → props {@link PokerCard} (hearts, K, 10, …). */
export function mapBeloteSuit(suit: string): string {
  const m: Record<string, string> = {
    HEARTS: "hearts",
    DIAMONDS: "diamonds",
    CLUBS: "clubs",
    SPADES: "spades",
  };
  return m[suit.toUpperCase()] ?? suit.toLowerCase();
}

export function mapBeloteRank(rank: string): string {
  const r = rank.toUpperCase();
  if (r === "10") return "10";
  return r;
}

export const BELOTE_SUIT_LABEL: Record<string, string> = {
  HEARTS: "♥",
  DIAMONDS: "♦",
  CLUBS: "♣",
  SPADES: "♠",
};

export const BELOTE_SUITS = ["HEARTS", "DIAMONDS", "CLUBS", "SPADES"] as const;
