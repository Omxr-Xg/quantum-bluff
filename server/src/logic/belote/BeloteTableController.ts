import { randomUUID } from 'crypto'
import { nextPosition, teamForPosition } from './bidding.js'
import { applyClassiqueBidAction } from './classiqueBidding.js'
import { computeClassicDealScore } from './classicScoring.js'
import { applyContreeBidAction, getHighestBid } from './conteeBidding.js'
import { belotePotTotal } from './beloteBuyIn.js'
import { usesAuctionBidding } from './beloteVariants.js'
import { BELOTE_ANNOUNCE_POINTS } from './conteeConstants.js'
import { legalBidOptions } from './conteeLegalBids.js'
import { computeDealScore, detectBeloteInHand } from './conteeScoring.js'
import { cardKey, createBeloteDeck, removeCardFromHand, shuffleBeloteDeck } from './deck.js'
import { cardPoints, resolveTrumpContext } from './trumpContext.js'
import { isBeloteBotId, makeBeloteBotId, beloteBotDisplayName } from '../../shared/beloteBots.js'
import { canPlayCard, playableCards, trickWinnerPosition } from './trickPlay.js'
import {
  beloteActionLogKey,
  clearBeloteDealActionLog,
} from '../../belote/services/beloteActionLog.service.js'
import type {
  BeloteAction,
  BeloteCard,
  BeloteGameState,
  BeloteGameVariant,
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
  variant: BeloteGameVariant
  targetScore: number
  buyIn: number
  players: Array<{
    userId: string
    username: string
    position: number
    avatarUrl?: string | null
    isBot?: boolean
  }>
}

export class BeloteTableController {
  gameId: string
  roomId: string
  private state: BeloteGameState
  private dealIndex = 0
  private actionVersion = 0
  private remainingDeck: BeloteCard[] = []

