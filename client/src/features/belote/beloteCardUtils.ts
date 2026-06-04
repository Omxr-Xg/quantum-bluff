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

/** Faible → fort en couleur (hors atout) : l’As est en tête. */
export const SIDE_RANK_WEAK_TO_STRONG = ["7", "8", "9", "J", "Q", "K", "10", "A"] as const;
/** Faible → fort à l’atout : le Valet est en tête. */
export const TRUMP_RANK_WEAK_TO_STRONG = ["7", "8", "Q", "K", "10", "A", "9", "J"] as const;

function normalizeRank(rank: string): string {
  const r = rank.toUpperCase();
  if (r === "10") return "10";
  return r;
}

/** Indice de force belote (plus grand = plus fort). */
export function beloteRankStrength(rank: string, suit: string, trump?: string | null): number {
  const order =
    trump && suit.toUpperCase() === trump.toUpperCase()
      ? TRUMP_RANK_WEAK_TO_STRONG
      : SIDE_RANK_WEAK_TO_STRONG;
  const r = normalizeRank(rank);
  const i = (order as readonly string[]).indexOf(r);
  return i >= 0 ? i : 0;
}

export function compareBeloteCards(
  a: { suit: string; rank: string },
  b: { suit: string; rank: string },
  trump?: string | null,
): number {
  const suitCmp = a.suit.localeCompare(b.suit);
  if (suitCmp !== 0) return suitCmp;
  return beloteRankStrength(a.rank, a.suit, trump) - beloteRankStrength(b.rank, b.suit, trump);
}

export function cardKey(card: { suit: string; rank: string }): string {
  return `${card.suit}|${card.rank}`;
}
