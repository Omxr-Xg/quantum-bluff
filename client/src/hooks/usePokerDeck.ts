import { useState, useCallback } from "react";
import { Card, Suit } from "../types";

/**
 * Hook pour gérer le deck de cartes et la distribution
 */
export function usePokerDeck() {
  const [deck, setDeck] = useState<Card[]>([]);

  /**
   * Générer un jeu de 52 cartes mélangé
   */
  const generateDeck = useCallback((): Card[] => {
    const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
    const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    const newDeck: Card[] = [];
    
    for (const suit of suits) {
      for (const value of values) {
        newDeck.push({ suit, value });
      }
    }
    
    // Mélanger le deck (Fisher-Yates shuffle)
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    
    setDeck(newDeck);
    return newDeck;
  }, []);

  /**
   * Tirer une carte du deck
   */
  const drawCard = useCallback((): Card | null => {
    if (deck.length === 0) return null;
    
    const [card, ...remainingDeck] = deck;
    setDeck(remainingDeck);
    return card;
  }, [deck]);

  /**
   * Tirer plusieurs cartes
   */
  const drawCards = useCallback((count: number): Card[] => {
    const cards: Card[] = [];
    for (let i = 0; i < count && deck.length > 0; i++) {
      const card = drawCard();
      if (card) cards.push(card);
    }
    return cards;
  }, [deck, drawCard]);

  /**
   * Brûler une carte (retirer du dessus sans la montrer)
   */
  const burnCard = useCallback((): void => {
    if (deck.length > 0) {
      const [, ...remainingDeck] = deck;
      setDeck(remainingDeck);
    }
  }, [deck]);

  return {
    deck,
    generateDeck,
    drawCard,
    drawCards,
    burnCard,
    cardsRemaining: deck.length,
  };
}
