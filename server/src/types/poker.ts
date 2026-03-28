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
  /** Nombre de cartes brûlées (affichage face cachée à côté de la table) */
  burnedCardsCount?: number
  /** Durée max d’un tour en secondes (cash game multi) */
  turnTimeLimitSec?: number
  /** Identifiant logique de la main courante (canonical runtime state). */
  handId?: string
  /** Version incrémentale de mutation de la main. */
  actionVersion?: number
  /** Marqueur de version de rue/street (préflop/flop/turn/river). */
  streetVersion?: number
  /** Horodatage ISO de la dernière mutation serveur. */
  updatedAt?: string
  /** Dernière action joueur (journal multijoueur, alignée sur actionVersion). */
  lastHandAction?: {
    playerId: string
    playerName: string
    action: 'FOLD' | 'CHECK' | 'CALL' | 'RAISE'
    amount?: number
    street: GamePhase
    actionVersion: number
    /** Rôle à l’instant de l’action (ordre preflop vs postflop). */
    actorRole?: PlayerRole
  }
  /** Participants figés pour la main courante (snapshot au start). */
  handParticipantIds?: string[]
  /** Raison explicite de fin de main calculée par le backend. */
  handEndReason?: 'WIN_BY_FOLD' | 'SHOWDOWN' | 'ALL_IN_RUNOUT' | 'FORCED_END'
  /** Secondes restantes avant la prochaine main (cash), alignées serveur — évite décalage d’horloge client. */
  cashCountdownRemainingSec?: number
  /** Paris cachés (cash) : identifiant de la prochaine main pour quote/place. */
  hiddenBetNextHandId?: string
  hiddenBetCurrentHandId?: string
  hiddenBetWindowOpen?: boolean
  hiddenBetWindowClosesAt?: number
  /** Phase runtime détaillée (pilotage backend/front). */
  handRuntimePhase?:
    | 'HAND_IN_PROGRESS'
    | 'BETTING_ACTIVE'
    | 'BETTING_ROUND_CLOSED'
    | 'SHOWDOWN_PENDING'
    | 'SHOWDOWN_REVEAL'
    | 'SHOWDOWN_RESULT'
    | 'POT_DISTRIBUTION'
    | 'HAND_COMPLETE'
    | 'NEXT_HAND_COUNTDOWN'
}