/**
 * Aligné sur server/src/logic/Evaluator.ts — garder la même logique de catégories (0–9).
 * Utilisé par le HUD Quantum pour afficher la main courante.
 */

type Suit = "HEARTS" | "DIAMONDS" | "CLUBS" | "SPADES";
type Rank =
  | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

interface EvalCard {
  suit: Suit;
  rank: Rank;
  value: number;
}

const RANK_VALUE: Record<Rank, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

const QUANTUM_RANKS = [3, 5, 6, 7, 10] as const;

function ranksDesc(cards: EvalCard[]): number[] {
  return cards.map((c) => c.value ?? RANK_VALUE[c.rank]).sort((a, b) => b - a);
}

function countByRank(values: number[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}

function quantumCombiKickers(allValues: number[]): [number, number] | null {
  const counts = countByRank(allValues);
  for (const r of QUANTUM_RANKS) {
    if ((counts.get(r) ?? 0) < 1) return null;
  }
  const mult = new Map(counts);
  for (const r of QUANTUM_RANKS) {
    mult.set(r, (mult.get(r) ?? 0) - 1);
  }
  const remaining: number[] = [];
  for (const [r, c] of mult) {
    for (let i = 0; i < c; i++) remaining.push(r);
  }
  remaining.sort((a, b) => b - a);
  if (remaining.length < 2) return null;
  return [remaining[0], remaining[1]];
}

function countBySuit(cards: EvalCard[]): Map<Suit, EvalCard[]> {
  const m = new Map<Suit, EvalCard[]>();
  for (const c of cards) {
    const arr = m.get(c.suit) ?? [];
    arr.push(c);
    m.set(c.suit, arr);
  }
  return m;
}

function findStraightHigh(values: number[]): number {
  const uniq = Array.from(new Set(values)).sort((a, b) => b - a);
  if (uniq.includes(14)) uniq.push(1);
  let run = 1;
  for (let i = 0; i < uniq.length - 1; i++) {
    if (uniq[i] - 1 === uniq[i + 1]) {
      run++;
      if (run >= 5) {
        const startIndex = i - 3;
        return uniq[startIndex];
      }
    } else if (uniq[i] !== uniq[i + 1]) {
      run = 1;
    }
  }
  return 0;
}

function evaluateSeven(cards: EvalCard[]): { category: number } {
  if (cards.length < 5) {
    return { category: 0 };
  }

  const values = ranksDesc(cards);
  const rankCounts = countByRank(values);
  const groups = Array.from(rankCounts.entries())
    .map(([rank, count]) => ({ rank, count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  const suitMap = countBySuit(cards);
  let flushCards: EvalCard[] | null = null;
  for (const [, suited] of suitMap) {
    if (suited.length >= 5) {
      flushCards = suited
        .slice()
        .sort(
          (a, b) =>
            (b.value ?? RANK_VALUE[b.rank]) - (a.value ?? RANK_VALUE[a.rank]),
        );
      break;
    }
  }

  const straightHigh = findStraightHigh(values);

  if (flushCards) {
    const flushValues = ranksDesc(flushCards);
    const sfHigh = findStraightHigh(flushValues);
    if (sfHigh > 0) {
      return { category: 9 };
    }
  }

  if (groups[0]?.count === 4) {
    return { category: 8 };
  }

  if (groups[0]?.count === 3) {
    const tripsRank = groups[0].rank;
    const pairCandidate = groups.find(
      (g) => g.rank !== tripsRank && g.count >= 2,
    );
    if (pairCandidate) {
      return { category: 7 };
    }
  }

  const allValues = cards.map((c) => c.value ?? RANK_VALUE[c.rank]);
  const qKick = quantumCombiKickers(allValues);
  if (qKick) {
    return { category: 6 };
  }

  if (flushCards) {
    return { category: 5 };
  }

  if (straightHigh > 0) {
    return { category: 4 };
  }

  if (groups[0]?.count === 3) {
    return { category: 3 };
  }

  if (groups[0]?.count === 2 && groups[1]?.count === 2) {
    return { category: 2 };
  }

  if (groups[0]?.count === 2) {
    return { category: 1 };
  }

  return { category: 0 };
}

function mapSuit(s: string): Suit {
  const u = s.toLowerCase();
  if (u === "hearts") return "HEARTS";
  if (u === "diamonds") return "DIAMONDS";
  if (u === "clubs") return "CLUBS";
  return "SPADES";
}

function mapRank(v: string): Rank {
  const x = v.trim().toUpperCase();
  if (x === "10") return "10";
  if (x === "J" || x === "Q" || x === "K" || x === "A") return x as Rank;
  if (/^[2-9]$/.test(x)) return x as Rank;
  return "2";
}

export function getHandCategoryIndex(
  playerCards: { suit: string; value: string }[],
  communityCards: ({ suit: string; value: string } | null)[],
): number {
  const raw: { suit: string; value: string }[] = [
    ...playerCards,
    ...communityCards.filter((c): c is { suit: string; value: string } => c != null),
  ];
  const cards: EvalCard[] = raw.map((c) => {
    const rank = mapRank(c.value);
    return {
      suit: mapSuit(c.suit),
      rank,
      value: RANK_VALUE[rank],
    };
  });
  return evaluateSeven(cards).category;
}
