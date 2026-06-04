import { randomUUID } from 'crypto'
import { nextPosition, teamForPosition } from './bidding.js'
import { applyContreeBidAction, getHighestBid } from './conteeBidding.js'
import { BELOTE_ANNOUNCE_POINTS } from './conteeConstants.js'
import { legalBidOptions } from './conteeLegalBids.js'
import { computeDealScore, detectBeloteInHand } from './conteeScoring.js'
import { cardKey, createBeloteDeck, removeCardFromHand, shuffleBeloteDeck } from './deck.js'
import { DIX_DE_DER, sumTrickPoints } from './scoring.js'
import { canPlayCard, firstLegalCard, playableCards, trickWinnerPosition } from './trickPlay.js'
import type {
  BeloteAction,
  BeloteCard,
  BeloteGameState,
  BelotePlayerState,
  BeloteSuit,
  BeloteTeam,
  SanitizedBeloteState,
} from './types.js'

const DISCONNECT_MS = 60_000
export const BELOTE_TURN_TIME_SEC = 30
const BELOTE_TURN_MS = BELOTE_TURN_TIME_SEC * 1000

export type BeloteTableInit = {
  gameId: string
  roomId: string
  targetScore: number
  players: Array<{
    userId: string
    username: string
    position: number
    avatarUrl?: string | null
  }>
}

export class BeloteTableController {
  gameId: string
  roomId: string
  private state: BeloteGameState
  private dealIndex = 0

  constructor(init: BeloteTableInit) {
    const players: BelotePlayerState[] = init.players.map((p) => ({
      userId: p.userId,
      username: p.username,
      position: p.position,
      team: teamForPosition(p.position),
      hand: [],
      avatarUrl: p.avatarUrl ?? null,
    }))
    const now = new Date().toISOString()
    this.gameId = init.gameId
    this.roomId = init.roomId
    this.state = {
      gameId: init.gameId,
      roomId: init.roomId,
      variant: 'CONTEE',
      targetScore: init.targetScore,
      teamScoreA: 0,
      teamScoreB: 0,
      phase: 'BIDDING',
      biddingTurnPosition: nextPosition(0),
      bids: [],
      contreeLevel: 0,
      players,
      deal: {
        dealerPosition: 0,
        currentTrick: [],
        trickLeaderPosition: 0,
        currentPlayerPosition: 0,
        tricksWonA: 0,
        tricksWonB: 0,
        dealPointsA: 0,
        dealPointsB: 0,
      },
      startedAt: now,
      lastActionAt: now,
      turnTimeLimitSec: BELOTE_TURN_TIME_SEC,
    }
    this.dealCards()
  }

  static fromSnapshot(snapshot: BeloteGameState): BeloteTableController {
    const ctrl = Object.create(BeloteTableController.prototype) as BeloteTableController
    ctrl.gameId = snapshot.gameId
    ctrl.roomId = snapshot.roomId
    ctrl.state = snapshot
    if (!ctrl.state.turnTimeLimitSec) {
      ctrl.state.turnTimeLimitSec = BELOTE_TURN_TIME_SEC
    }
    if (!ctrl.state.variant) ctrl.state.variant = 'CONTEE'
    if (ctrl.state.contreeLevel == null) ctrl.state.contreeLevel = 0
    if (
      ctrl.state.phase === 'BIDDING_ROUND_1' ||
      ctrl.state.phase === 'BIDDING_ROUND_2'
    ) {
      ctrl.state.phase = 'BIDDING'
    }
    for (const p of ctrl.state.players) {
      if (!p.team) p.team = teamForPosition(p.position)
    }
    ctrl.dealIndex = 0
    return ctrl
  }

  getState(): BeloteGameState {
    return structuredClone(this.state)
  }

