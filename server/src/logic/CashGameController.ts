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

/** Résultat de fin de main : stacks à jour + retraits siège (cash-out) à créditer en portefeuille. */
export interface CashHandCompleteResult {
  playerStacks: CashBalanceSnapshot[]
  seatCashOuts: { userId: string; chips: number }[]
}

export type CashWalletLedgerMode = 'cash' | 'none'

export interface CashGameControllerOptions {
  id: string
  roomId: string
  maxSeats?: number
  smallBlind?: number
  bigBlind?: number
  defaultBuyIn?: number
  /** Durée max d’un tour (ms), ex. turbo = 10_000 */
  turnTimeoutMs?: number
  /**
   * `none` : stacks virtuels, pas de sync `User.chips` sur la table (tournoi).
   * `cash` : comportement historique salle d’attente.
   */
  walletLedger?: CashWalletLedgerMode
  /**
   * Entre deux mains, si exactement un joueur a des jetons, ne pas relancer de main
   * (fin de « match » élimination directe). La gateway notifie le tournoi.
   */
  stopWhenSingleSurvivor?: boolean
}

/** Interface compatible avec GameTable pour activeGames */
export interface IGameSession {
  id: string
  state: GameState & { cashCountdownEndsAt?: number; cashSeats?: CashSeat[] }
  getSanitizedState: (
    requestingPlayerId?: string,
    forSpectator?: boolean,
  ) => GameState & { cashCountdownEndsAt?: number; cashSeats?: CashSeat[] }
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
  private readonly walletLedger: CashWalletLedgerMode
  private readonly stopWhenSingleSurvivor: boolean
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
  /** Jetons en début de main courante (siège), par userId — pour delta portefeuille / ledger. */
  private lastHandStartingChipsByUserId: Map<string, number> = new Map()
  /** Bump après fin de main / démarrage main : snapshots entre deux mains ont une clé client unique. */
  private snapshotSeq = 0

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
    this.walletLedger = options.walletLedger === 'none' ? 'none' : 'cash'
    this.stopWhenSingleSurvivor = Boolean(options.stopWhenSingleSurvivor)
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
    const foldedPlayerIds = state.players
      .filter((p) => p.hasFoldedThisHand === true)
      .map((p) => p.id)
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

  getWalletLedger(): CashWalletLedgerMode {
    return this.walletLedger
  }

  getStopWhenSingleSurvivor(): boolean {
    return this.stopWhenSingleSurvivor
  }

  /**
   * Sièges occupés avec jetons > 0 (hors main : après `onHandComplete`).
   */
  getSurvivorsWithChips(): { userId: string; chips: number }[] {
    return this.getOccupiedSeats()
      .filter((s) => s.userId != null && intChips(s.chips) > 0)
      .map((s) => ({ userId: s.userId!, chips: intChips(s.chips) }))
  }

  /**
   * Tournoi : enchaîne la main suivante sans attendre `CASH_NEXT_HAND_READY`.
   */
  startNextHandIfMultiSurvivors(): boolean {
    if (this.walletLedger !== 'none') return false
    if (this.gameTable != null) return false
    const alive = this.getSurvivorsWithChips()
    if (alive.length >= 2) {
      this.startHand()
      return true
    }
    return false
  }

  /** Buy-in effectif (plancher salle / plafond 10k), aligné sur `sit`. */
  effectiveSitBuyInAmount(requestedBuyIn: number): number {
    return intChips(Math.max(this.defaultBuyIn, Math.min(requestedBuyIn, 10000)))
  }

  /** Retire un joueur du siège sans crédit portefeuille (rollback si échec persistance BDD). */
  forceClearSeatForUser(userId: string): void {
    const seat = this.seats.find((s) => s.userId === userId)
    if (!seat) return
    seat.userId = null
    seat.username = null
    seat.chips = 0
    seat.avatarUrl = null
    this.nextHandReadyUserIds.delete(userId)
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
      this.snapshotSeq += 1
      return
    }

    this.lastHandStartingChipsByUserId = new Map()
    for (const s of occupied) {
      if (s.userId) this.lastHandStartingChipsByUserId.set(s.userId, intChips(s.chips))
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
    this.snapshotSeq += 1
    this.logRuntimeEvent('HAND_START')
  }

  /** Stacks en début de la main qui vient de se terminer (avant `onHandComplete`). */
  getLastHandStartingStacks(): ReadonlyMap<string, number> {
    return this.lastHandStartingChipsByUserId
  }

  /** Ajuste les jetons siège (ex. après remboursement prêt sur gains). */
  adjustSeatChips(userId: string, delta: number): void {
    const d = intChips(delta)
    if (d === 0) return
    const seat = this.seats.find((s) => s.userId === userId)
    if (!seat) return
    seat.chips = Math.max(0, intChips(seat.chips) + d)
  }

