import type { Card, Player } from "./types/poker.js";
import { Deck } from "./logic/Deck.js";
import { findWinner, getHandValue } from "./logic/Evaluator.js";
import { makeCard, assert, assertEq } from "./test-utils.js";

function createPlayer(id: string, name: string, cards: Card[]): Player {
  return {
    id,
    name,
    cards,
    chips: 1000,
    role: "PLAYER",
    isActive: true,
    isConnected: true,
    currentBet: 0,
  };
}

function testDeckGenerate52Unique(): void {
  const deck = new Deck();
  const cards = deck.draw(52);

  assertEq(cards.length, 52, "Deck should provide 52 cards");

  const key = (c: Card) => `${c.rank}-${c.suit}`;
  const set = new Set(cards.map(key));

  assertEq(set.size, 52, "Deck should contain 52 unique cards");
  assertEq(deck.getRemainingCards(), 0, "Deck should be empty after drawing 52 cards");
}

function testDeckDrawRemovesCards(): void {
  const deck = new Deck();

  const hand = deck.draw(2);
  assertEq(hand.length, 2, "draw(2) should return 2 cards");
  assertEq(deck.getRemainingCards(), 50, "After draw(2), deck should have 50 cards");

  const flop = deck.draw(3);
  assertEq(flop.length, 3, "draw(3) should return 3 cards");
  assertEq(deck.getRemainingCards(), 47, "After drawing 2 then 3, deck should have 47 cards");
}

function testShufflePreservesCount(): void {
  const deck = new Deck();
  deck.shuffle();
  assertEq(deck.getRemainingCards(), 52, "shuffle() should not change the number of cards");
}

function testDealInitialCards(): void {
  const deck = new Deck();
  deck.shuffle();

  const players: Player[] = [
    createPlayer("P1", "Player1", []),
    createPlayer("P2", "Player2", []),
    createPlayer("P3", "Player3", []),
  ];

  deck.dealInitialCards(players);

  assertEq(players[0].cards.length, 2, "Player 1 should receive 2 cards");
  assertEq(players[1].cards.length, 2, "Player 2 should receive 2 cards");
  assertEq(players[2].cards.length, 2, "Player 3 should receive 2 cards");
  assertEq(deck.getRemainingCards(), 46, "Deck should have 46 cards left after dealing 3 players");
}

function testEvaluatorStraightFlushWinner(): void {
  const p1 = createPlayer("P1", "Player1", [
    makeCard("HEARTS", "9"),
    makeCard("HEARTS", "10"),
  ]);

  const p2 = createPlayer("P2", "Player2", [
    makeCard("SPADES", "A"),
    makeCard("DIAMONDS", "A"),
  ]);

  const board: Card[] = [
    makeCard("HEARTS", "J"),
    makeCard("HEARTS", "Q"),
    makeCard("HEARTS", "K"),
    makeCard("CLUBS", "2"),
    makeCard("DIAMONDS", "3"),
  ];

  const winnerId = findWinner([p1, p2], board);
  assertEq(winnerId, "P1", "findWinner should detect Straight Flush winner correctly");

  const score1 = getHandValue([...p1.cards, ...board]);
  const score2 = getHandValue([...p2.cards, ...board]);

  assert(score1 > score2, "Straight Flush score should be higher than pair score");
}

function testEvaluatorPairBeatsHighCard(): void {
  const p1 = createPlayer("P1", "PairGuy", [
    makeCard("SPADES", "K"),
    makeCard("HEARTS", "K"),
  ]);

  const p2 = createPlayer("P2", "HighCardGuy", [
    makeCard("SPADES", "A"),
    makeCard("DIAMONDS", "9"),
  ]);

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

function runAll(): void {
  const tests: Array<{ name: string; fn: () => void }> = [
    { name: "Deck: generate 52 unique cards", fn: testDeckGenerate52Unique },
    { name: "Deck: draw removes cards", fn: testDeckDrawRemovesCards },
    { name: "Deck: shuffle preserves count", fn: testShufflePreservesCount },
    { name: "Deck: deal initial cards", fn: testDealInitialCards },
    { name: "Evaluator: Straight Flush winner", fn: testEvaluatorStraightFlushWinner },
    { name: "Evaluator: Pair beats high card", fn: testEvaluatorPairBeatsHighCard },
  ];

  console.log("🧪 Running manual tests...\n");

  for (const t of tests) {
    try {
      t.fn();
      console.log(`✅ ${t.name}`);
    } catch (err) {
      console.error(`\n${String(err)}`);
      process.exit(1);
    }
  }

  console.log("\n🎉 All manual tests passed!");
}

runAll();