  getSanitizedState(forUserId: string): SanitizedBeloteState {
    const s = this.getState()
    const requester = s.players.find((p) => p.userId === forUserId)
    let myLegalPlays: BeloteCard[] | undefined
    if (
      requester &&
      s.phase === 'PLAYING' &&
      s.deal.trump &&
      s.deal.currentPlayerPosition === requester.position
    ) {
      myLegalPlays = playableCards(
        requester.hand,
        s.deal.trump,
        s.deal.currentTrick,
        requester.position,
      )
    }

    let myLegalBids: ReturnType<typeof legalBidOptions> | undefined
    if (
      requester &&
      (s.phase === 'BIDDING' || s.phase === 'CONTREE_ROUND') &&
      s.biddingTurnPosition === requester.position
    ) {
      if (s.phase === 'BIDDING') {
        myLegalBids = legalBidOptions(s.bids)
      }
    }

    return {
      ...s,
      myLegalPlays,
      myLegalBids,
      players: s.players.map((p) => {
        const base = {
          userId: p.userId,
          username: p.username,
          position: p.position,
          team: p.team,
          handCount: p.hand.length,
          avatarUrl: p.avatarUrl ?? null,
          disconnectedAt: p.disconnectedAt,
          disconnectDeadline: p.disconnectDeadline,
          forfeited: p.forfeited,
        }
        if (p.userId === forUserId) {
          return { ...base, hand: [...p.hand] }
        }
        return base
      }),
    }
  }

  applyAction(userId: string, action: BeloteAction): { ok: true } | { ok: false; error: string } {
    const player = this.state.players.find((p) => p.userId === userId)
    if (!player) return { ok: false, error: 'NOT_IN_GAME' }
    if (player.forfeited) return { ok: false, error: 'FORFEITED' }

    if (this.state.phase === 'GAME_END' || this.state.phase === 'DEAL_END') {
      return { ok: false, error: 'GAME_FINISHED' }
    }

    if (this.state.phase === 'BIDDING' || this.state.phase === 'CONTREE_ROUND') {
      return this.applyContreeAction(player.position, action)
    }

    if (this.state.phase === 'PLAYING') {
      if (action.type !== 'PLAY_CARD') return { ok: false, error: 'INVALID_ACTION' }
      return this.applyPlayCard(player.position, action.card)
    }

    return { ok: false, error: 'INVALID_PHASE' }
  }

  markDisconnected(userId: string): void {
    const p = this.state.players.find((x) => x.userId === userId)
    if (!p || p.forfeited) return
    const now = Date.now()
    p.disconnectedAt = new Date(now).toISOString()
    p.disconnectDeadline = new Date(now + DISCONNECT_MS).toISOString()
    this.touch()
  }

  markReconnected(userId: string): void {
    const p = this.state.players.find((x) => x.userId === userId)
    if (!p) return
    delete p.disconnectedAt
    delete p.disconnectDeadline
    this.touch()
  }

  processDisconnectTimeouts(now = Date.now()): boolean {
    let changed = false
    for (const p of this.state.players) {
      if (p.forfeited || !p.disconnectDeadline) continue
      if (new Date(p.disconnectDeadline).getTime() <= now) {
        p.forfeited = true
        delete p.disconnectDeadline
        changed = true
      }
    }
    if (changed) this.checkForfeitEnd()
    return changed
  }

  forceEnd(winningTeam: BeloteTeam): void {
    this.state.phase = 'GAME_END'
    this.touch()
    void winningTeam
  }

  /** Action automatique à l’expiration du timer de tour (PASS ou première carte légale). */
  applyTurnTimeout(): boolean {
    if (
      this.state.phase !== 'BIDDING' &&
      this.state.phase !== 'CONTREE_ROUND' &&
      this.state.phase !== 'PLAYING'
    ) {
      return false
    }

    const pos =
      this.state.phase === 'PLAYING'
        ? this.state.deal.currentPlayerPosition
        : this.state.biddingTurnPosition
    const player = this.state.players.find((p) => p.position === pos)
    if (!player || player.forfeited) return false

    if (this.state.phase === 'BIDDING' || this.state.phase === 'CONTREE_ROUND') {
      const r = this.applyContreeAction(pos, { type: 'PASS' })
      return r.ok
    }

    const trump = this.state.deal.trump
    if (!trump) return false
    const card = firstLegalCard(
      player.hand,
      trump,
      this.state.deal.currentTrick,
      pos,
    )
    if (!card) return false
    const r = this.applyPlayCard(pos, card)
    return r.ok
  }

