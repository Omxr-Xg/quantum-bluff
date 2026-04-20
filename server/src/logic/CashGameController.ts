/**
 * Contrôleur pour le jeu de poker en continu (cash game).
 * Gère les sièges, la rotation du bouton, le compte à rebours entre les mains,
 * et les commandes sit / leave / rebuy.
 */
import { randomUUID } from 'node:crypto'
import type { GameState, Player } from '../types/poker.js'
import { GameTable } from './GameTable.js'
import { intChips } from '../utils/chips.js'

const DEFAULT_BUY_IN = 100
const DEFAULT_SMALL_BLIND = 1
const DEFAULT_BIG_BLIND = 2
/** Tour multi : 30 s par défaut, 10 s en mode turbo */
export const DEFAULT_TURN_TIMEOUT_MS = 30_000
export const TURBO_TURN_TIMEOUT_MS = 10_000

export interface CashSeat {
  seatIndex: number
  userId: string | null
  username: string | null
  chips: number
  /** URL d’avatar (client), diffusée aux autres joueurs. */
  avatarUrl?: string | null
}

/** Stacks finales des joueurs encore liés à la main, pour sync DB post-showdown. */
export interface CashBalanceSnapshot {
  userId: string
  chips: number
}

export interface CashGameControllerOptions {
  id: string
  roomId: string
  maxSeats?: number
  smallBlind?: number
  bigBlind?: number
  defaultBuyIn?: number
  /** Durée max d’un tour (ms), ex. turbo = 10_000 */
  turnTimeoutMs?: number
}

/** Interface compatible avec GameTable pour activeGames */
export interface IGameSession {
  id: string
  state: GameState & { cashCountdownEndsAt?: number; cashSeats?: CashSeat[] }
  getSanitizedState: (requestingPlayerId?: string) => GameState & { cashCountdownEndsAt?: number; cashSeats?: CashSeat[] }
  handlePlayerAction: (playerId: string, action: 'FOLD' | 'CALL' | 'RAISE' | 'CHECK', amount?: number) => void
  getPlayerState: (playerId: string) => Player | undefined
}

export class CashGameController implements IGameSession {
  public readonly id: string
  public readonly roomId: string
  private readonly maxSeats: number
  private readonly smallBlind: number
  private readonly bigBlind: number
  private readonly defaultBuyIn: number
  private readonly turnTimeoutMs: number
  private seats: CashSeat[]
  private buttonSeatIndex: number
  private gameTable: GameTable | null = null
  private countdownEndsAt: number | null = null
  private countdownTimer: ReturnType<typeof setTimeout> | null = null
  private handNumber: number = 0
  private onCountdownDone?: () => void
  private runtimePhase:
    | 'HAND_IN_PROGRESS'
    | 'WAITING_READY'
    | 'NEXT_HAND_COUNTDOWN'
    | 'WAITING_PLAYERS' = 'WAITING_PLAYERS'
  /** Spectateurs qui veulent rejoindre à la prochaine manche */
  private spectatorRejoinQueue: Set<string> = new Set()
  /** Siège libéré à la fin de la main après quit volontaire en cours de partie */
  private pendingQuitUserIds: Set<string> = new Set()
  /** Joueur entré depuis la file spectateur : BB sur la prochaine main */
  private nextHandBigBlindUserId: string | null = null
  /** Identifiant stable pour les paris cachés ciblant la prochaine main (entre deux mains). */
  private pendingNextHandId: string | null = null
  /** Ready prochain tour (entre deux mains). */
  private nextHandReadyUserIds: Set<string> = new Set()
  private liveBetTimer: ReturnType<typeof setTimeout> | null = null
  private onLiveBetWindowClosed?: () => void
  private readonly debugRuntimeLogsEnabled: boolean =
    process.env.POKER_RUNTIME_DEBUG_LOGS === '1'

  /** Enregistré par la gateway pour diffuser l’état après fermeture fenêtre live. */
  setOnLiveBetWindowClosed(cb: () => void): void {
    this.onLiveBetWindowClosed = cb
  }

