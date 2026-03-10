// server/src/Deck.ts
// QUANTUM BLUFF - PHASE 3 ALPHA - DECK LOGIC (Soheil)
// Branch: feature/back-game-logic

import { randomInt } from "crypto";
import type { Card, Deck, Player, Rank, Suit } from "./types/poker.js";

// ------------------------------
// Constants
// ------------------------------
const SUITS: Suit[] = ["HEARTS", "DIAMONDS", "CLUBS", "SPADES"];

const RANKS: Rank[] = [
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

// ------------------------------
// 1) generateDeck()
// ------------------------------
/**
 * Creates a standard 52-card deck.
 * Each card includes a numeric `value` (2..14) for easy comparisons.
 */
export function generateDeck(): Deck {
  const cards: Card[] = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({
        suit,
        rank,
        value: RANK_VALUE[rank],
      });
    }
  }

  return {
    cards,
    burnedCards: [],
    dealtCount: 0,
  };
}

// ------------------------------
// 2) shuffle(deck) - Fisher-Yates (CSPRNG)
// ------------------------------
/**
 * In-place Fisher-Yates shuffle using Node.js crypto CSPRNG (randomInt).
 * Returns the same deck reference for convenience.
 */
export function shuffle(deck: Deck): Deck {
  for (let i = deck.cards.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1); // ✅ cryptographically secure
    [deck.cards[i], deck.cards[j]] = [deck.cards[j], deck.cards[i]];
  }
  return deck;
}

// ------------------------------
// 3) draw(deck, count) - splice
// ------------------------------
/**
 * Draws `count` cards from the top of the deck (index 0),
 * using splice as requested.
 *
 * @throws Error if count < 0 or if not enough cards remain.
 */
export function draw(deck: Deck, count: number): Card[] {
  if (count < 0) {
    throw new Error("draw(count) cannot use a negative count.");
  }
  if (count === 0) return [];
  if (deck.cards.length < count) {
    throw new Error(
      `Not enough cards in deck. Requested=${count}, Remaining=${deck.cards.length}`,
    );
  }

  const drawn = deck.cards.splice(0, count);

  if (typeof deck.dealtCount === "number") {
    deck.dealtCount += drawn.length;
  } else {
    deck.dealtCount = drawn.length;
  }

  return drawn;
}

// ------------------------------
// Optional helpers (useful for integration with Azra)
// ------------------------------

/**
 * Burns 1 card (Texas Hold'em convention).
 */
export function burn(deck: Deck): Card {
  const [burned] = draw(deck, 1);
  if (!deck.burnedCards) deck.burnedCards = [];
  deck.burnedCards.push(burned);
  return burned;
}

/**
 * dealInitialCards(): helper requested for cross-test integration.
 * Deals 2 hole cards to each player (round-robin) and returns updated players.
 */
export function dealInitialCards(deck: Deck, players: Player[]): Player[] {
  for (const p of players) {
    if (!Array.isArray(p.cards)) p.cards = [];
  }

  for (let round = 0; round < 2; round++) {
    for (const p of players) {
      const [card] = draw(deck, 1);
      p.cards.push(card);
    }
  }

  return players;
}

/**
 * Deals the flop (burn 1, draw 3).
 */
export function dealFlop(deck: Deck): Card[] {
  burn(deck);
  return draw(deck, 3);
}

/**
 * Deals the turn (burn 1, draw 1).
 */
export function dealTurn(deck: Deck): Card {
  burn(deck);
  const [turn] = draw(deck, 1);
  return turn;
}

/**
 * Deals the river (burn 1, draw 1).
 */
export function dealRiver(deck: Deck): Card {
  burn(deck);
  const [river] = draw(deck, 1);
  return river;
}