  private applyContreeAction(
    position: number,
    action: BeloteAction,
  ): { ok: true } | { ok: false; error: string } {
    let normalized = action
    if (action.type === 'CHOOSE_TRUMP') {
      const highest = getHighestBid(this.state.bids)
      const value = highest ? highest.value + 10 : 80
      normalized = { type: 'BID', value, trump: action.trump }
    }

    if (normalized.type === 'BID') {
      const r = applyContreeBidAction(this.state, position, normalized)
      if (!r.ok) return r
      if (r.redeal) {
        this.redeal()
        return { ok: true }
      }
      this.touch()
      return { ok: true }
    }

    if (
      normalized.type === 'PASS' ||
      normalized.type === 'CONTREE' ||
      normalized.type === 'SURCONTREE'
    ) {
      const r = applyContreeBidAction(this.state, position, normalized)
      if (!r.ok) return r
      if (r.redeal) {
        this.redeal()
        return { ok: true }
      }
      if (r.startPlay) {
        this.startPlaying()
        return { ok: true }
      }
      this.touch()
      return { ok: true }
    }

    return { ok: false, error: 'INVALID_ACTION' }
  }

  private applyPlayCard(
    position: number,
    card: BeloteCard,
  ): { ok: true } | { ok: false; error: string } {
    if (position !== this.state.deal.currentPlayerPosition) {
      return { ok: false, error: 'NOT_YOUR_TURN' }
    }
    const trump = this.state.deal.trump
    if (!trump) return { ok: false, error: 'NO_TRUMP' }

    const player = this.state.players.find((p) => p.position === position)!
    if (!canPlayCard(player.hand, card, trump, this.state.deal.currentTrick, position)) {
      return { ok: false, error: 'ILLEGAL_CARD' }
    }

    player.hand = removeCardFromHand(player.hand, card)
    this.state.deal.currentTrick.push({ position, card })
    this.touch()

    if (this.state.deal.currentTrick.length < 4) {
      this.state.deal.currentPlayerPosition = nextPosition(position)
      return { ok: true }
    }

    this.completeTrick(trump)
    return { ok: true }
  }

  private completeTrick(trump: BeloteSuit): void {
    const trick = this.state.deal.currentTrick
    const winnerPos = trickWinnerPosition(trick, trump)
    const winnerTeam = teamForPosition(winnerPos)
    const points = sumTrickPoints(
      trick.map((t) => t.card),
      trump,
    )

    if (winnerTeam === 'A') {
      this.state.deal.tricksWonA++
      this.state.deal.dealPointsA += points
    } else {
      this.state.deal.tricksWonB++
      this.state.deal.dealPointsB += points
    }

    this.state.deal.currentTrick = []
    this.state.deal.trickLeaderPosition = winnerPos
    this.state.deal.currentPlayerPosition = winnerPos

    const handsEmpty = this.state.players.every((p) => p.hand.length === 0)
    if (handsEmpty) {
      this.finishDeal(trump, winnerPos, winnerTeam)
    }
  }

  private finishDeal(_trump: BeloteSuit, _lastWinnerPos: number, lastWinnerTeam: BeloteTeam): void {
    const summary = computeDealScore(this.state, lastWinnerTeam)
    this.state.dealEndSummary = summary
    this.state.teamScoreA += summary.scoreA
    this.state.teamScoreB += summary.scoreB

    if (
      this.state.teamScoreA >= this.state.targetScore ||
      this.state.teamScoreB >= this.state.targetScore
    ) {
      this.state.phase = 'GAME_END'
      this.touch()
      return
    }

    this.state.phase = 'DEAL_END'
    this.touch()
  }

