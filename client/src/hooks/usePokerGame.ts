import { useState, useCallback } from "react";
import { GamePhase, Player, Card } from "../types";

/**
 * Hook pour gérer l'état du jeu de poker
 */
export function usePokerGame() {
  const [phase, setPhase] = useState<GamePhase>("init");
  const [pot, setPot] = useState(0);
  const [communityCards, setCommunityCards] = useState<(Card | null)[]>([null, null, null, null, null]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [roundPlayersActed, setRoundPlayersActed] = useState<Set<number>>(new Set());

  /**
   * Ajouter au pot
   */
  const addToPot = useCallback((amount: number) => {
    setPot((prev) => prev + amount);
  }, []);

  /**
   * Mettre à jour les cartes communes
   */
  const updateCommunityCards = useCallback((cards: (Card | null)[]) => {
    setCommunityCards(cards);
  }, []);

  /**
   * Passer à la phase suivante
   */
  const nextPhase = useCallback(() => {
    setPhase((current) => {
      switch (current) {
        case "init":
          return "shuffle";
        case "shuffle":
          return "deal";
        case "deal":
          return "preflop";
        case "preflop":
          return "flop";
        case "flop":
          return "turn";
        case "turn":
          return "river";
        case "river":
          return "showdown";
        default:
          return current;
      }
    });
    
    // Réinitialiser les joueurs ayant joué pour le nouveau tour
    setRoundPlayersActed(new Set());
  }, []);

  /**
   * Marquer qu'un joueur a joué
   */
  const markPlayerActed = useCallback((playerIndex: number) => {
    setRoundPlayersActed((prev) => new Set(prev).add(playerIndex));
  }, []);

  /**
   * Passer au joueur suivant
   */
  const nextPlayer = useCallback(() => {
    setCurrentPlayerIndex((current) => {
      const nextIndex = (current + 1) % players.length;
      markPlayerActed(current);
      return nextIndex;
    });
  }, [players.length, markPlayerActed]);

  /**
   * Vérifier si tous les joueurs ont joué
   */
  const allPlayersActed = useCallback(() => {
    const activePlayers = players.filter((p) => p.isConnected && !p.hasFolded);
    return roundPlayersActed.size >= activePlayers.length;
  }, [players, roundPlayersActed]);

  /**
   * Réinitialiser pour une nouvelle main
   */
  const resetHand = useCallback(() => {
    setPhase("init");
    setPot(0);
    setCommunityCards([null, null, null, null, null]);
    setRoundPlayersActed(new Set());
    setCurrentPlayerIndex(0);
  }, []);

  return {
    // État
    phase,
    pot,
    communityCards,
    players,
    currentPlayerIndex,
    roundPlayersActed,
    
    // Actions
    setPhase,
    addToPot,
    updateCommunityCards,
    setPlayers,
    nextPhase,
    nextPlayer,
    markPlayerActed,
    allPlayersActed,
    resetHand,
  };
}
