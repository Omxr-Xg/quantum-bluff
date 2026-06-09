import type { TableVisuals } from '../../types/poker.js'

export type BeloteSuit = 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES'
export type BeloteRank = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'
export type BeloteTeam = 'A' | 'B'

export type BeloteCard = {
  suit: BeloteSuit
  rank: BeloteRank
}

/** Mode de jeu choisi à la création de salle. */
export type BeloteGameVariant = 'CLASSIQUE' | 'COINCHE' | 'CONTEE' | 'MODERNE'

export type BeloteTrumpChoice = BeloteSuit | 'ALL_TRUMP' | 'NO_TRUMP'
export type BeloteTrumpMode = 'SUIT' | 'ALL_TRUMP' | 'NO_TRUMP'

export type BelotePhase =
  | 'CLASSIQUE_TAKE'
  | 'CLASSIQUE_CHOOSE'
  | 'BIDDING'
  | 'CONTREE_ROUND'
  | 'PLAYING'
  | 'DEAL_END'
  | 'GAME_END'
  /** @deprecated Ancien moteur — migré vers BIDDING au chargement */
  | 'BIDDING_ROUND_1'
  | 'BIDDING_ROUND_2'

export type BelotePlayerState = {
  userId: string
  username: string
  position: number
  team: BeloteTeam
  hand: BeloteCard[]
  avatarUrl?: string | null
  isBot?: boolean
  disconnectedAt?: string
  disconnectDeadline?: string
  forfeited?: boolean
}

export type BeloteTrickCard = {
  position: number
  card: BeloteCard
}

export type BeloteDealState = {
  dealerPosition: number
  /** Couleur d’atout (mode SUIT) ou couleur de référence. */
  trump?: BeloteSuit
  trumpMode?: BeloteTrumpMode
  /** Carte retournée (belote classique). */
  turnedCard?: BeloteCard
  takerPosition?: number
  contractTeam?: BeloteTeam
  currentTrick: BeloteTrickCard[]
  /** Dernier pli complet (visible jusqu’au prochain coup). */
  lastCompletedTrick?: BeloteTrickCard[]
  trickLeaderPosition: number
  currentPlayerPosition: number
  tricksWonA: number
  tricksWonB: number
  dealPointsA: number
  dealPointsB: number
}

export type ContreeBidEntry =
  | { position: number; action: 'PASS' }
  | { position: number; action: 'BID'; value: number; trump: BeloteTrumpChoice }
  | { position: number; action: 'CONTREE' }
  | { position: number; action: 'SURCONTREE' }
  | { position: number; action: 'TAKE' }
  | { position: number; action: 'CHOOSE_TRUMP'; trump: BeloteSuit }

export type DealEndSummary = {
  made: boolean
  capot: boolean
  contract: number
  multiplier: number
  attackPoints: number
  defensePoints: number
  scoreA: number
  scoreB: number
  beloteA: number
  beloteB: number
}

export type BeloteGameState = {
  gameId: string
  roomId: string
  variant: BeloteGameVariant
  targetScore: number
  teamScoreA: number
  teamScoreB: number
  phase: BelotePhase
  /** @deprecated */
  biddingRound?: 1 | 2
  biddingTurnPosition: number
  bids: ContreeBidEntry[]
  contractPoints?: number
  contreeLevel: number
  contreePhase?: 'DEFENSE' | 'ATTACK'
  contreeDefensePasses?: number
  contreeAttackPasses?: number
  beloteBonusA?: number
  beloteBonusB?: number
  dealEndSummary?: DealEndSummary
  players: BelotePlayerState[]
  deal: BeloteDealState
  startedAt: string
  lastActionAt: string
  /** Identifiant du pli courant pour le journal d’actions. */
  dealLogId?: string
  actionVersion?: number
  lastBeloteAction?: BeloteLastAction
  turnDeadlineAt?: string
  turnTimeLimitSec: number
  buyIn: number
  potTotal: number
}

export type BeloteLastAction = {
  actionVersion: number
  phase: BelotePhase
  playerId: string
  playerName: string
  action: string
  value?: number
  trump?: string
  card?: BeloteCard
}

export type BeloteAction =
  | { type: 'PASS' }
  | { type: 'BID'; value: number; trump: BeloteTrumpChoice }
  | { type: 'CONTREE' }
  | { type: 'SURCONTREE' }
  | { type: 'CHOOSE_TRUMP'; trump: BeloteSuit }
  | { type: 'TAKE' }
  | { type: 'PLAY_CARD'; card: BeloteCard }
  | { type: 'DECLARE_BELOTE' }

export type SanitizedBeloteState = Omit<BeloteGameState, 'players'> & {
  players: Array<Omit<BelotePlayerState, 'hand'> & { handCount: number; hand?: BeloteCard[] }>
  myLegalPlays?: BeloteCard[]
  myLegalBids?: Array<{ value: number; trump: BeloteTrumpChoice }>
  tableVisuals?: TableVisuals
}
