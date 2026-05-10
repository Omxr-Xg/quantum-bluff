/**
 * Aligné sur server/src/logic/Evaluator.ts — garder la même logique de catégories (0–9).
 * Utilisé par le HUD Quantum pour afficher la main courante.
 */

type Suit = "HEARTS" | "DIAMONDS" | "CLUBS" | "SPADES";
type Rank =
  | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface EvalCard {
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

/** Même encodage que server/src/logic/Evaluator.ts (packScore / BASE). */
const SCORE_BASE = 15;

function packScore(category: number, kickers: number[]): number {
  const k = [...kickers];
  while (k.length < 5) k.push(0);
  return (
    category * Math.pow(SCORE_BASE, 5) +
    k[0] * Math.pow(SCORE_BASE, 4) +
    k[1] * Math.pow(SCORE_BASE, 3) +
    k[2] * Math.pow(SCORE_BASE, 2) +
    k[3] * Math.pow(SCORE_BASE, 1) +
    k[4]
  );
}

/** Best 5 sur 7 — même logique que le serveur ; utile au Monte Carlo HUD. */
export function evaluateSevenEval(cards: EvalCard[]): { category: number; score: number } {
  if (cards.length < 5) {
    const hi = ranksDesc(cards);
    const score = packScore(0, hi.slice(0, 5));
    return { category: 0, score };
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
      return { category: 9, score: packScore(9, [sfHigh, 0, 0, 0, 0]) };
    }
  }

  if (groups[0]?.count === 4) {
    const quadRank = groups[0].rank;
    const kicker = groups.find((g) => g.rank !== quadRank)?.rank ?? 0;
    return { category: 8, score: packScore(8, [quadRank, kicker, 0, 0, 0]) };
  }

  if (groups[0]?.count === 3) {
    const tripsRank = groups[0].rank;
    const pairCandidate = groups.find(
      (g) => g.rank !== tripsRank && g.count >= 2,
    );
    if (pairCandidate) {
      return {
        category: 7,
        score: packScore(7, [tripsRank, pairCandidate.rank, 0, 0, 0]),
      };
    }
  }

  const allValues = cards.map((c) => c.value ?? RANK_VALUE[c.rank]);
  const qKick = quantumCombiKickers(allValues);
  if (qKick) {
    return { category: 6, score: packScore(6, [qKick[0], qKick[1], 0, 0, 0]) };
  }

  if (flushCards) {
    const flushValues = ranksDesc(flushCards).slice(0, 5);
    return { category: 5, score: packScore(5, flushValues) };
  }

  if (straightHigh > 0) {
    return { category: 4, score: packScore(4, [straightHigh, 0, 0, 0, 0]) };
  }

  if (groups[0]?.count === 3) {
    const tripsRank = groups[0].rank;
    const kickers = groups
      .filter((g) => g.rank !== tripsRank)
      .map((g) => g.rank)
      .sort((a, b) => b - a)
      .slice(0, 2);
    return { category: 3, score: packScore(3, [tripsRank, ...kickers, 0, 0]) };
  }

  if (groups[0]?.count === 2 && groups[1]?.count === 2) {
    const pair1 = Math.max(groups[0].rank, groups[1].rank);
    const pair2 = Math.min(groups[0].rank, groups[1].rank);
    const kicker =
      groups.find((g) => g.rank !== pair1 && g.rank !== pair2)?.rank ?? 0;
    return { category: 2, score: packScore(2, [pair1, pair2, kicker, 0, 0]) };
  }

  if (groups[0]?.count === 2) {
    const pairRank = groups[0].rank;
    const kickers = groups
      .filter((g) => g.rank !== pairRank)
      .map((g) => g.rank)
      .sort((a, b) => b - a)
      .slice(0, 3);
    return { category: 1, score: packScore(1, [pairRank, ...kickers, 0]) };
  }

  const high = Array.from(rankCounts.keys())
    .sort((a, b) => b - a)
    .slice(0, 5);
  return { category: 0, score: packScore(0, high) };
}

function mapSuit(s: string): Suit {
  const u = s.toLowerCase();
  if (u === "hearts") return "HEARTS";
  if (u === "diamonds") return "DIAMONDS";
  if (u === "clubs") return "CLUBS";
  return "SPADES";
}

const ALL_SUITS: Suit[] = ["HEARTS", "DIAMONDS", "CLUBS", "SPADES"];
const ALL_RANKS: Rank[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];

/** Jeu de 52 cartes hors celles déjà connues (même codage que l’évaluateur). */
export function buildDeckExcluding(known: { suit: string; value: string }[]): EvalCard[] {
  const used = new Set(
    known.map((c) => `${mapSuit(c.suit)}|${mapRank(c.value)}`),
  );
  const deck: EvalCard[] = [];
  for (const suit of ALL_SUITS) {
    for (const rank of ALL_RANKS) {
      if (used.has(`${suit}|${rank}`)) continue;
      deck.push({ suit, rank, value: RANK_VALUE[rank] });
    }
  }
  return deck;
}

export function toEvalCards(cards: { suit: string; value: string }[]): EvalCard[] {
  return cards.map((c) => {
    const rank = mapRank(c.value);
    return { suit: mapSuit(c.suit), rank, value: RANK_VALUE[rank] };
  });
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
  return evaluateSevenEval(cards).category;
}

/** Score numérique comparable au serveur (`getHandValue`) — plus grand = meilleure main. */
export function getSevenCardScore(
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
  return evaluateSevenEval(cards).score;
}
