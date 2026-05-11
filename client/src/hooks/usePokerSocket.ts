import { useState, useEffect, useCallback } from "react";
import { GameState, ClientMessage, PokerAction } from "../types";

/**
 * Hook personnalisé pour gérer la connexion WebSocket avec le serveur de poker
 * 
 * Pour l'instant, ce hook simule la connexion. Pour l'intégrer avec un vrai backend :
 * 
 * 1. Remplacer la simulation par une vraie connexion WebSocket :
 *    const ws = new WebSocket('ws://localhost:3001/poker');
 * 
 * 2. Écouter les messages du serveur :
 *    ws.onmessage = (event) => {
 *      const message: ServerMessage = JSON.parse(event.data);
 *      handleServerMessage(message);
 *    };
 * 
 * 3. Envoyer des actions au serveur :
 *    ws.send(JSON.stringify({ type: 'player_action', payload: { action, amount } }));
 */

interface UsePokerSocketOptions {
  gameId?: string;
  playerId?: string;
  onGameStateUpdate?: (gameState: Partial<GameState>) => void;
  onError?: (error: string) => void;
}

interface PokerSocketReturn {
  isConnected: boolean;
  sendAction: (action: PokerAction, amount?: number) => void;
  joinGame: (gameId: string) => void;
  leaveGame: () => void;
  error: string | null;
}

export function usePokerSocket({
  gameId,
  playerId,
  onGameStateUpdate: _onGameStateUpdate,
  onError: _onError,
}: UsePokerSocketOptions = {}): PokerSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [error, _setError] = useState<string | null>(null);

  // Simulation de connexion (à remplacer par une vraie connexion WebSocket)
  useEffect(() => {
    if (gameId && playerId) {
      // TODO: Créer une vraie connexion WebSocket
      // const ws = new WebSocket(`ws://localhost:3001/poker?gameId=${gameId}&playerId=${playerId}`);
      
      // ws.onopen = () => {
      //   setIsConnected(true);
      //   console.log('[poker] connected');
      // };

      // ws.onmessage = (event) => {
      //   const message: ServerMessage = JSON.parse(event.data);
      //   handleServerMessage(message);
      // };

      // ws.onerror = (error) => {
      //   setError('Erreur de connexion au serveur');
      //   onError?.('Erreur de connexion au serveur');
      // };

      // ws.onclose = () => {
      //   setIsConnected(false);
      //   console.log('[poker] disconnected');
      // };

      // Simulation pour le développement
      setTimeout(() => {
        setIsConnected(true);
        console.log('[usePokerSocket] simulation mode on');
      }, 500);

      // Cleanup
      return () => {
        // ws?.close();
        setIsConnected(false);
      };
    }
  }, [gameId, playerId]);

  /**
   * Envoyer une action au serveur
   */
  const sendAction = useCallback((action: PokerAction, amount?: number) => {
    if (!isConnected) {
      console.warn('[usePokerSocket] not connected');
      return;
    }

    const message: ClientMessage = {
      type: "player_action",
      payload: {
        playerId,
        action,
        amount,
        timestamp: Date.now(),
      },
    };

    // TODO: Envoyer au serveur via WebSocket
    // ws.send(JSON.stringify(message));

    console.log('[usePokerSocket] send action (sim):', message);
  }, [isConnected, playerId]);

  /**
   * Rejoindre une partie
   */
  const joinGame = useCallback((newGameId: string) => {
    const message: ClientMessage = {
      type: "join_game",
      payload: {
        gameId: newGameId,
        playerId,
      },
    };

    // TODO: Envoyer au serveur
    console.log('[usePokerSocket] join game (sim):', message);
  }, [playerId]);

  /**
   * Quitter la partie
   */
  const leaveGame = useCallback(() => {
    const message: ClientMessage = {
      type: "leave_game",
      payload: {
        playerId,
      },
    };

    // TODO: Envoyer au serveur
    console.log('[usePokerSocket] leave game (sim):', message);
    setIsConnected(false);
  }, [playerId]);

  return {
    isConnected,
    sendAction,
    joinGame,
    leaveGame,
    error,
  };
}
