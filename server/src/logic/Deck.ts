// server/src/logic/Deck.ts
import { randomInt } from "crypto";
import type { Card, Player, Rank, Suit } from "../types/poker.js";

// ------------------------------
// Constants
// ------------------------------
const SUITS: Suit[] = ["HEARTS", "DIAMONDS", "CLUBS", "SPADES"];

const RANKS: Rank[] = [
  "2", "3", "4", "5", "6", "7", "8", "9", "10",
  "J", "Q", "K", "A",
];

const RANK_VALUE: Record<Rank, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  "10": 10, J: 11, Q: 12, K: 13, A: 14,
};

// ------------------------------
// Deck Class
// ------------------------------
export class Deck {
  private cards: Card[] = [];
  public burnedCards: Card[] = [];
  public dealtCount: number = 0;

  constructor() {
    this.initializeDeck();
  }

  private initializeDeck(): void {
    this.cards = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.cards.push({
          suit,
          rank,
          value: RANK_VALUE[rank],
        });
      }
    }
  }

  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = randomInt(0, i + 1);
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  draw(count: number): Card[] {
    if (count < 0) throw new Error("draw(count) cannot use a negative count.");
    if (count === 0) return [];
    if (this.cards.length < count) {
      throw new Error(`Not enough cards. Requested=${count}, Remaining=${this.cards.length}`);
    }

    const drawn = this.cards.splice(0, count);
    this.dealtCount += drawn.length;
    return drawn;
  }

  drawCard(): Card | undefined {
    const drawn = this.draw(1);
    return drawn[0];
  }

  getRemainingCards(): number {
    return this.cards.length;
  }

  burn(): Card {
    const [burned] = this.draw(1);
    this.burnedCards.push(burned);
    return burned;
  }

  dealInitialCards(players: Player[]): Player[] {
    for (const p of players) {
      if (!Array.isArray(p.cards)) p.cards = [];
    }

    for (let round = 0; round < 2; round++) {
      for (const p of players) {
        const [card] = this.draw(1);
        p.cards.push(card);
      }
    }
    return players;
  }

  dealFlop(): Card[] {
    this.burn();
    return this.draw(3);
  }

  dealTurn(): Card {
    this.burn();
    const [turn] = this.draw(1);
    return turn;
  }

  dealRiver(): Card {
    this.burn();
    const [river] = this.draw(1);
    return river;
  }
}