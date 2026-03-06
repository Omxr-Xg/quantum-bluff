// server/src/types/poker.ts

// ==============================
// Card / Deck types
// ==============================
export type Suit = 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES';

export type Rank =
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number; // numeric value for comparisons (2..14)
}

/**
 * Shared deck structure for Deck.ts logic.
 * Keep minimal for now; can be extended later with burnedCards/dealtCount if needed.
 */
export interface Deck {
  cards: Card[];
  burnedCards?: Card[];
  dealtCount?: number;
}

// ==============================
// Player / Game roles
// ==============================
export type PlayerRole = 'DEALER' | 'SMALL_BLIND' | 'BIG_BLIND' | 'PLAYER';

export interface Player {
  id: string;
  name: string;
  cards: Card[]; // hole cards (2 cards in Texas Hold'em)
  chips: number;
  role: PlayerRole;

  /**
   * Optional for early betting logic / socket updates.
   * Useful when handling PLAYER_ACTION (bet/call/raise).
   */
  currentBet?: number;
}

// ==============================
// Game state
// ==============================
export type GamePhase = 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';

export interface GameState {
  pot: number;
  communityCards: Card[];
  players: Player[];

  /**
   * Current player turn identifier (player.id).
   * Keep as string for simple socket/backend integration.
   */
  currentTurn: string;

  phase: GamePhase;
}
