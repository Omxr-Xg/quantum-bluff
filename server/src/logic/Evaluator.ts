import { Card } from '../types/poker.js';

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
    // Implémentation simplifiée pour l'instant
    return { rank: HandRank.HIGH_CARD, value: 0 };
  }

  static compareHands(hand1: Card[], hand2: Card[]): number {
    const eval1 = this.evaluateHand(hand1);
    const eval2 = this.evaluateHand(hand2);
    
    if (eval1.rank > eval2.rank) return 1;
    if (eval1.rank < eval2.rank) return -1;
    return 0;
  }
}