  getNextHandReadyUserIds(): string[] {
    return Array.from(this.nextHandReadyUserIds)
  }

  isAllNextHandPlayersReady(): boolean {
    const occupied = this.getOccupiedSeats().filter((s) => s.userId && s.chips > 0)
    if (occupied.length < 2) return false
    return occupied.every((s) => s.userId && this.nextHandReadyUserIds.has(s.userId))
  }

  /**
   * Ready prochain tour : uniquement entre deux mains.
   * Retourne l'état agrégé pour la diffusion côté gateway.
   */
  setNextHandReady(userId: string, ready: boolean): { allReady: boolean; readyUserIds: string[] } {
    if (this.gameTable != null) {
      return { allReady: false, readyUserIds: this.getNextHandReadyUserIds() }
    }

    const seat = this.seats.find((s) => s.userId === userId)
    if (!seat || seat.chips <= 0) {
      return { allReady: false, readyUserIds: this.getNextHandReadyUserIds() }
    }

    if (ready) this.nextHandReadyUserIds.add(userId)
    else this.nextHandReadyUserIds.delete(userId)

    return { allReady: this.isAllNextHandPlayersReady(), readyUserIds: this.getNextHandReadyUserIds() }
  }

  private clearLiveBetTimer(): void {
    if (this.liveBetTimer) {
      clearTimeout(this.liveBetTimer)
      this.liveBetTimer = null
    }
  }

  private scheduleLiveBetAfterAction(): void {
    this.clearLiveBetTimer()
    const gt = this.gameTable
    const lw = gt?.state.hiddenBetLiveWindow
    if (!lw) return
    const delay = Math.max(0, lw.closesAt - Date.now())
    this.liveBetTimer = setTimeout(() => {
      this.liveBetTimer = null
      if (!this.gameTable) return
      this.gameTable.resumeAfterHiddenBetLiveWindow()
      this.onLiveBetWindowClosed?.()
    }, delay)
  }

  private buildHiddenBetState(): NonNullable<import('../types/poker.js').GameState['hiddenBetState']> {
    this.syncHiddenBetNextHandId()
    if (!this.gameTable) {
      const open = this.isHiddenBetWindowOpen()
      // On garde `windowType: PRE_HAND` tant qu'il existe un next hand potentiel,
      // même si `windowOpen` est false (ex: pendant le countdown 5s).
      const windowType: 'PRE_HAND' | null = this.pendingNextHandId ? 'PRE_HAND' : null
      return {
        currentHandId: null,
        nextHandId: this.pendingNextHandId ?? null,
        windowOpen: open,
        windowType,
        closesAt: undefined,
      }
    }
    const st = this.gameTable.state
    const windowType =
      st.phase === 'FLOP'
        ? 'LIVE_FLOP'
        : st.phase === 'TURN'
          ? 'LIVE_TURN'
          : st.phase === 'RIVER'
            ? 'LIVE_RIVER'
            : null

    return {
      currentHandId: st.handId ?? null,
      nextHandId: null,
      windowOpen: windowType != null,
      windowType,
      closesAt: undefined,
    }
  }

  constructor(options: CashGameControllerOptions) {
    this.id = options.id
    this.roomId = options.roomId
    this.maxSeats = options.maxSeats ?? 9
    this.smallBlind = options.smallBlind ?? DEFAULT_SMALL_BLIND
    this.bigBlind = options.bigBlind ?? DEFAULT_BIG_BLIND
    this.defaultBuyIn = options.defaultBuyIn ?? DEFAULT_BUY_IN
    this.turnTimeoutMs =
      typeof options.turnTimeoutMs === 'number' && options.turnTimeoutMs >= 3000 && options.turnTimeoutMs <= 120_000
        ? options.turnTimeoutMs
        : DEFAULT_TURN_TIMEOUT_MS
    this.seats = Array.from({ length: this.maxSeats }, (_, i) => ({
      seatIndex: i,
      userId: null,
      username: null,
      chips: 0
    }))
    this.buttonSeatIndex = 0
  }

