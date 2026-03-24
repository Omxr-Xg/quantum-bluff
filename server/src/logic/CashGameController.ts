/**
 * Contrôleur pour le jeu de poker en continu (cash game).
 * Gère les sièges, la rotation du bouton, le compte à rebours entre les mains,
 * et les commandes sit / leave / rebuy.
 */
import type { GameState, Player } from '../types/poker.js'
import { GameTable } from './GameTable.js'
import { intChips } from '../utils/chips.js'

const DEFAULT_BUY_IN = 100
const COUNTDOWN_SECONDS = 10
const DEFAULT_SMALL_BLIND = 1
const DEFAULT_BIG_BLIND = 2

export interface CashSeat {
  seatIndex: number
  userId: string | null
  username: string | null
  chips: number
}

export interface CashGameControllerOptions {
  id: string
  roomId: string
  maxSeats?: number
  smallBlind?: number
  bigBlind?: number
  defaultBuyIn?: number
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
  private seats: CashSeat[]
  private buttonSeatIndex: number
  private gameTable: GameTable | null = null
  private countdownEndsAt: number | null = null
  private countdownTimer: ReturnType<typeof setTimeout> | null = null
  private handNumber: number = 0
  private onCountdownDone?: () => void
  /** Spectateurs qui veulent rejoindre à la prochaine manche */
  private spectatorRejoinQueue: Set<string> = new Set()

  constructor(options: CashGameControllerOptions) {
    this.id = options.id
    this.roomId = options.roomId
    this.maxSeats = options.maxSeats ?? 9
    this.smallBlind = options.smallBlind ?? DEFAULT_SMALL_BLIND
    this.bigBlind = options.bigBlind ?? DEFAULT_BIG_BLIND
    this.defaultBuyIn = options.defaultBuyIn ?? DEFAULT_BUY_IN
    this.seats = Array.from({ length: this.maxSeats }, (_, i) => ({
      seatIndex: i,
      userId: null,
      username: null,
      chips: 0
    }))
    this.buttonSeatIndex = 0
  }

  /** Initialiser avec des joueurs (depuis la salle d'attente) */
  initFromRoomPlayers(players: { userId: string; username: string; chips?: number }[]): void {
    for (let i = 0; i < players.length && i < this.maxSeats; i++) {
      const p = players[i]
      this.seats[i] = {
        seatIndex: i,
        userId: p.userId,
        username: p.username,
        chips: p.chips ?? this.defaultBuyIn
      }
    }
  }

  setOnCountdownDone(cb: () => void): void {
    this.onCountdownDone = cb
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
        isConnected: true
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
      isConnected: true
    }))
  }

  /** Démarrer une nouvelle main */
  startHand(): void {
    const occupied = this.getOccupiedSeats().filter((s) => s.chips > 0)
    if (occupied.length < 2) {
      this.countdownEndsAt = null
      this.gameTable = null
      return
    }

    const players = this.buildPlayersFromSeats(true)
    this.gameTable = new GameTable(this.id, players, {
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind
    })
    this.gameTable.startHand()
    this.handNumber++
  }

  /** Appelé après le showdown: synchronise les jetons, supprime les éliminés, déclenche le countdown */
  onHandComplete(): void {
    if (!this.gameTable) return

    const state = this.gameTable.state
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
      }
    }
    for (const p of state.players) {
      if (!p.isConnected) {
        const seat = this.seats.find((s) => s.userId === p.id)
        if (seat) {
          seat.userId = null
          seat.username = null
          seat.chips = 0
        }
      }
    }

    // Rotation du bouton vers le prochain siège occupé (entre les mains uniquement).
    // Vigilance : joueurs éliminés/déconnectés ont déjà libéré leur siège ci-dessus.
    // Les joueurs qui reviennent (SIT ou reconnexion) seront dans la rotation future.
    this.buttonSeatIndex = this.getNextOccupiedSeatIndex(this.buttonSeatIndex)

    this.gameTable = null
    this.countdownEndsAt = Date.now() + COUNTDOWN_SECONDS * 1000

    if (this.countdownTimer) clearTimeout(this.countdownTimer)
    this.countdownTimer = setTimeout(() => {
      this.countdownTimer = null
      this.countdownEndsAt = null
      this.onCountdownDone?.()
    }, COUNTDOWN_SECONDS * 1000)
  }

  /** S'asseoir à un siège (entre les mains uniquement) */
  sit(userId: string, username: string, seatIndex: number, buyIn: number): { ok: boolean; error?: string } {
    if (this.gameTable != null) return { ok: false, error: 'Une main est en cours' }
    if (seatIndex < 0 || seatIndex >= this.maxSeats) return { ok: false, error: 'Siège invalide' }
    if (this.seats[seatIndex].userId != null) return { ok: false, error: 'Siège occupé' }
    const amount = intChips(Math.max(this.defaultBuyIn, Math.min(buyIn, 10000)))
    this.seats[seatIndex] = { seatIndex, userId, username, chips: amount }
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
    return true
  }

  /** Se lever (entre les mains uniquement) */
  leave(userId: string): { ok: boolean; error?: string } {
    if (this.gameTable != null) return { ok: false, error: 'Une main est en cours' }
    const seat = this.seats.find((s) => s.userId === userId)
    if (!seat) return { ok: false, error: 'Vous n\'êtes pas assis' }
    seat.userId = null
    seat.username = null
    seat.chips = 0
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
        isConnected: true
      })),
      currentTurn: '',
      phase: this.countdownEndsAt ? 'WAITING' : 'WAITING',
      cashCountdownEndsAt: this.countdownEndsAt ?? undefined,
      cashSeats: this.seats
    }
  }

  getSanitizedState(requestingPlayerId?: string): GameState & { cashCountdownEndsAt?: number; cashSeats?: CashSeat[]; spectatorRejoinQueue?: string[] } {
    const base = this.gameTable
      ? { ...this.gameTable.getSanitizedState(requestingPlayerId), cashCountdownEndsAt: undefined, cashSeats: this.seats }
      : { ...this.state, phase: this.countdownEndsAt ? 'WAITING' : 'WAITING' as const }
    return {
      ...base,
      spectatorRejoinQueue: Array.from(this.spectatorRejoinQueue)
    }
  }

  handlePlayerAction(playerId: string, action: 'FOLD' | 'CALL' | 'RAISE' | 'CHECK', amount?: number): void {
    if (!this.gameTable) throw new Error('Aucune main en cours')
    this.gameTable.handlePlayerAction(playerId, action, amount)
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
    for (const userId of toProcess) {
      const user = await getUser(userId)
      if (!user) continue
      const free = this.seats.findIndex((s) => s.userId == null)
      if (free >= 0) {
        this.sit(userId, user.username, free, Math.max(this.defaultBuyIn, user.chips))
      } else {
        this.spectatorRejoinQueue.add(userId) // pas de place, reste en file
      }
    }
  }
}
