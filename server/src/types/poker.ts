export type Suit = 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES'

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
  | 'A'

export interface Card {
  suit: Suit
  rank: Rank
  value: number
}

export interface Deck {
  cards: Card[]
  burnedCards?: Card[]
  dealtCount?: number
}

export type PlayerRole = 'DEALER' | 'SMALL_BLIND' | 'BIG_BLIND' | 'PLAYER'

export interface Player {
  id: string;
  name: string;
  cards: Card[];
  chips: number;
  role: PlayerRole;
  currentBet?: number;
  bet?: number;
  /** Total amount put into the pot this hand (for side pot calculation). */
  totalPutInThisHand?: number;
  isActive: boolean;
  position?: number;
  isDealer?: boolean;
  isConnected?: boolean;
}

export type GamePhase = 'WAITING' | 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN' | 'ENDED_OPPONENT_LEFT'

export interface GameState {
  id?: string
  pot: number
  communityCards: Card[]
  players: Player[]
  currentTurn: string
  phase: GamePhase
  /** Gagnant au showdown (pour affichage côté client) */
  showdownWinnerId?: string
  /** Gagnants en cas d'égalité (split pot) */
  showdownWinnerIds?: string[]
  /** Vrai si le pot a été partagé entre plusieurs gagnants */
  showdownIsSplit?: boolean
  showdownHandName?: string
  /** Pot attribué au showdown (pour affichage) */
  showdownPot?: number
}