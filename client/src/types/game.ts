// Types pour les cartes
export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

export interface Card {
  suit: Suit;
  value: string;
}

// Types pour les joueurs
export interface Player {
  id: number;
  name: string;
  chips: number;
  bet: number;
  position: number;
  isActive: boolean;
  isDealer: boolean;
  cards: Card[];
  isConnected: boolean;
  difficulty?: string;
  hasFolded?: boolean;
}

// Types pour les phases de jeu
export type GamePhase = "init" | "shuffle" | "deal" | "preflop" | "flop" | "turn" | "river" | "showdown";

// Types pour les actions de poker
export type PokerAction = "fold" | "check" | "call" | "raise" | "all-in";

export interface PlayerAction {
  playerId: number;
  action: PokerAction;
  amount?: number;
  timestamp: number;
}

// État du jeu
export interface GameState {
  phase: GamePhase;
  pot: number;
  communityCards: (Card | null)[];
  players: Player[];
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  roundPlayersActed: Set<number>;
}

// Messages du serveur (pour future intégration WebSocket)
export interface ServerMessage {
  type: "game_state" | "player_action" | "phase_change" | "winner" | "error";
  payload: any;
  timestamp: number;
}

// Messages du client (pour future intégration WebSocket)
export interface ClientMessage {
  type: "join_game" | "player_action" | "leave_game";
  payload: any;
}
