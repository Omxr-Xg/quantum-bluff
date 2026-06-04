export type BeloteSuit = 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES'
export type BeloteRank = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'
export type BeloteTeam = 'A' | 'B'

export type BeloteCard = {
  suit: BeloteSuit
  rank: BeloteRank
}

export type BeloteVariant = 'CONTEE'

export type BelotePhase =
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
  trump?: BeloteSuit
  takerPosition?: number
  contractTeam?: BeloteTeam
  currentTrick: BeloteTrickCard[]
  trickLeaderPosition: number
  currentPlayerPosition: number
  tricksWonA: number
  tricksWonB: number
  dealPointsA: number
  dealPointsB: number
}

export type ContreeBidEntry =
  | { position: number; action: 'PASS' }
  | { position: number; action: 'BID'; value: number; trump: BeloteSuit }
  | { position: number; action: 'CONTREE' }
  | { position: number; action: 'SURCONTREE' }

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
  variant: BeloteVariant
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
  turnDeadlineAt?: string
  turnTimeLimitSec: number
  /** Mise d'entrée par joueur (jetons). */
  buyIn: number
  /** Cagnotte totale (buyIn × 4). */
  potTotal: number
}

export type BeloteAction =
  | { type: 'PASS' }
  | { type: 'BID'; value: number; trump: BeloteSuit }
  | { type: 'CONTREE' }
  | { type: 'SURCONTREE' }
  | { type: 'CHOOSE_TRUMP'; trump: BeloteSuit }
  | { type: 'TAKE' }
  | { type: 'PLAY_CARD'; card: BeloteCard }
  | { type: 'DECLARE_BELOTE' }

export type SanitizedBeloteState = Omit<BeloteGameState, 'players'> & {
  players: Array<Omit<BelotePlayerState, 'hand'> & { handCount: number; hand?: BeloteCard[] }>
  myLegalPlays?: BeloteCard[]
  myLegalBids?: Array<{ value: number; trump: BeloteSuit }>
}