  /** Initialiser avec des joueurs (depuis la salle d'attente) */
  initFromRoomPlayers(players: { userId: string; username: string; chips?: number; avatarUrl?: string | null }[]): void {
    for (let i = 0; i < players.length && i < this.maxSeats; i++) {
      const p = players[i]
      this.seats[i] = {
        seatIndex: i,
        userId: p.userId,
        username: p.username,
        chips: p.chips ?? this.defaultBuyIn,
        avatarUrl: p.avatarUrl ?? null
      }
    }
  }

  /**
   * Met à jour l’URL d’avatar d’un siège (join socket, sit, etc.) et la main courante si elle existe.
   */
  setSeatAvatar(userId: string, avatarUrl: string | null): void {
    const seat = this.seats.find((s) => s.userId === userId)
    if (!seat) return
    seat.avatarUrl = avatarUrl
    if (this.gameTable) {
      const pl = this.gameTable.state.players.find((p) => p.id === userId)
      if (pl) {
        if (avatarUrl) pl.avatar = avatarUrl
        else delete pl.avatar
      }
    }
  }

  setOnCountdownDone(cb: () => void): void {
    this.onCountdownDone = cb
  }

  private logRuntimeEvent(event: 'HAND_START' | 'PLAYER_ACTION' | 'STREET_ADVANCE' | 'HAND_END', extra?: Record<string, unknown>): void {
    if (!this.debugRuntimeLogsEnabled || !this.gameTable) return
    const state = this.gameTable.state
    const dealer = state.players.find((p) => p.isDealer)
    const smallBlind = state.players.find((p) => p.role === 'SMALL_BLIND')
    const bigBlind = state.players.find((p) => p.role === 'BIG_BLIND')
    const foldedPlayerIds = state.players.filter((p) => !p.isActive).map((p) => p.id)
    const showdownEligiblePlayerIds = state.players
      .filter((p) => p.isActive && (state.handParticipantIds ?? []).includes(p.id))
      .map((p) => p.id)

    console.log(
      '[POKER_RUNTIME_DEBUG]',
      JSON.stringify({
        event,
        gameId: this.id,
        handId: state.handId,
        phase: state.phase,
        handRuntimePhase: state.handRuntimePhase,
        dealerId: dealer?.id ?? null,
        smallBlindId: smallBlind?.id ?? null,
        bigBlindId: bigBlind?.id ?? null,
        currentTurn: state.currentTurn ?? null,
        handParticipantIds: state.handParticipantIds ?? [],
        foldedPlayerIds,
        showdownEligiblePlayerIds,
        handEndReason: state.handEndReason ?? null,
        ...extra,
      })
    )
  }

  getTurnTimeoutMs(): number {
    return this.turnTimeoutMs
  }

  getOccupiedSeats(): CashSeat[] {
    return this.seats.filter((s) => s.userId != null)
  }

  getOccupiedCount(): number {
    return this.seats.filter((s) => s.userId != null).length
  }

  getConnectedCount(): number {
    return this.getOccupiedCount() // simplification: tous les sièges occupés = connectés
  }

  private getNextOccupiedSeatIndex(fromIndex: number): number {
    for (let i = 1; i <= this.maxSeats; i++) {
      const idx = (fromIndex + i) % this.maxSeats
      if (this.seats[idx].userId != null) return idx
    }
    return fromIndex
  }

  private buildPlayersFromSeats(buttonFirst: boolean): Player[] {
    const occupied = this.seats
      .map((s, idx) => ({ ...s, originalIndex: idx }))
      .filter((s) => s.userId != null) as (CashSeat & { originalIndex: number })[]

    if (buttonFirst) {
      const start = this.buttonSeatIndex
      const order: (CashSeat & { originalIndex: number })[] = []
      for (let i = 0; i < this.maxSeats; i++) {
        const idx = (start + i) % this.maxSeats
        const s = occupied.find((o) => o.originalIndex === idx)
        if (s) order.push(s)
      }
      return order.map((s, pos) => ({
        id: s.userId!,
        name: s.username!,
        cards: [],
        chips: s.chips,
        role: 'PLAYER' as const,
        isActive: true,
        position: pos,
        isDealer: false,
        isConnected: true,
        ...(s.avatarUrl ? { avatar: s.avatarUrl } : {})
      }))
    }

    return occupied.map((s, pos) => ({
      id: s.userId!,
      name: s.username!,
      cards: [],
      chips: s.chips,
      role: 'PLAYER' as const,
      isActive: true,
      position: pos,
      isDealer: false,
      isConnected: true,
      ...(s.avatarUrl ? { avatar: s.avatarUrl } : {})
    }))
  }

