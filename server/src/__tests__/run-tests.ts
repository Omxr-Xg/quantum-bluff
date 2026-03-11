// server/test/run-tests.ts
import type { Card, Player } from "../types/poker.js";

import { generateDeck, shuffle, draw } from "../Deck.js";
import { findWinner, getHandValue } from "../Evaluator.js";
import { makeCard, assert, assertEq } from "./test-utils.js";

function testDeckGenerate52Unique(): void {
  const deck = generateDeck();
  assertEq(deck.cards.length, 52, "generateDeck() should create 52 cards");

  const key = (c: Card) => `${c.rank}-${c.suit}`;
  const set = new Set(deck.cards.map(key));
  assertEq(set.size, 52, "Deck should contain 52 unique (rank,suit) cards");
}

function testDeckDrawRemovesCards(): void {
  const deck = generateDeck();
  const hand = draw(deck, 2);
  assertEq(hand.length, 2, "draw(deck,2) should return 2 cards");
  assertEq(
    deck.cards.length,
    50,
    "After draw(deck,2), deck should have 50 cards",
  );

  const flop = draw(deck, 3);
  assertEq(flop.length, 3, "draw(deck,3) should return 3 cards");
  assertEq(
    deck.cards.length,
    47,
    "After drawing 2 then 3, deck should have 47 cards",
  );
}

function testShufflePreservesCount(): void {
  const deck = generateDeck();
  shuffle(deck);
  assertEq(
    deck.cards.length,
    52,
    "shuffle() should not change number of cards",
  );
}

/**
 * Straight Flush test (Quinte Flush):
 * Player1: 9♥, 10♥
 * Board: J♥, Q♥, K♥, 2♣, 3♦
 * => Straight Flush K-high in hearts (9-10-J-Q-K)
 */
function testEvaluatorStraightFlushWinner(): void {
  const p1: Player = {
    id: "P1",
    name: "Player1",
    cards: [makeCard("HEARTS", "9"), makeCard("HEARTS", "10")],
    chips: 1000,
    role: "PLAYER",
  };

  const p2: Player = {
    id: "P2",
    name: "Player2",
    cards: [makeCard("SPADES", "A"), makeCard("DIAMONDS", "A")], // strong pair but loses to straight flush
    chips: 1000,
    role: "PLAYER",
  };

  const board: Card[] = [
    makeCard("HEARTS", "J"),
    makeCard("HEARTS", "Q"),
    makeCard("HEARTS", "K"),
    makeCard("CLUBS", "2"),
    makeCard("DIAMONDS", "3"),
  ];

  const winnerId = findWinner([p1, p2], board);
  assertEq(
    winnerId,
    "P1",
    "findWinner should detect Straight Flush winner correctly",
  );

  // Optional: also confirm score ordering explicitly
  const score1 = getHandValue([...p1.cards, ...board]);
  const score2 = getHandValue([...p2.cards, ...board]);
  assert(
    score1 > score2,
    "Straight Flush score should be higher than pair score",
  );
}

/**
 * Simple test: Pair vs High Card
 */
function testEvaluatorPairBeatsHighCard(): void {
  const p1: Player = {
    id: "P1",
    name: "PairGuy",
    cards: [makeCard("SPADES", "K"), makeCard("HEARTS", "K")],
    chips: 1000,
    role: "PLAYER",
  };

  const p2: Player = {
    id: "P2",
    name: "HighCardGuy",
    cards: [makeCard("SPADES", "A"), makeCard("DIAMONDS", "9")],
    chips: 1000,
    role: "PLAYER",
  };

  const board: Card[] = [
    makeCard("CLUBS", "2"),
    makeCard("DIAMONDS", "5"),
    makeCard("HEARTS", "7"),
    makeCard("CLUBS", "J"),
    makeCard("SPADES", "3"),
  ];

  const winnerId = findWinner([p1, p2], board);
  assertEq(winnerId, "P1", "Pair of Kings should beat Ace-high here");
}

// ------------------------------
// RUN ALL TESTS
// ------------------------------
function runAll(): void {
  const tests: Array<{ name: string; fn: () => void }> = [
    { name: "Deck: generate 52 unique cards", fn: testDeckGenerate52Unique },
    { name: "Deck: draw removes cards", fn: testDeckDrawRemovesCards },
    { name: "Deck: shuffle preserves count", fn: testShufflePreservesCount },
    {
      name: "Evaluator: Straight Flush winner",
      fn: testEvaluatorStraightFlushWinner,
    },
    {
      name: "Evaluator: Pair beats high card",
      fn: testEvaluatorPairBeatsHighCard,
    },
  ];

  console.log("🧪 Running tests...\n");

  for (const t of tests) {
    try {
      t.fn();
      console.log(`✅ ${t.name}`);
    } catch (err) {
      console.error(`\n${String(err)}`);
      process.exit(1);
    }
  }

  console.log("\n🎉 All tests passed!");
}

runAll();
