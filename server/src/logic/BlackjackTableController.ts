import {
  createShoe,
  shuffleShoe,
  drawCard,
  handValue,
  isNaturalBlackjack,
  playDealerHand,
  settleRound,
  validateBlackjackBet,
  cardToPublic,
  BLACKJACK_MAX_BET_CAP,
  type Card,
} from './blackjack.js'

export type BJTablePhase = 'betting' | 'player_turn' | 'dealer' | 'payout' | 'between_hands'

/** Pendant une main : pas encore misé / misé en attente de cartes / en jeu. */
export type BJSeatPlayState =
  | 'no_bet'
  | 'bet_placed'
  | 'in_hand'
  | 'standing'
  | 'bust'
  | 'blackjack_natural'

export interface BJSeatRuntime {
  userId: string
  username: string
  position: number
  hand: Card[]
  bet: number
  totalBet: number
  doubled: boolean
  playState: BJSeatPlayState
}

export interface BJTableMemberInput {
  userId: string
  username: string
  position: number
}

export type BJPublicCard = { rank: string; suit: string }

export interface BJSeatPublic {
  userId: string
  username: string
  position: number
  cards: BJPublicCard[]
  bet: number
  totalBet: number
  doubled: boolean
  playState: BJSeatPlayState
  isCurrentTurn: boolean
  /** Valeur affichée (best ≤ 21) pour UI */
  handTotal?: number
}

export type BjPayoutSummaryRow = {
  userId: string
  username: string
  payout: number
  reason: string
}

export interface BlackjackTablePublicState {
  gameId: string
  roomId: string
  phase: BJTablePhase
  handNumber: number
  minBet: number
  dealerCards: BJPublicCard[]
  /** Trou croupier : true tant que la carte fermée n’est pas révélée */
  dealerHoleHidden: boolean
  seats: BJSeatPublic[]
  currentSeatUserId: string | null
  /** Phase `payout` uniquement : résultats (même source que le WebSocket `roundSummary`). */
  payoutSummary?: BjPayoutSummaryRow[]
}

function maskDealerPublic(dealerHand: Card[], hideHole: boolean): BJPublicCard[] {
  if (dealerHand.length === 0) return []
  const up = dealerHand.map(cardToPublic)
  if (!hideHole || dealerHand.length < 2) return up
  return [up[0]!, { rank: '?', suit: '?' }]
}

export class BlackjackTableController {
  readonly gameId: string
  readonly roomId: string
  readonly maxSeats: number
  minBet: number
  seats: BJSeatRuntime[]
  dealerHand: Card[] = []
  shoe: Card[] = []
  phase: BJTablePhase = 'betting'
  currentSeatIndex: number = -1
  handNumber: number = 0

  constructor(params: {
    gameId: string
    roomId: string
    maxSeats: number
    minBet: number
    members: BJTableMemberInput[]
  }) {
    this.gameId = params.gameId
    this.roomId = params.roomId
    this.maxSeats = params.maxSeats
    this.minBet = Math.max(10, params.minBet)
    const sorted = [...params.members].sort((a, b) => a.position - b.position)
    this.seats = sorted.map((m) => ({
      userId: m.userId,
      username: m.username,
      position: m.position,
      hand: [],
      bet: 0,
      totalBet: 0,
      doubled: false,
      playState: 'no_bet',
    }))
    this.shoe = createShoe()
    shuffleShoe(this.shoe)
    this.phase = 'betting'
  }

  seatIndexForUser(userId: string): number {
    return this.seats.findIndex((s) => s.userId === userId)
  }

