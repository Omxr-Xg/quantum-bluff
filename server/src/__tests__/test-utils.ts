// server/test/test-utils.ts
import type { Card, Rank, Suit } from "../types/poker.js";

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

export function makeCard(suit: Suit, rank: Rank): Card {
  return { suit, rank, value: RANK_VALUE[rank] };
}

export function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`❌ TEST FAILED: ${message}`);
}

export function assertEq<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `❌ TEST FAILED: ${message}\n   expected=${expected}\n   actual=${actual}`,
    );
  }
}

export function assertArrayEq<T>(
  actual: T[],
  expected: T[],
  message: string,
): void {
  const same =
    actual.length === expected.length &&
    actual.every((v, i) => v === expected[i]);
  if (!same) {
    throw new Error(
      `❌ TEST FAILED: ${message}\n   expected=${JSON.stringify(expected)}\n   actual=${JSON.stringify(actual)}`,
    );
  }
}