  constructor(init: BeloteTableInit) {
    const players: BelotePlayerState[] = init.players.map((p) => ({
      userId: p.userId,
      username: p.username,
      position: p.position,
      team: teamForPosition(p.position),
      hand: [],
      avatarUrl: p.avatarUrl ?? null,
      isBot: p.isBot ?? isBeloteBotId(p.userId),
    }))
    const now = new Date().toISOString()
    this.gameId = init.gameId
    this.roomId = init.roomId
    this.state = {
      gameId: init.gameId,
      roomId: init.roomId,
      variant: init.variant,
      targetScore: init.targetScore,
      teamScoreA: 0,
      teamScoreB: 0,
      phase: init.variant === 'CLASSIQUE' ? 'CLASSIQUE_TAKE' : 'BIDDING',
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
      buyIn: init.buyIn,
      potTotal: belotePotTotal(init.buyIn, players.length),
    }
    this.startDeal()
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
      ctrl.state.phase =
        ctrl.state.variant === 'CLASSIQUE' ? 'CLASSIQUE_TAKE' : 'BIDDING'
    }
    if (!ctrl.state.deal.trumpMode && ctrl.state.deal.trump) {
      ctrl.state.deal.trumpMode = 'SUIT'
    }
    for (const p of ctrl.state.players) {
      if (!p.team) p.team = teamForPosition(p.position)
    }
    if (ctrl.state.buyIn == null || !Number.isFinite(ctrl.state.buyIn)) {
      ctrl.state.buyIn = 100
    }
    if (ctrl.state.potTotal == null || !Number.isFinite(ctrl.state.potTotal)) {
      ctrl.state.potTotal = belotePotTotal(ctrl.state.buyIn, ctrl.state.players.length)
    }
    ctrl.dealIndex = 0
    ctrl.actionVersion = snapshot.actionVersion ?? 0
    return ctrl
  }

  getState(): BeloteGameState {
    return structuredClone(this.state)
  }

  getSanitizedState(forUserId: string, forSpectator = false): SanitizedBeloteState {
    const s = this.getState()
    const requester = s.players.find((p) => p.userId === forUserId)
    const spectator = forSpectator || !requester

    const ctx = resolveTrumpContext(s)

    let myLegalPlays: BeloteCard[] | undefined
    if (
      !spectator &&
      requester &&
      s.phase === 'PLAYING' &&
      ctx &&
      s.deal.currentPlayerPosition === requester.position
    ) {
      myLegalPlays = playableCards(
        requester.hand,
        ctx,
        s.deal.currentTrick,
        requester.position,
      )
    }

    let myLegalBids: ReturnType<typeof legalBidOptions> | undefined
    if (
      !spectator &&
      requester &&
      s.biddingTurnPosition === requester.position
    ) {
      if (s.phase === 'BIDDING' && usesAuctionBidding(s.variant)) {
        myLegalBids = legalBidOptions(s.bids, s.variant)
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
          isBot: p.isBot ?? isBeloteBotId(p.userId),
          disconnectedAt: p.disconnectedAt,
          disconnectDeadline: p.disconnectDeadline,
          forfeited: p.forfeited,
        }
        if (!spectator && p.userId === forUserId) {
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

    if (
      this.state.phase === 'CLASSIQUE_TAKE' ||
      this.state.phase === 'CLASSIQUE_CHOOSE'
    ) {
      const result = this.applyClassiqueAction(player.position, action)
      if (result.ok) this.recordActionLog(player.position, action)
      return result
    }

    if (this.state.phase === 'BIDDING' || this.state.phase === 'CONTREE_ROUND') {
      const result = this.applyAuctionAction(player.position, action)
      if (result.ok) this.recordActionLog(player.position, action)
      return result
    }

    if (this.state.phase === 'PLAYING') {
      if (action.type !== 'PLAY_CARD') return { ok: false, error: 'INVALID_ACTION' }
      const result = this.applyPlayCard(player.position, action.card)
      if (result.ok) this.recordActionLog(player.position, action)
      return result
    }

    return { ok: false, error: 'INVALID_PHASE' }
  }

  private recordActionLog(position: number, action: BeloteAction): void {
    const player = this.state.players.find((p) => p.position === position)
    if (!player) return
    this.actionVersion++
    const fields = beloteActionLogKey(action)
    this.state.actionVersion = this.actionVersion
    this.state.lastBeloteAction = {
      actionVersion: this.actionVersion,
      phase: this.state.phase,
      playerId: player.userId,
      playerName: player.username,
      ...fields,
    }
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

  /** Remplace un humain déconnecté par une IA (même main / position / équipe). */
  replacePlayerWithBot(userId: string, displayName?: string): string | null {
    const p = this.state.players.find((x) => x.userId === userId)
    if (!p || p.isBot || isBeloteBotId(p.userId)) return null
    const botId = makeBeloteBotId()
    p.userId = botId
    p.username = displayName ?? beloteBotDisplayName(p.position)
    p.isBot = true
    delete p.disconnectedAt
    delete p.disconnectDeadline
    p.forfeited = false
    this.touch()
    return botId
  }

  processDisconnectTimeouts(now = Date.now()): {
    changed: boolean
    replacements: Array<{
      oldUserId: string
      botId: string
      username: string
      position: number
    }>
  } {
    const replacements: Array<{
      oldUserId: string
      botId: string
      username: string
      position: number
    }> = []
    let changed = false
    for (const p of this.state.players) {
      if (p.forfeited || !p.disconnectDeadline) continue
      if (new Date(p.disconnectDeadline).getTime() <= now) {
        const oldId = p.userId
        const username = p.username
        const position = p.position
        const botId = this.replacePlayerWithBot(oldId)
        if (botId) {
          replacements.push({ oldUserId: oldId, botId, username, position })
          changed = true
        } else if (!p.isBot && !isBeloteBotId(p.userId)) {
          p.forfeited = true
          delete p.disconnectDeadline
          changed = true
        }
      }
    }
    if (changed) this.checkForfeitEnd()
    return { changed, replacements }
  }

  forceEnd(winningTeam: BeloteTeam): void {
    this.state.phase = 'GAME_END'
    this.touch()
    void winningTeam
  }

  /** Action automatique à l’expiration du timer de tour (PASS ou première carte légale). */
  applyTurnTimeout(): boolean {
    const phase = this.state.phase
    if (
      phase !== 'BIDDING' &&
      phase !== 'CONTREE_ROUND' &&
      phase !== 'PLAYING' &&
      phase !== 'CLASSIQUE_TAKE' &&
      phase !== 'CLASSIQUE_CHOOSE'
    ) {
      return false
    }

    const pos =
      phase === 'PLAYING'
        ? this.state.deal.currentPlayerPosition
        : this.state.biddingTurnPosition
    const player = this.state.players.find((p) => p.position === pos)
    if (!player || player.forfeited) return false

    if (phase === 'CLASSIQUE_TAKE' || phase === 'CLASSIQUE_CHOOSE') {
      const r = this.applyAction(player.userId, { type: 'PASS' })
      return r.ok
    }

    if (phase === 'BIDDING' || phase === 'CONTREE_ROUND') {
      const r = this.applyAction(player.userId, { type: 'PASS' })
      return r.ok
    }

    const ctx = resolveTrumpContext(this.state)
    if (!ctx) return false
    const legal = playableCards(
      player.hand,
      ctx,
      this.state.deal.currentTrick,
      pos,
    )
    const card = legal[0]
    if (!card) return false
    const r = this.applyAction(player.userId, { type: 'PLAY_CARD', card })
    return r.ok
  }

  private applyClassiqueAction(
    position: number,
    action: BeloteAction,
  ): { ok: true } | { ok: false; error: string } {
    if (action.type === 'PLAY_CARD') {
      return { ok: false, error: 'INVALID_ACTION' }
    }

    if (action.type === 'TAKE' && this.state.phase === 'CLASSIQUE_TAKE') {
      const r = applyClassiqueBidAction(this.state, position, { type: 'TAKE' })
      if (!r.ok) return r
      if (r.redeal) {
        this.redeal()
        return { ok: true }
      }
      if (r.dealComplete) {
        this.completeClassiqueDeal(position, true)
        this.startPlaying()
        return { ok: true }
      }
      this.touch()
      return { ok: true }
    }

    if (action.type === 'PASS') {
      const r = applyClassiqueBidAction(this.state, position, { type: 'PASS' })
      if (!r.ok) return r
      if (r.redeal) {
        this.redeal()
        return { ok: true }
      }
      this.touch()
      return { ok: true }
    }

    if (
      action.type === 'CHOOSE_TRUMP' &&
      this.state.phase === 'CLASSIQUE_CHOOSE'
    ) {
      const r = applyClassiqueBidAction(this.state, position, action)
      if (!r.ok) return r
      if (r.dealComplete) {
        this.completeClassiqueDeal(position, false)
        this.startPlaying()
        return { ok: true }
      }
      this.touch()
      return { ok: true }
    }

    return { ok: false, error: 'INVALID_ACTION' }
  }

  private applyAuctionAction(
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
    const ctx = resolveTrumpContext(this.state)
    if (!ctx) return { ok: false, error: 'NO_TRUMP' }

    const player = this.state.players.find((p) => p.position === position)!
    if (!canPlayCard(player.hand, card, ctx, this.state.deal.currentTrick, position)) {
      return { ok: false, error: 'ILLEGAL_CARD' }
    }

    player.hand = removeCardFromHand(player.hand, card)
    if (this.state.deal.currentTrick.length === 0) {
      delete this.state.deal.lastCompletedTrick
    }
    this.state.deal.currentTrick.push({ position, card })
    this.touch()

    if (this.state.deal.currentTrick.length < 4) {
      this.state.deal.currentPlayerPosition = nextPosition(position)
      return { ok: true }
    }

    this.completeTrick(ctx)
    return { ok: true }
  }

  private completeTrick(ctx: import('./trumpContext.js').TrumpContext): void {
    const trick = this.state.deal.currentTrick
    const winnerPos = trickWinnerPosition(trick, ctx)
    const winnerTeam = teamForPosition(winnerPos)
    const points = trick.reduce((sum, t) => sum + cardPoints(t.card, ctx), 0)

    if (winnerTeam === 'A') {
      this.state.deal.tricksWonA++
      this.state.deal.dealPointsA += points
    } else {
      this.state.deal.tricksWonB++
      this.state.deal.dealPointsB += points
    }

    this.state.deal.lastCompletedTrick = trick.map((t) => ({ ...t, card: { ...t.card } }))
    this.state.deal.currentTrick = []
    this.state.deal.trickLeaderPosition = winnerPos
    this.state.deal.currentPlayerPosition = winnerPos

    const handsEmpty = this.state.players.every((p) => p.hand.length === 0)
    if (handsEmpty) {
      this.finishDeal(winnerPos, winnerTeam)
    }
  }

  private finishDeal(_lastWinnerPos: number, lastWinnerTeam: BeloteTeam): void {
    const summary =
      this.state.variant === 'CLASSIQUE'
        ? computeClassicDealScore(this.state, lastWinnerTeam)
        : computeDealScore(this.state, lastWinnerTeam)
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
    this.state.phase =
      this.state.variant === 'CLASSIQUE' ? 'CLASSIQUE_TAKE' : 'BIDDING'
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
    this.startDeal()
  }

  private checkForfeitEnd(): void {
    if (this.state.phase === 'GAME_END') return
    const active = this.state.players.filter((p) => !p.forfeited)
    if (active.length === 0) {
      this.state.phase = 'GAME_END'
      this.touch()
      return
    }
    if (active.length < 4) {
      const teams = new Set(active.map((p) => p.team))
      if (teams.size === 1) {
        this.state.phase = 'GAME_END'
        this.touch()
      }
    }
  }

  private redeal(): void {
    this.state.deal.dealerPosition = nextPosition(this.state.deal.dealerPosition)
    this.state.bids = []
    this.state.contreeLevel = 0
    delete this.state.contractPoints
    delete this.state.contreePhase
    delete this.state.contreeDefensePasses
    delete this.state.contreeAttackPasses
    this.resetDealState()
    this.state.phase =
      this.state.variant === 'CLASSIQUE' ? 'CLASSIQUE_TAKE' : 'BIDDING'
    this.state.biddingTurnPosition = nextPosition(this.state.deal.dealerPosition)
    this.startDeal()
    this.touch()
  }

  private resetDealState(): void {
    void clearBeloteDealActionLog(this.gameId, this.state.dealLogId)
    this.actionVersion = 0
    delete this.state.actionVersion
    delete this.state.lastBeloteAction
    this.state.deal = {
      ...this.state.deal,
      trump: undefined,
      trumpMode: undefined,
      turnedCard: undefined,
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
    const ctx = resolveTrumpContext(this.state)
    this.state.beloteBonusA = 0
    this.state.beloteBonusB = 0
    if (ctx?.mode === 'SUIT') {
      for (const p of this.state.players) {
        if (detectBeloteInHand(p.hand, ctx.suit)) {
          if (p.team === 'A') this.state.beloteBonusA = BELOTE_ANNOUNCE_POINTS
          else this.state.beloteBonusB = BELOTE_ANNOUNCE_POINTS
        }
      }
    }
    const taker = this.state.deal.takerPosition ?? 0
    this.state.deal.trickLeaderPosition = nextPosition(taker)
    this.state.deal.currentPlayerPosition = this.state.deal.trickLeaderPosition
    delete this.state.contreePhase
    this.touch()
  }

  private startDeal(): void {
    if (this.state.variant === 'CLASSIQUE') {
      this.dealClassique()
    } else {
      this.dealAuction()
    }
  }

  private dealClassique(): void {
    this.dealIndex++
    this.state.dealLogId = `deal-${this.dealIndex}`
    let deck = shuffleBeloteDeck(createBeloteDeck(), this.gameId, this.dealIndex)
    for (const p of this.state.players) {
      p.hand = deck.splice(0, 5)
    }
    this.state.deal.turnedCard = deck.pop()
    this.remainingDeck = deck
    this.state.bids = []
    this.state.phase = 'CLASSIQUE_TAKE'
    this.state.biddingTurnPosition = nextPosition(this.state.deal.dealerPosition)
    this.touch()
  }

  private completeClassiqueDeal(takerPos: number, fromTake: boolean): void {
    const turned = this.state.deal.turnedCard
    const taker = this.state.players.find((p) => p.position === takerPos)!
    if (fromTake && turned) {
      taker.hand.push(turned)
      delete this.state.deal.turnedCard
    }
    for (const p of this.state.players) {
      const extra = p.position === takerPos && fromTake ? 2 : 3
      p.hand.push(...this.remainingDeck.splice(0, extra))
    }
    this.remainingDeck = []
  }

  private dealAuction(): void {
    this.dealIndex++
    this.state.dealLogId = `deal-${this.dealIndex}`
    let deck = shuffleBeloteDeck(createBeloteDeck(), this.gameId, this.dealIndex)
    for (const p of this.state.players) {
      p.hand = deck.splice(0, 8)
    }
    this.remainingDeck = []
    this.state.bids = []
    this.state.phase = 'BIDDING'
    this.state.biddingTurnPosition = nextPosition(this.state.deal.dealerPosition)
    this.touch()
  }

  private touch(): void {
    this.state.lastActionAt = new Date().toISOString()
    if (
      this.state.phase === 'CLASSIQUE_TAKE' ||
      this.state.phase === 'CLASSIQUE_CHOOSE' ||
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