  /** Démarrer une nouvelle main */
  startHand(): void {
    this.clearLiveBetTimer()
    this.nextHandReadyUserIds.clear()
    this.countdownEndsAt = null
    if (this.countdownTimer) clearTimeout(this.countdownTimer)
    this.countdownTimer = null
    const occupied = this.getOccupiedSeats().filter((s) => s.chips > 0)
    if (occupied.length < 2) {
      this.gameTable = null
      this.runtimePhase = 'WAITING_PLAYERS'
      return
    }

    const players = this.buildPlayersFromSeats(true)
    const liveBetWindowMs = this.turnTimeoutMs <= TURBO_TURN_TIMEOUT_MS ? 3000 : 5000
    this.gameTable = new GameTable(this.id, players, {
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
      liveBetWindowMs,
    })
    const forcedBb = this.nextHandBigBlindUserId
    this.nextHandBigBlindUserId = null
    const handIdToUse = this.pendingNextHandId ?? randomUUID()
    this.pendingNextHandId = null
    this.gameTable.startHand({
      ...(forcedBb ? { forcedBigBlindUserId: forcedBb } : {}),
      handId: handIdToUse
    })
    console.log('[CASH][HAND] started', {
  gameId: this.id,
  roomId: this.roomId,
  handId: this.gameTable.state.handId,
  phase: this.gameTable.state.phase,
  currentTurn: this.gameTable.state.currentTurn,
  nextHandBigBlindUserId: forcedBb,
})
    this.handNumber++
    this.runtimePhase = 'HAND_IN_PROGRESS'
    this.logRuntimeEvent('HAND_START')
  }

  /** Appelé après le showdown: synchronise les jetons, supprime les éliminés, déclenche le countdown */
  onHandComplete(): CashBalanceSnapshot[] {
    if (!this.gameTable) return []
    this.clearLiveBetTimer()

    const state = this.gameTable.state
    const balanceSnapshot: CashBalanceSnapshot[] = state.players.map((p) => ({
      userId: p.id,
      chips: p.chips,
    }))
    for (const p of state.players) {
      const seat = this.seats.find((s) => s.userId === p.id)
      if (seat) seat.chips = p.chips
    }

    // Éliminés (chips=0) ou déconnectés libèrent leur siège
    for (const s of this.seats) {
      if (s.userId != null && s.chips === 0) {
        s.userId = null
        s.username = null
        s.chips = 0
        s.avatarUrl = null
      }
    }
    for (const p of state.players) {
      if (!p.isConnected) {
        const seat = this.seats.find((s) => s.userId === p.id)
        if (seat) {
          seat.userId = null
          seat.username = null
          seat.chips = 0
          seat.avatarUrl = null
        }
      }
    }

    for (const uid of this.pendingQuitUserIds) {
      const seat = this.seats.find((s) => s.userId === uid)
      if (seat) {
        seat.userId = null
        seat.username = null
        seat.chips = 0
        seat.avatarUrl = null
      }
    }
    this.pendingQuitUserIds.clear()

    // Rotation du bouton vers le prochain siège occupé (entre les mains uniquement).
    // Vigilance : joueurs éliminés/déconnectés ont déjà libéré leur siège ci-dessus.
    // Les joueurs qui reviennent (SIT ou reconnexion) seront dans la rotation future.
    this.buttonSeatIndex = this.getNextOccupiedSeatIndex(this.buttonSeatIndex)

    this.gameTable = null
    this.pendingNextHandId = randomUUID()
    this.countdownEndsAt = null
    if (this.countdownTimer) clearTimeout(this.countdownTimer)
    this.countdownTimer = null
    this.runtimePhase = 'WAITING_READY'
    this.nextHandReadyUserIds.clear()
    return balanceSnapshot
  }

