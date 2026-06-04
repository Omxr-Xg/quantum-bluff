export type BeloteSuit = 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES'
export type BeloteRank = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'
export type BeloteTeam = 'A' | 'B'

export type BeloteCard = {
  suit: BeloteSuit
  rank: BeloteRank
}

export type BelotePhase =
  | 'BIDDING_ROUND_1'
  | 'BIDDING_ROUND_2'
  | 'PLAYING'
  | 'DEAL_END'
  | 'GAME_END'

export type BelotePlayerState = {
  userId: string
  username: string
  position: number
  team: BeloteTeam
  hand: BeloteCard[]
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

export type BeloteGameState = {
  gameId: string
  roomId: string
  targetScore: number
  teamScoreA: number
  teamScoreB: number
  phase: BelotePhase
  biddingRound: 1 | 2
  biddingTurnPosition: number
  bids: Array<{ position: number; action: 'PASS' | 'TAKE' | 'CHOOSE_TRUMP'; trump?: BeloteSuit }>
  players: BelotePlayerState[]
  deal: BeloteDealState
  startedAt: string
  lastActionAt: string
}

export type BeloteAction =
  | { type: 'PASS' }
  | { type: 'TAKE' }
  | { type: 'CHOOSE_TRUMP'; trump: BeloteSuit }
  | { type: 'PLAY_CARD'; card: BeloteCard }

export type SanitizedBeloteState = Omit<BeloteGameState, 'players'> & {
  players: Array<Omit<BelotePlayerState, 'hand'> & { handCount: number; hand?: BeloteCard[] }>
}