  placeBet(
    userId: string,
    rawBet: unknown,
    chipsAvailable: number,
    maxBetEffective: number
  ): { ok: true; bet: number } | { ok: false; code: string } {
    if (this.phase !== 'betting') {
      return { ok: false, code: 'WRONG_PHASE' }
    }
    const seat = this.seats.find((s) => s.userId === userId)
    if (!seat || seat.playState !== 'no_bet') {
      return { ok: false, code: 'NO_SEAT_OR_ALREADY_BET' }
    }
    const cap = Math.min(maxBetEffective, BLACKJACK_MAX_BET_CAP)
    const v = validateBlackjackBet(rawBet, chipsAvailable, cap)
    if (!v.ok) return { ok: false, code: v.code }
    if (v.bet < this.minBet) return { ok: false, code: 'BET_TOO_LOW' }
    seat.bet = v.bet
    seat.totalBet = v.bet
    seat.playState = 'bet_placed'
    return { ok: true, bet: v.bet }
  }

  canDeal(): boolean {
    return this.phase === 'betting' && this.seats.some((s) => s.playState === 'bet_placed')
  }

  /** Tous les sièges occupés ont misé : distribution possible sans action hôte. */
  allSeatsReadyForDeal(): boolean {
    if (this.phase !== 'betting' || this.seats.length === 0) return false
    return this.seats.every((s) => s.playState === 'bet_placed')
  }

  deal(): { ok: true } | { ok: false; code: string } {
    if (!this.canDeal()) return { ok: false, code: 'CANNOT_DEAL' }
    if (this.shoe.length < 26) {
      this.shoe = createShoe()
      shuffleShoe(this.shoe)
    }

    this.dealerHand = []
    this.handNumber += 1

    for (const s of this.seats) {
      s.hand = []
      if (s.playState !== 'bet_placed') {
        s.bet = 0
        s.totalBet = 0
        s.doubled = false
        s.playState = 'no_bet'
      }
    }

    const active = this.seats.filter((s) => s.playState === 'bet_placed')
    for (let round = 0; round < 2; round++) {
      for (const s of active) {
        s.hand.push(drawCard(this.shoe))
      }
      this.dealerHand.push(drawCard(this.shoe))
    }

    for (const s of active) {
      if (isNaturalBlackjack(s.hand)) {
        s.playState = 'blackjack_natural'
      } else {
        s.playState = 'in_hand'
      }
    }

    for (const s of this.seats) {
      if (s.playState === 'no_bet') {
        s.hand = []
      }
    }

    const needsPlayer = this.seats.some((s) => s.playState === 'in_hand')

    if (!needsPlayer) {
      this.phase = 'dealer'
      this.currentSeatIndex = -1
    } else {
      const firstInHand = this.seats.findIndex((s) => s.playState === 'in_hand')
      this.phase = 'player_turn'
      this.currentSeatIndex = firstInHand
    }

    return { ok: true }
  }

  /** Après phase dealer : jouer le croupier (logique pure). */
  runDealerDraws(): void {
    if (this.phase !== 'dealer') return
    playDealerHand(this.dealerHand, this.shoe)
    this.phase = 'payout'
    this.currentSeatIndex = -1
  }

  playerAction(
    userId: string,
    action: 'hit' | 'stand' | 'double'
  ): { ok: true } | { ok: false; code: string } {
    if (this.phase !== 'player_turn') {
      return { ok: false, code: 'WRONG_PHASE' }
    }
    const seat = this.seats[this.currentSeatIndex]
    if (!seat || seat.userId !== userId) {
      return { ok: false, code: 'NOT_YOUR_TURN' }
    }
    if (seat.playState !== 'in_hand') {
      return { ok: false, code: 'INVALID_STATE' }
    }

    if (action === 'stand') {
      seat.playState = 'standing'
      this.advanceFromSeat(this.currentSeatIndex)
      return { ok: true }
    }

    if (action === 'hit') {
      seat.hand.push(drawCard(this.shoe))
      const v = handValue(seat.hand)
      if (v.bust) {
        seat.playState = 'bust'
        this.advanceFromSeat(this.currentSeatIndex)
      } else if (v.total === 21) {
        seat.playState = 'standing'
        this.advanceFromSeat(this.currentSeatIndex)
      }
      return { ok: true }
    }

    if (action === 'double') {
      if (seat.hand.length !== 2) {
        return { ok: false, code: 'DOUBLE_NOT_ALLOWED' }
      }
      seat.totalBet = seat.bet * 2
      seat.doubled = true
      seat.hand.push(drawCard(this.shoe))
      const v = handValue(seat.hand)
      seat.playState = v.bust ? 'bust' : 'standing'
      this.advanceFromSeat(this.currentSeatIndex)
      return { ok: true }
    }

    return { ok: false, code: 'UNKNOWN_ACTION' }
  }