  /**
   * Lance un compte à rebours (inter-mains) avant le démarrage de la prochaine main.
   * Pendant ce temps, on ferme les paris cachés pour le next hand.
   */
  beginNextHandCountdown(countdownMs: number): void {
    if (this.gameTable != null) return
    if (countdownMs < 500) return
    if (this.runtimePhase === 'NEXT_HAND_COUNTDOWN') return
    if (this.countdownTimer) clearTimeout(this.countdownTimer)

    this.countdownEndsAt = Date.now() + countdownMs
    this.runtimePhase = 'NEXT_HAND_COUNTDOWN'

    this.countdownTimer = setTimeout(() => {
      this.countdownTimer = null
      this.countdownEndsAt = null
      this.startHand()
      this.onCountdownDone?.()
    }, countdownMs)
  }

  /** S'asseoir à un siège (entre les mains uniquement) */
  sit(userId: string, username: string, seatIndex: number, buyIn: number, avatarUrl?: string | null): { ok: boolean; error?: string } {
    if (this.gameTable != null) return { ok: false, error: 'Une main est en cours' }
    if (seatIndex < 0 || seatIndex >= this.maxSeats) return { ok: false, error: 'Siège invalide' }
    if (this.seats[seatIndex].userId != null) return { ok: false, error: 'Siège occupé' }
    const amount = intChips(Math.max(this.defaultBuyIn, Math.min(buyIn, 10000)))
    this.seats[seatIndex] = { seatIndex, userId, username, chips: amount, avatarUrl: avatarUrl ?? null }
    return { ok: true }
  }

  /** Retirer un joueur déconnecté de son siège (entre les mains uniquement) */
  removeDisconnectedPlayer(userId: string): boolean {
    if (this.gameTable != null) return false
    const seat = this.seats.find((s) => s.userId === userId)
    if (!seat) return false
    seat.userId = null
    seat.username = null
    seat.chips = 0
    seat.avatarUrl = null
    this.nextHandReadyUserIds.delete(userId)
    return true
  }