  /**
   * Stack tapis disponible pour financer un pari caché (main en cours ou entre deux mains).
   */
  getTableStackForHiddenBet(userId: string): number {
    if (this.gameTable) {
      const p = this.gameTable.state.players.find((x) => x.id === userId)
      return p ? intChips(p.chips) : 0
    }
    const seat = this.seats.find((s) => s.userId === userId)
    return seat ? intChips(seat.chips) : 0
  }

  /**
   * Retire des jetons du stack joueur pour un pari caché (le complément peut venir du portefeuille DB).
   */
  deductStackForHiddenBet(
    userId: string,
    amount: number,
  ): { ok: true } | { ok: false; error: string } {
    const a = intChips(amount)
    if (a <= 0) return { ok: true }
    if (this.gameTable) {
      const p = this.gameTable.state.players.find((x) => x.id === userId)
      if (!p) return { ok: false, error: 'Joueur absent de la main' }
      if (p.chips < a) return { ok: false, error: 'Stack tapis insuffisant pour ce pari' }
      p.chips = intChips(p.chips) - a
      const seat = this.seats.find((s) => s.userId === userId)
      if (seat) seat.chips = p.chips
      return { ok: true }
    }
    const seat = this.seats.find((s) => s.userId === userId)
    if (!seat) return { ok: false, error: 'Pas assis à cette table' }
    if (seat.chips < a) return { ok: false, error: 'Stack tapis insuffisant pour ce pari' }
    seat.chips = intChips(seat.chips) - a
    return { ok: true }
  }

  /** Annule `deductStackForHiddenBet` si la persistance DB du ticket échoue. */
  restoreStackForHiddenBet(userId: string, amount: number): void {
    const a = intChips(amount)
    if (a <= 0) return
    if (this.gameTable) {
      const p = this.gameTable.state.players.find((x) => x.id === userId)
      if (p) {
        p.chips = intChips(p.chips) + a
        const seat = this.seats.find((s) => s.userId === userId)
        if (seat) seat.chips = p.chips
      }
      return
    }
    const seat = this.seats.find((s) => s.userId === userId)
    if (seat) seat.chips = intChips(seat.chips) + a
  }