  private advanceFromSeat(justFinishedIndex: number): void {
    for (let i = justFinishedIndex + 1; i < this.seats.length; i++) {
      const s = this.seats[i]!
      if (s.playState === 'in_hand') {
        this.currentSeatIndex = i
        return
      }
    }
    this.phase = 'dealer'
    this.currentSeatIndex = -1
  }

  /**
   * Lignes à régler en base (une par siège ayant misé cette main).
   */
  computeSettlements(): Array<{
    userId: string
    username: string
    playerHand: Card[]
    totalBet: number
    payout: number
    reason: string
  }> {
    const dealer = this.dealerHand
    const out: Array<{
      userId: string
      username: string
      playerHand: Card[]
      totalBet: number
      payout: number
      reason: string
    }> = []
    for (const s of this.seats) {
      if (s.totalBet <= 0 && s.bet <= 0) continue
      if (s.hand.length === 0) continue
      const totalBet = s.totalBet > 0 ? s.totalBet : s.bet
      const { payout, reason } = settleRound(s.hand, dealer, totalBet)
      out.push({
        userId: s.userId,
        username: s.username,
        playerHand: s.hand,
        totalBet,
        payout,
        reason: String(reason),
      })
    }
    return out
  }

  /** Après transaction Prisma de paiement : retour mise en attente des mises. */
  finishHandAfterPayout(): void {
    this.phase = 'betting'
    this.dealerHand = []
    for (const s of this.seats) {
      s.hand = []
      s.bet = 0
      s.totalBet = 0
      s.doubled = false
      s.playState = 'no_bet'
    }
    this.currentSeatIndex = -1
  }

  dealerHoleHidden(): boolean {
    return this.phase === 'betting' || this.phase === 'player_turn'
  }

  toPublicState(_viewerId?: string | null): BlackjackTablePublicState {
    const hideHole = this.dealerHoleHidden()
    const dealerCards = maskDealerPublic(this.dealerHand, hideHole)

    const seats: BJSeatPublic[] = this.seats.map((s, idx) => {
      const v = s.hand.length ? handValue(s.hand) : undefined
      return {
        userId: s.userId,
        username: s.username,
        position: s.position,
        cards: s.hand.map(cardToPublic),
        bet: s.bet,
        totalBet: s.totalBet,
        doubled: s.doubled,
        playState: s.playState,
        isCurrentTurn: this.phase === 'player_turn' && idx === this.currentSeatIndex,
        handTotal: v && !v.bust ? v.total : undefined,
      }
    })

    const current =
      this.phase === 'player_turn' && this.currentSeatIndex >= 0
        ? this.seats[this.currentSeatIndex]?.userId ?? null
        : null

    let payoutSummary: BjPayoutSummaryRow[] | undefined
    if (this.phase === 'payout') {
      payoutSummary = this.computeSettlements().map((r) => ({
        userId: r.userId,
        username: r.username,
        payout: r.payout,
        reason: String(r.reason),
      }))
    }

    return {
      gameId: this.gameId,
      roomId: this.roomId,
      phase: this.phase,
      handNumber: this.handNumber,
      minBet: this.minBet,
      dealerCards,
      dealerHoleHidden: hideHole,
      seats,
      currentSeatUserId: current,
      ...(payoutSummary?.length ? { payoutSummary } : {}),
    }
  }
}
