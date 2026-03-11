// server/src/logic/Evaluator.ts
// QUANTUM BLUFF - PHASE 3 ALPHA - HAND EVALUATOR (Soheil)
//
// Exports required:
// - getHandValue(cards): number
// - findWinner(players, board): string
//
// This implementation scores Texas Hold'em hands from up to 7 cards (2 hole + board).
// Score is a single number built from (category + tie breakers).

import type { Card, Player, Rank, Suit } from "../types/poker.js";

// ------------------------------
// Rank helpers
// ------------------------------
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

function ranksDesc(cards: Card[]): number[] {
  return cards.map((c) => c.value ?? RANK_VALUE[c.rank]).sort((a, b) => b - a);
}

function countByRank(values: number[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}

function countBySuit(cards: Card[]): Map<Suit, Card[]> {
  const m = new Map<Suit, Card[]>();
  for (const c of cards) {
    const arr = m.get(c.suit) ?? [];
    arr.push(c);
    m.set(c.suit, arr);
  }
  return m;
}

// ------------------------------
// Straight detection
// Returns highest card of straight, or 0 if none.
// Handles wheel straight A-2-3-4-5 (returns 5).
// ------------------------------
function findStraightHigh(values: number[]): number {
  // unique, descending
  const uniq = Array.from(new Set(values)).sort((a, b) => b - a);

  // Ace-low wheel: treat Ace(14) as 1
  if (uniq.includes(14)) uniq.push(1);

  let run = 1;
  for (let i = 0; i < uniq.length - 1; i++) {
    if (uniq[i] - 1 === uniq[i + 1]) {
      run++;
      if (run >= 5) {
        // highest of the 5-card straight is the first element of the run
        const startIndex = i - 3;
        return uniq[startIndex];
      }
    } else if (uniq[i] !== uniq[i + 1]) {
      run = 1;
    }
  }
  return 0;
}

// ------------------------------
// Build a comparable score number from:
// category (0..8) + 5 kickers/tiebreakers
//
// We encode as:
// score = category * 15^5 + k1*15^4 + k2*15^3 + k3*15^2 + k4*15 + k5
//
// Where each ki is in [0..14]. (15 is safe base).
// ------------------------------
const BASE = 15;

function packScore(category: number, kickers: number[]): number {
  const k = [...kickers];
  while (k.length < 5) k.push(0);
  return (
    category * Math.pow(BASE, 5) +
    k[0] * Math.pow(BASE, 4) +
    k[1] * Math.pow(BASE, 3) +
    k[2] * Math.pow(BASE, 2) +
    k[3] * Math.pow(BASE, 1) +
    k[4]
  );
}

// ------------------------------
// Core evaluation: returns {category, kickers, score}
// category: higher is better
// ------------------------------
type EvalOut = { category: number; kickers: number[]; score: number };

function evaluateSeven(cards: Card[]): EvalOut {
  if (cards.length < 5) {
    // Not enough to form a poker hand, treat as high-card with what we have
    const hi = ranksDesc(cards);
    const score = packScore(0, hi.slice(0, 5));
    return { category: 0, kickers: hi.slice(0, 5), score };
  }

  const values = ranksDesc(cards); // descending values (with duplicates)
  const rankCounts = countByRank(values);

  // Sorted rank groups by (count desc, rank desc)
  const groups = Array.from(rankCounts.entries())
    .map(([rank, count]) => ({ rank, count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  // Flush detection
  const suitMap = countBySuit(cards);
  let flushCards: Card[] | null = null;
  for (const [, suited] of suitMap) {
    if (suited.length >= 5) {
      // take top suited cards by value
      flushCards = suited
        .slice()
        .sort(
          (a, b) =>
            (b.value ?? RANK_VALUE[b.rank]) - (a.value ?? RANK_VALUE[a.rank]),
        );
      break;
    }
  }

  // Straight & straight flush
  const straightHigh = findStraightHigh(values);

  if (flushCards) {
    const flushValues = ranksDesc(flushCards);
    const sfHigh = findStraightHigh(flushValues);
    if (sfHigh > 0) {
      // Straight Flush (including royal flush as sfHigh=14)
      const score = packScore(8, [sfHigh, 0, 0, 0, 0]);
      return { category: 8, kickers: [sfHigh], score };
    }
  }

  // Four of a kind
  if (groups[0]?.count === 4) {
    const quadRank = groups[0].rank;
    const kicker = groups.find((g) => g.rank !== quadRank)?.rank ?? 0;
    const score = packScore(7, [quadRank, kicker, 0, 0, 0]);
    return { category: 7, kickers: [quadRank, kicker], score };
  }

  // Full house (3 + 2)
  if (groups[0]?.count === 3) {
    const tripsRank = groups[0].rank;
    const pairCandidate = groups.find(
      (g) => g.rank !== tripsRank && g.count >= 2,
    );
    if (pairCandidate) {
      const score = packScore(6, [tripsRank, pairCandidate.rank, 0, 0, 0]);
      return { category: 6, kickers: [tripsRank, pairCandidate.rank], score };
    }
  }

  // Flush
  if (flushCards) {
    const flushValues = ranksDesc(flushCards).slice(0, 5);
    const score = packScore(5, flushValues);
    return { category: 5, kickers: flushValues, score };
  }

  // Straight
  if (straightHigh > 0) {
    const score = packScore(4, [straightHigh, 0, 0, 0, 0]);
    return { category: 4, kickers: [straightHigh], score };
  }

  // Three of a kind
  if (groups[0]?.count === 3) {
    const tripsRank = groups[0].rank;
    const kickers = groups
      .filter((g) => g.rank !== tripsRank)
      .map((g) => g.rank)
      .sort((a, b) => b - a)
      .slice(0, 2);
    const score = packScore(3, [tripsRank, ...kickers, 0, 0]);
    return { category: 3, kickers: [tripsRank, ...kickers], score };
  }

  // Two Pair
  if (groups[0]?.count === 2 && groups[1]?.count === 2) {
    const pair1 = Math.max(groups[0].rank, groups[1].rank);
    const pair2 = Math.min(groups[0].rank, groups[1].rank);
    const kicker =
      groups.find((g) => g.rank !== pair1 && g.rank !== pair2)?.rank ?? 0;
    const score = packScore(2, [pair1, pair2, kicker, 0, 0]);
    return { category: 2, kickers: [pair1, pair2, kicker], score };
  }

  // One Pair
  if (groups[0]?.count === 2) {
    const pairRank = groups[0].rank;
    const kickers = groups
      .filter((g) => g.rank !== pairRank)
      .map((g) => g.rank)
      .sort((a, b) => b - a)
      .slice(0, 3);
    const score = packScore(1, [pairRank, ...kickers, 0]);
    return { category: 1, kickers: [pairRank, ...kickers], score };
  }

  // High Card
  const high = Array.from(rankCounts.keys())
    .sort((a, b) => b - a)
    .slice(0, 5);
  const score = packScore(0, high);
  return { category: 0, kickers: high, score };
}

// ------------------------------
// Public API (required)
// ------------------------------

/**
 * Returns a single numeric value representing the best hand
 * from the given cards. Higher is better.
 *
 * Use with 7 cards (player.cards + community cards), but it also works with 5+.
 */
export function getHandValue(cards: Card[]): number {
  // Defensive copy
  const safe = cards.slice();
  // Ensure card.value exists; if not, derive from rank
  for (const c of safe) {
    if (typeof c.value !== "number") c.value = RANK_VALUE[c.rank];
  }
  return evaluateSeven(safe).score;
}

/**
 * Finds the winner among players given the community board.
 * Returns the winner player id.
 *
 * If there is a tie, it returns the first winner (you can extend later to return all winners).
 */
export function findWinner(players: Player[], board: Card[]): string {
  if (players.length === 0) {
    throw new Error("findWinner: players list is empty.");
  }

  let bestId = players[0].id;
  let bestScore = -Infinity;

  for (const p of players) {
    const allCards = [...p.cards, ...board];
    const score = getHandValue(allCards);

    if (score > bestScore) {
      bestScore = score;
      bestId = p.id;
    }
  }

  return bestId;
}

// ------------------------------
// Optional helper: return all winners (tie support)
// ------------------------------
export function findWinners(players: Player[], board: Card[]): string[] {
  let bestScore = -Infinity;
  const winners: string[] = [];

  for (const p of players) {
    const score = getHandValue([...p.cards, ...board]);

    if (score > bestScore) {
      bestScore = score;
      winners.length = 0;
      winners.push(p.id);
    } else if (score === bestScore) {
      winners.push(p.id);
    }
  }

  return winners;
}

// ------------------------------
// Class wrapper for backward compatibility
// ------------------------------
export enum HandRank {
  HIGH_CARD = 1,
  PAIR = 2,
  TWO_PAIR = 3,
  THREE_OF_KIND = 4,
  STRAIGHT = 5,
  FLUSH = 6,
  FULL_HOUSE = 7,
  FOUR_OF_KIND = 8,
  STRAIGHT_FLUSH = 9,
  ROYAL_FLUSH = 10
}

export class Evaluator {
  static evaluateHand(cards: Card[]): { rank: HandRank; value: number } {
    const score = getHandValue(cards);
    // Convert score to rank (simplified)
    let rank = HandRank.HIGH_CARD;
    if (score > 0) {
      const category = Math.floor(score / Math.pow(15, 5));
      rank = (category + 1) as HandRank;
    }
    return { rank, value: score };
  }

  static compareHands(hand1: Card[], hand2: Card[]): number {
    const score1 = getHandValue(hand1);
    const score2 = getHandValue(hand2);
    
    if (score1 > score2) return 1;
    if (score1 < score2) return -1;
    return 0;
  }
}