  /** Annule le compte à rebours entre deux mains (timer + date de fin). */
  cancelInterHandCountdown(): void {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer)
      this.countdownTimer = null
    }
    this.countdownEndsAt = null
    if (this.runtimePhase === 'WAITING_READY' || this.runtimePhase === 'NEXT_HAND_COUNTDOWN') this.runtimePhase = 'WAITING_PLAYERS'
    this.nextHandReadyUserIds.clear()
  }

  /**
   * Quit volontaire pendant une main : fold forcé, siège libéré à la fin de la main.
   */
  quitVoluntaryDuringHand(userId: string): { ok: true; showdown: boolean } | { ok: false; error: string } {
    if (!this.gameTable) {
      return { ok: false, error: 'Aucune main en cours' }
    }
    const seat = this.seats.find((s) => s.userId === userId)
    if (!seat) {
      return { ok: false, error: 'Vous n\'êtes pas assis' }
    }
    try {
      this.pendingQuitUserIds.add(userId)
      this.gameTable.forceFoldQuit(userId)
      for (const p of this.gameTable.state.players) {
        const s = this.seats.find((s) => s.userId === p.id)
        if (s) s.chips = p.chips
      }
      return { ok: true, showdown: this.gameTable.state.phase === 'SHOWDOWN' }
    } catch (e) {
      this.pendingQuitUserIds.delete(userId)
      return { ok: false, error: (e as Error).message ?? String(e) }
    }
  }

  /** Se lever (entre les mains uniquement) */
  leave(userId: string): { ok: boolean; error?: string } {
    if (this.gameTable != null) return { ok: false, error: 'Une main est en cours' }
    const seat = this.seats.find((s) => s.userId === userId)
    if (!seat) return { ok: false, error: 'Vous n\'êtes pas assis' }
    seat.userId = null
    seat.username = null
    seat.chips = 0
    seat.avatarUrl = null
    this.nextHandReadyUserIds.delete(userId)
    return { ok: true }
  }

  /** Racheter des jetons (entre les mains uniquement) */
  rebuy(userId: string, amount: number): { ok: boolean; error?: string } {
    if (this.gameTable != null) return { ok: false, error: 'Une main est en cours' }
    const seat = this.seats.find((s) => s.userId === userId)
    if (!seat) return { ok: false, error: 'Vous n\'êtes pas assis' }
    const add = intChips(Math.max(10, Math.min(amount, 5000)))
    seat.chips += add
    return { ok: true }
  }

  get state(): GameState & { cashCountdownEndsAt?: number; cashSeats?: CashSeat[] } {
    if (this.gameTable) {
      const s = this.gameTable.state
      return {
        ...s,
        cashCountdownEndsAt: undefined,
        cashSeats: this.seats
      }
    }
    return {
      id: this.id,
      pot: 0,
      communityCards: [],
      players: this.getOccupiedSeats().map((s, i) => ({
        id: s.userId!,
        name: s.username!,
        cards: [],
        chips: s.chips,
        role: 'PLAYER' as const,
        currentBet: 0,
        isActive: false,
        position: i,
        isDealer: false,
        isConnected: true,
        ...(s.avatarUrl ? { avatar: s.avatarUrl } : {})
      })),
      currentTurn: '',
      phase: this.countdownEndsAt ? 'WAITING' : 'WAITING',
      handRuntimePhase: undefined,
      cashCountdownEndsAt: this.countdownEndsAt ?? undefined,
      cashSeats: this.seats
    }
  }

  /** Paris cachés : fenêtre ouverte entre deux mains avec au moins 2 joueurs ayant des jetons. */
  isHiddenBetWindowOpen(): boolean {
    if (this.gameTable) return false
    const occupied = this.getOccupiedSeats().filter((s) => s.userId && s.chips > 0)
    if (occupied.length < 2) return false
    return this.runtimePhase === 'WAITING_READY' || this.runtimePhase === 'WAITING_PLAYERS'
  }

  /** Garantit un nextHandId pour quote/place quand la fenêtre est ouverte. */
  private syncHiddenBetNextHandId(): void {
    if (this.gameTable) return
    const occupied = this.getOccupiedSeats().filter((s) => s.userId && s.chips > 0)
    if (occupied.length < 2) {
      this.pendingNextHandId = null
      return
    }
    if (!this.pendingNextHandId) this.pendingNextHandId = randomUUID()
  }

  getPendingNextHandId(): string | null {
    this.syncHiddenBetNextHandId()
    return this.pendingNextHandId
  }

  getSanitizedState(requestingPlayerId?: string): GameState & { cashCountdownEndsAt?: number; cashSeats?: CashSeat[]; spectatorRejoinQueue?: string[] } {
    this.syncHiddenBetNextHandId()
    const base = this.gameTable
      ? { ...this.gameTable.getSanitizedState(requestingPlayerId), cashCountdownEndsAt: undefined, cashSeats: this.seats }
      : { ...this.state, phase: this.countdownEndsAt ? 'WAITING' : 'WAITING' as const }
    const turnTimeLimitSec = Math.round(this.turnTimeoutMs / 1000)
    const cashCountdownRemainingSec =
      !this.gameTable && this.countdownEndsAt ? this.getCountdownSecondsRemaining() : undefined
    const hiddenBetState = this.buildHiddenBetState()
    return {
      ...base,
      turnTimeLimitSec,
      cashCountdownRemainingSec,
      spectatorRejoinQueue: Array.from(this.spectatorRejoinQueue),
      hiddenBetNextHandId: this.gameTable ? undefined : this.pendingNextHandId ?? undefined,
      hiddenBetCurrentHandId: this.gameTable?.state?.handId,
      hiddenBetWindowOpen: hiddenBetState.windowOpen,
      hiddenBetWindowClosesAt: hiddenBetState.closesAt,
      hiddenBetState,
    }
  }

  handlePlayerAction(playerId: string, action: 'FOLD' | 'CALL' | 'RAISE' | 'CHECK', amount?: number): void {
    console.log('[CASH][ACTION] controller_received', {
  gameId: this.id,
  roomId: this.roomId,
  playerId,
  action,
  amount,
  hasGameTable: Boolean(this.gameTable),
  runtimePhase: this.runtimePhase,
})
    if (!this.gameTable) throw new Error('Aucune main en cours')
    const phaseBefore = this.gameTable.state.phase
    this.gameTable.handlePlayerAction(playerId, action, amount)
    console.log('[CASH][ACTION] controller_applied', {
  gameId: this.id,
  roomId: this.roomId,
  playerId,
  action,
  amount,
  phase: this.gameTable.state.phase,
  currentTurn: this.gameTable.state.currentTurn,
  handId: this.gameTable.state.handId,
  actionVersion: this.gameTable.state.actionVersion,
  streetVersion: this.gameTable.state.streetVersion,
})
    this.logRuntimeEvent('PLAYER_ACTION', {
      playerId,
      action,
      amount: amount ?? null,
    })
    if (this.gameTable.state.phase !== phaseBefore) {
      this.logRuntimeEvent('STREET_ADVANCE', {
        from: phaseBefore,
        to: this.gameTable.state.phase,
      })
    }
    if (this.gameTable.state.phase === 'SHOWDOWN') {
      this.logRuntimeEvent('HAND_END')
    }
  }

  getPlayerState(playerId: string): Player | undefined {
    return this.gameTable?.getPlayerState(playerId)
  }

  getMinRaise(): number {
    return this.gameTable?.getMinRaise() ?? this.bigBlind
  }

  getGameTable(): GameTable | null {
    return this.gameTable
  }

  calculateCallAmount(playerId: string): number {
    return this.gameTable?.calculateCallAmount(playerId) ?? 0
  }

  forceFoldForDisconnect(playerId: string): void {
    this.gameTable?.forceFoldForDisconnect(playerId)
  }

  endGameDueToDisconnect(): { winnerId: string; pot: number } | null {
    return null
  }

  isInHand(): boolean {
    return this.gameTable != null
  }

  getCountdownSecondsRemaining(): number {
    if (!this.countdownEndsAt) return 0
    const rem = Math.ceil((this.countdownEndsAt - Date.now()) / 1000)
    return Math.max(0, rem)
  }

  /** Spectateur : s'inscrire pour rejoindre à la prochaine manche */
  addSpectatorToRejoinQueue(userId: string): void {
    if (this.seats.some((s) => s.userId === userId)) return // déjà assis
    this.spectatorRejoinQueue.add(userId)
  }

  /** Spectateur : annuler l'inscription */
  removeSpectatorFromRejoinQueue(userId: string): void {
    this.spectatorRejoinQueue.delete(userId)
  }

  isInRejoinQueue(userId: string): boolean {
    return this.spectatorRejoinQueue.has(userId)
  }

  /** Appelé après onHandComplete quand le countdown démarre : place les spectateurs inscrits */
  async processRejoinQueue(getUser: (userId: string) => Promise<{ username: string; chips: number } | null>): Promise<void> {
    const toProcess = Array.from(this.spectatorRejoinQueue)
    this.spectatorRejoinQueue.clear()
    let firstSeated: string | null = null
    for (const userId of toProcess) {
      const user = await getUser(userId)
      if (!user) continue
      const free = this.seats.findIndex((s) => s.userId == null)
      if (free >= 0) {
        this.sit(userId, user.username, free, Math.max(this.defaultBuyIn, user.chips))
        if (!firstSeated) firstSeated = userId
      } else {
        this.spectatorRejoinQueue.add(userId) // pas de place, reste en file
      }
    }
    if (firstSeated) {
      this.nextHandBigBlindUserId = firstSeated
    }
  }
}
