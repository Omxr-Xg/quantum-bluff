import { Card, Suit, Rank } from '../types/poker.js';

export class Deck {
  private cards: Card[] = [];

  constructor() {
    this.initializeDeck();
  }

  private initializeDeck(): void {
    const suits: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
    const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

    for (const suit of suits) {
      for (const rank of ranks) {
        let value: number;
        if (rank === 'J') value = 11;
        else if (rank === 'Q') value = 12;
        else if (rank === 'K') value = 13;
        else if (rank === 'A') value = 14;
        else value = parseInt(rank);

        this.cards.push({ suit, rank, value });
      }
    }
  }

  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  drawCard(): Card | undefined {
    return this.cards.pop();
  }

  drawCards(count: number): Card[] {
    const drawn: Card[] = [];
    for (let i = 0; i < count; i++) {
      const card = this.drawCard();
      if (card) drawn.push(card);
    }
    return drawn;
  }

  getRemainingCards(): number {
    return this.cards.length;
  }
}