  startNextDeal(): void {
    if (this.state.phase !== 'DEAL_END') return
    this.state.deal.dealerPosition = nextPosition(this.state.deal.dealerPosition)
    this.resetDealState()
    this.state.phase = 'BIDDING'
    this.state.biddingTurnPosition = nextPosition(this.state.deal.dealerPosition)
    this.state.bids = []
    this.state.contractPoints = undefined
    this.state.contreeLevel = 0
    delete this.state.contreePhase
    delete this.state.contreeDefensePasses
    delete this.state.contreeAttackPasses
    delete this.state.dealEndSummary
    this.state.beloteBonusA = 0
    this.state.beloteBonusB = 0
    this.dealCards()
  }

  private checkForfeitEnd(): void {
    const active = this.state.players.filter((p) => !p.forfeited)
    if (active.length < 4 && this.state.phase !== 'GAME_END') {
      const teams = new Set(active.map((p) => p.team))
      if (teams.size === 1) {
        this.state.phase = 'GAME_END'
        this.touch()
      }
    }
  }

  private redeal(): void {
    this.state.bids = []
    this.resetDealState()
    this.state.phase = 'BIDDING'
    this.state.biddingTurnPosition = nextPosition(this.state.deal.dealerPosition)
    this.state.contreeLevel = 0
    this.dealCards()
  }

  private resetDealState(): void {
    this.state.deal = {
      ...this.state.deal,
      trump: undefined,
      takerPosition: undefined,
      contractTeam: undefined,
      currentTrick: [],
      trickLeaderPosition: this.state.deal.dealerPosition,
      currentPlayerPosition: nextPosition(this.state.deal.dealerPosition),
      tricksWonA: 0,
      tricksWonB: 0,
      dealPointsA: 0,
      dealPointsB: 0,
    }
  }

  private startPlaying(): void {
    this.state.phase = 'PLAYING'
    const trump = this.state.deal.trump!
    this.state.beloteBonusA = 0
    this.state.beloteBonusB = 0
    for (const p of this.state.players) {
      if (detectBeloteInHand(p.hand, trump)) {
        if (p.team === 'A') this.state.beloteBonusA = BELOTE_ANNOUNCE_POINTS
        else this.state.beloteBonusB = BELOTE_ANNOUNCE_POINTS
      }
    }
    const taker = this.state.deal.takerPosition ?? 0
    this.state.deal.trickLeaderPosition = nextPosition(taker)
    this.state.deal.currentPlayerPosition = this.state.deal.trickLeaderPosition
    delete this.state.contreePhase
    this.touch()
  }

  private dealCards(): void {
    this.dealIndex++
    let deck = shuffleBeloteDeck(createBeloteDeck(), this.gameId, this.dealIndex)
    for (const p of this.state.players) {
      p.hand = deck.splice(0, 8)
    }
    this.state.bids = []
    this.touch()
  }

  private touch(): void {
    this.state.lastActionAt = new Date().toISOString()
    if (
      this.state.phase === 'BIDDING' ||
      this.state.phase === 'CONTREE_ROUND' ||
      this.state.phase === 'PLAYING'
    ) {
      this.state.turnDeadlineAt = new Date(Date.now() + BELOTE_TURN_MS).toISOString()
      if (!this.state.turnTimeLimitSec) {
        this.state.turnTimeLimitSec = BELOTE_TURN_TIME_SEC
      }
    } else {
      delete this.state.turnDeadlineAt
    }
  }

  winningTeam(): BeloteTeam | null {
    if (this.state.phase !== 'GAME_END') return null
    if (this.state.teamScoreA >= this.state.targetScore) return 'A'
    if (this.state.teamScoreB >= this.state.targetScore) return 'B'
    if (this.state.teamScoreA > this.state.teamScoreB) return 'A'
    if (this.state.teamScoreB > this.state.teamScoreA) return 'B'
    return 'A'
  }
}

export function newBeloteGameId(): string {
  return randomUUID()
}