  /** Appelé après le showdown: synchronise les jetons, supprime les éliminés, déclenche le countdown */
  onHandComplete(): CashHandCompleteResult {
    if (!this.gameTable) return { playerStacks: [], seatCashOuts: [] }
    this.clearLiveBetTimer()

    const state = this.gameTable.state
    const balanceSnapshot: CashBalanceSnapshot[] = state.players.map((p) => ({
      userId: p.id,
      chips: p.chips,
    }))
    const seatCashOuts: { userId: string; chips: number }[] = []
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
        const out = intChips(seat.chips)
        if (out > 0) seatCashOuts.push({ userId: uid, chips: out })
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
    this.snapshotSeq += 1
    return { playerStacks: balanceSnapshot, seatCashOuts }
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

  /**
   * S'asseoir à un siège (entre les mains uniquement).
   * Si `walletChips` est fourni, le joueur doit avoir au moins le montant effectivement mis (`amount`).
   */
  sit(
    userId: string,
    username: string,
    seatIndex: number,
    buyIn: number,
    avatarUrl?: string | null,
    walletChips?: number
  ): { ok: boolean; error?: string } {
    if (this.gameTable != null) return { ok: false, error: 'Une main est en cours' }
    if (seatIndex < 0 || seatIndex >= this.maxSeats) return { ok: false, error: 'Siège invalide' }
    if (this.seats[seatIndex].userId != null) return { ok: false, error: 'Siège occupé' }
    const amount = intChips(Math.max(this.defaultBuyIn, Math.min(buyIn, 10000)))
    if (
      this.walletLedger === 'cash' &&
      typeof walletChips === 'number' &&
      intChips(walletChips) < amount
    ) {
      return {
        ok: false,
        error: `Solde insuffisant : il faut au moins ${amount} jetons pour s'asseoir (buy-in min. ${this.defaultBuyIn}).`,
      }
    }
    this.seats[seatIndex] = { seatIndex, userId, username, chips: amount, avatarUrl: avatarUrl ?? null }
    // Entre deux mains : chaque nouvel assis réinitialise les « prêt », sinon des joueurs déjà
    // cochés peuvent laisser croire côté client que la table est prête alors qu’un arrivant
    // (rejoin / siège libre) doit encore confirmer — ou l’inverse (UI bloquée).
    if (!this.gameTable) {
      this.nextHandReadyUserIds.clear()
    }
    return { ok: true }
  }

  /** Retirer un joueur déconnecté de son siège (entre les mains uniquement) */
  removeDisconnectedPlayer(userId: string): { ok: true; cashedOutChips: number } | { ok: false } {
    if (this.gameTable != null) return { ok: false }
    const seat = this.seats.find((s) => s.userId === userId)
    if (!seat) return { ok: false }
    const cashedOutChips = intChips(seat.chips)
    seat.userId = null
    seat.username = null
    seat.chips = 0
    seat.avatarUrl = null
    this.nextHandReadyUserIds.delete(userId)
    return { ok: true, cashedOutChips }
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
  leave(userId: string): { ok: true; cashedOutChips: number } | { ok: false; error: string } {
    if (this.gameTable != null) return { ok: false, error: 'Une main est en cours' }
    const seat = this.seats.find((s) => s.userId === userId)
    if (!seat) return { ok: false, error: 'Vous n\'êtes pas assis' }
    const cashedOutChips = intChips(seat.chips)
    seat.userId = null
    seat.username = null
    seat.chips = 0
    seat.avatarUrl = null
    this.nextHandReadyUserIds.delete(userId)
    return { ok: true, cashedOutChips }
  }

  /** Racheter des jetons (entre les mains uniquement) */
  rebuy(userId: string, amount: number, walletChips?: number): { ok: boolean; error?: string } {
    if (this.walletLedger === 'none') return { ok: false, error: 'Rebuy indisponible sur cette table' }
    if (this.gameTable != null) return { ok: false, error: 'Une main est en cours' }
    const seat = this.seats.find((s) => s.userId === userId)
    if (!seat) return { ok: false, error: 'Vous n\'êtes pas assis' }
    const add = intChips(Math.max(10, Math.min(amount, 5000)))
    if (typeof walletChips === 'number' && intChips(walletChips) < add) {
      return { ok: false, error: `Solde insuffisant pour ce rebuy (${add} jetons requis).` }
    }
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
    if (this.walletLedger === 'none') return false
    if (this.gameTable) return false
    const occupied = this.getOccupiedSeats().filter((s) => s.userId && s.chips > 0)
    if (occupied.length < 2) return false
    return this.runtimePhase === 'WAITING_READY' || this.runtimePhase === 'WAITING_PLAYERS'
  }

  /** Garantit un nextHandId pour quote/place quand la fenêtre est ouverte. */
  private syncHiddenBetNextHandId(): void {
    if (this.walletLedger === 'none') {
      this.pendingNextHandId = null
      return
    }
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

  getSanitizedState(
    requestingPlayerId?: string,
    forSpectator?: boolean,
  ): GameState & { cashCountdownEndsAt?: number; cashSeats?: CashSeat[]; spectatorRejoinQueue?: string[] } {
    this.syncHiddenBetNextHandId()
    const base = this.gameTable
      ? {
          ...this.gameTable.getSanitizedState(requestingPlayerId, forSpectator),
          cashCountdownEndsAt: undefined,
          cashSeats: this.seats,
        }
      : { ...this.state, phase: this.countdownEndsAt ? 'WAITING' : 'WAITING' as const }
    const turnTimeLimitSec = Math.round(this.turnTimeoutMs / 1000)
    const cashCountdownRemainingSec =
      !this.gameTable && this.countdownEndsAt ? this.getCountdownSecondsRemaining() : undefined
    const hiddenBetState = this.buildHiddenBetState()
    return {
      ...base,
      snapshotSeq: this.snapshotSeq,
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
    this.snapshotSeq += 1
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
  async processRejoinQueue(
    getUser: (userId: string) => Promise<{ username: string; chips: number } | null>
  ): Promise<{ userId: string; buyInAmount: number }[]> {
    const toProcess = Array.from(this.spectatorRejoinQueue)
    this.spectatorRejoinQueue.clear()
    let firstSeated: string | null = null
    const buyInsToPersist: { userId: string; buyInAmount: number }[] = []
    for (const userId of toProcess) {
      const user = await getUser(userId)
      if (!user) continue
      const wallet = intChips(user.chips)
      if (wallet < this.defaultBuyIn) {
        this.spectatorRejoinQueue.add(userId)
        continue
      }
      const free = this.seats.findIndex((s) => s.userId == null)
      if (free >= 0) {
        const buyIn = Math.min(wallet, 10_000)
        const r = this.sit(userId, user.username, free, buyIn, null, wallet)
        if (r.ok) {
          const amount = intChips(this.seats[free]?.chips ?? buyIn)
          buyInsToPersist.push({ userId, buyInAmount: amount })
          if (!firstSeated) firstSeated = userId
        } else {
          this.spectatorRejoinQueue.add(userId)
        }
      } else {
        this.spectatorRejoinQueue.add(userId) // pas de place, reste en file
      }
    }
    if (firstSeated) {
      this.nextHandBigBlindUserId = firstSeated
    }
    return buyInsToPersist
  }
}
