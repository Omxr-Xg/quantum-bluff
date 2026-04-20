// server/src/logic/Deck.ts
import type { Card, Player, Rank, Suit } from "../types/poker.js";
import { drawInt } from "../rng/rng.service.js";

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
  "10": 10, "J": 11, "Q": 12, "K": 13, "A": 14,
};

// ------------------------------
// Deck Class - PHASE 3 ALPHA COMPLETE
// ------------------------------
export class Deck {
  private cards: Card[] = [];
  public burnedCards: Card[] = [];
  public dealtCount: number = 0;

  constructor() {
    this.initializeDeck();
  }

  /**
   * Initialise un deck complet de 52 cartes uniques
   */
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

  /**
   * Mélange cryptographiquement sécurisé (Fisher-Yates moderne)
   */
  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = drawInt("poker", "legacy-round", "poker.deck.shuffle", 0, i).value;
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  /**
   * Tire N cartes du haut du deck
   * @throws Error si pas assez de cartes
   */
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

  /**
   * Tire 1 carte (alias draw(1))
   */
  drawCard(): Card | undefined {
    const drawn = this.draw(1);
    return drawn[0];
  }

  /**
   * Nombre de cartes restantes
   */
  getRemainingCards(): number {
    return this.cards.length;
  }

  /**
   * Brûle 1 carte (la met de côté)
   */
  burn(): Card {
    const burned = this.draw(1)[0];
    this.burnedCards.push(burned);
    return burned;
  }

  /**
   * Distribue les cartes initiales (2 par joueur, en 2 tours comme au casino)
   * Modifie les players.cards directement
   */
  dealInitialCards(players: Player[]): Player[] {
    // Init arrays si vides
    for (const p of players) {
      if (!Array.isArray(p.cards)) p.cards = [];
    }

    // 2 tours complets (1ère carte à tous, 2ème à tous)
    for (let round = 0; round < 2; round++) {
      for (const p of players) {
        const card = this.draw(1)[0];
        p.cards!.push(card);
      }
    }

    return players;
  }

  /**
   * Deal FLOP : burn 1 + 3 community cards
   */
  dealFlop(): Card[] {
    this.burn();
    return this.draw(3);
  }

  /**
   * Deal TURN : burn 1 + 1 community card
   */
  dealTurn(): Card {
    this.burn();
    return this.draw(1)[0];
  }

  /**
   * Deal RIVER : burn 1 + 1 community card
   */
  dealRiver(): Card {
    this.burn();
    return this.draw(1)[0];
  }

  /**
   * Reset pour nouvelle main (optionnel)
   */
  reset(): void {
    this.initializeDeck();
    this.burnedCards = [];
    this.dealtCount = 0;
  }

  /**
   * Debug : état du deck
   */
  debug(): {
    total: number;
    remaining: number;
    burned: number;
    dealt: number;
  } {
    return {
      total: 52,
      remaining: this.getRemainingCards(),
      burned: this.burnedCards.length,
      dealt: this.dealtCount,
    };
  }
}

