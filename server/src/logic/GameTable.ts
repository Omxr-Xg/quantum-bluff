import type { Card, GamePhase, GameState, Player } from '../types/poker.js'
import { Deck } from './Deck.js'
import { intChips } from '../utils/chips.js'
import { settlePots } from './poker/potSettlement.js'

type PlayerAction = 'FOLD' | 'CALL' | 'RAISE' | 'CHECK'

const RANK_VALUE: Record<string, number> = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14 }

export class GameTable {
  public readonly id: string
  private deck: Deck
  public state: GameState
  private dealerIndex: number
  private highestBet: number
  private actedPlayerIds: Set<string>
  private lastRaiserId: string | null
  private handStarted: boolean
  private readonly smallBlindAmount: number
  private readonly bigBlindAmount: number
  private minRaiseIncrement: number
  private handParticipantIds: Set<string>
  private readonly liveBetWindowMs: number
  /** Si true, pas de pause paris live (tests / outils). */
  private readonly liveBetWindowDisabled: boolean
  /** Premier joueur à agir après fermeture fenêtre paris live (entre streets). */
  private pendingFirstToActAfterLiveWindow: string | null = null

  constructor(
    id: string,
    players: Player[],
    options?: {
      smallBlind?: number
      bigBlind?: number
      liveBetWindowMs?: number
      /** Désactive les fenêtres gelées (comportement historique immédiat). */
      liveBetWindowDisabled?: boolean
    }
  ) {
    this.id = id
    this.deck = new Deck()
    this.dealerIndex = 0
    this.highestBet = 0
    this.actedPlayerIds = new Set()
    this.lastRaiserId = null
    this.handStarted = false
    this.smallBlindAmount = intChips(options?.smallBlind ?? 10)
    this.bigBlindAmount = intChips(options?.bigBlind ?? 20)
    this.minRaiseIncrement = this.bigBlindAmount
    this.handParticipantIds = new Set()
    this.liveBetWindowMs = typeof options?.liveBetWindowMs === 'number' && options.liveBetWindowMs >= 1000 ? options.liveBetWindowMs : 5000
    this.liveBetWindowDisabled = options?.liveBetWindowDisabled === true

    this.state = {
      id,
      pot: 0,
      communityCards: [],
      players,
      currentTurn: players[0]?.id || '',
      phase: 'PREFLOP',
      handId: '',
      actionVersion: 0,
      streetVersion: 0,
      updatedAt: new Date().toISOString(),
      handParticipantIds: [],
      handRuntimePhase: 'HAND_IN_PROGRESS',
    }

    this.normalizePlayers()
  }

  private normalizePlayers(): void {
    this.state.players.forEach((player, index) => {
      player.cards = Array.isArray(player.cards) ? player.cards : []
      player.currentBet = player.currentBet ?? 0
      player.isActive = player.isActive ?? true
      player.position = index
      player.isDealer = false
      player.isConnected = player.isConnected ?? true
      player.role = player.role ?? 'PLAYER'
    })
  }

  private getConnectedPlayers(): Player[] {
    return this.state.players.filter((player) => player.isConnected !== false)
  }

  private getActivePlayers(): Player[] {
    if (this.handStarted && this.handParticipantIds.size > 0) {
      return this.getNonFoldedParticipants().filter(
        (player) => player.isConnected !== false
      )
    }
    return this.state.players.filter(
      (player) => player.isActive && player.isConnected !== false
    )
  }

  private isHeadsUp(): boolean {
    return this.handParticipantIds.size === 2
  }

  private getHandParticipants(): Player[] {
    return this.state.players.filter((player) =>
      this.handParticipantIds.has(player.id)
    )
  }

  private getNonFoldedParticipants(): Player[] {
    return this.getHandParticipants().filter((player) => player.isActive)
  }

  private getShowdownEligiblePlayers(): Player[] {
    return this.getNonFoldedParticipants()
  }

  private computeHandEndReason():
    | 'WIN_BY_FOLD'
    | 'SHOWDOWN'
    | 'ALL_IN_RUNOUT'
    | null {
    const nonFoldedCount = this.getNonFoldedParticipants().length
    if (nonFoldedCount === 1) return 'WIN_BY_FOLD'
    if (this.getShowdownEligiblePlayers().length > 1) return 'SHOWDOWN'
    return null
  }

  private canCloseCurrentBettingRound(): boolean {
    return this.isBettingRoundComplete()
  }

  private getPlayerIndexById(playerId: string): number {
    return this.state.players.findIndex((player) => player.id === playerId)
  }

  private getNextEligiblePlayerIndex(startIndex: number): number {
    if (this.state.players.length === 0) return -1

    let index = startIndex

    for (let i = 0; i < this.state.players.length; i++) {
      index = (index + 1) % this.state.players.length
      const player = this.state.players[index]

      if (player.isActive && player.isConnected !== false && player.chips > 0) {
        return index
      }
    }

    return -1
  }

  /**
   * Trouve le prochain joueur vivant (chips > 0, connecté) dans le sens horaire.
   * Utilisé pour la rotation du bouton Dealer.
   * Vigilance : les joueurs qui reviennent (reconnexion, rachat) sont réintégrés
   * car on évalue l'état actuel (chips, isConnected) à chaque appel.
   */
  private getNextLivingPlayerIndex(startIndex: number): number {
    if (this.state.players.length === 0) return 0
    for (let i = 1; i <= this.state.players.length; i++) {
      const idx = (startIndex + i) % this.state.players.length
      const p = this.state.players[idx]
      if (p.isConnected !== false && p.chips > 0) return idx
    }
    return startIndex
  }

  /**
   * Attribue les rôles (Dealer, SB, BB) à partir de dealerIndex.
   * Heads-up : le dealer est aussi small blind (règle spécifique au tête-à-tête).
   * Cohérence : isDealer provient uniquement de dealerIndex → affichage du jeton "D".
   */
  private assignPositionsAndRoles(): void {
    this.state.players.forEach((player, index) => {
      player.position = index
      player.isDealer = false
      player.role = 'PLAYER'
      player.currentBet = 0
    })

    const connectedPlayers = this.getConnectedPlayers()
    if (connectedPlayers.length < 2 || this.state.players.length === 0) {
      return
    }

    const dealer = this.state.players[this.dealerIndex]
    dealer.isDealer = true

    if (this.isHeadsUp()) {
      dealer.role = 'SMALL_BLIND'

      const bigBlindIndex = this.getNextEligiblePlayerIndex(this.dealerIndex)
      if (bigBlindIndex !== -1) {
        this.state.players[bigBlindIndex].role = 'BIG_BLIND'
      }

      return
    }

    dealer.role = 'DEALER'

    const smallBlindIndex = this.getNextEligiblePlayerIndex(this.dealerIndex)
    if (smallBlindIndex !== -1) {
      this.state.players[smallBlindIndex].role = 'SMALL_BLIND'
    }

    const bigBlindIndex =
      smallBlindIndex !== -1
        ? this.getNextEligiblePlayerIndex(smallBlindIndex)
        : -1

    if (bigBlindIndex !== -1) {
      this.state.players[bigBlindIndex].role = 'BIG_BLIND'
    }
  }

  private postBlind(role: 'SMALL_BLIND' | 'BIG_BLIND', amount: number): void {
    const player = this.state.players.find((p) => p.role === role)
    if (!player) return

    const blindAmount = intChips(Math.min(amount, player.chips))
    player.chips -= blindAmount
    player.currentBet = blindAmount
    player.totalPutInThisHand = (player.totalPutInThisHand ?? 0) + blindAmount
    this.state.pot += blindAmount
    this.highestBet = Math.max(this.highestBet, blindAmount)
  }

  private setBlinds(): void {
    if (this.getConnectedPlayers().length < 2) return

    this.assignPositionsAndRoles()
    this.postBlind('SMALL_BLIND', this.smallBlindAmount)
    this.postBlind('BIG_BLIND', this.bigBlindAmount)
  }

  private getPreflopFirstPlayerId(): string {
    if (this.isHeadsUp()) {
      return this.state.players[this.dealerIndex]?.id || ''
    }

    const bigBlindIndex = this.state.players.findIndex(
      (player) => player.role === 'BIG_BLIND'
    )

    const firstIndex =
      bigBlindIndex === -1 ? 0 : this.getNextEligiblePlayerIndex(bigBlindIndex)

    return firstIndex === -1
      ? this.state.players[0]?.id || ''
      : this.state.players[firstIndex].id
  }

  private getPostflopFirstPlayerId(): string {
    if (this.isHeadsUp()) {
      const nonDealerIndex = this.getNextEligiblePlayerIndex(this.dealerIndex)
      if (nonDealerIndex !== -1) {
        return this.state.players[nonDealerIndex].id
      }
    }
    const firstIndex = this.getNextEligiblePlayerIndex(this.dealerIndex)
    return firstIndex === -1
      ? this.state.players[0]?.id || ''
      : this.state.players[firstIndex].id
  }

  private resetBetsForNewRound(): void {
    this.highestBet = 0
    this.lastRaiserId = null
    this.minRaiseIncrement = this.bigBlindAmount
    this.actedPlayerIds.clear()
    this.state.streetVersion = (this.state.streetVersion ?? 0) + 1

    for (const player of this.state.players) {
      player.currentBet = 0
      // totalPutInThisHand is kept for the whole hand (side pots)
    }
  }

  private isBettingRoundComplete(): boolean {
    const activePlayers = this.getNonFoldedParticipants()

    if (activePlayers.length <= 1) {
      return true
    }

    // All-in players (chips === 0) have no more actions; others must have acted and matched highestBet
    const isComplete = activePlayers.every((player) => {
      if (player.chips === 0) return true // all-in: no action needed
      return (
        this.actedPlayerIds.has(player.id) &&
        (player.currentBet || 0) === this.highestBet
      )
    })
    return isComplete
  }

  private awardPotToSingleRemainingPlayer(): void {
    const activePlayers = this.getNonFoldedParticipants()

    if (activePlayers.length !== 1) return

    const winner = activePlayers[0]
    const awardedPot = this.state.pot

    winner.chips += awardedPot
    this.state.showdownWinnerId = winner.id
    this.state.showdownHandName = 'Gagne par abandon'
    this.state.showdownPot = awardedPot

    this.state.pot = 0
    this.state.phase = 'SHOWDOWN'
    this.state.handEndReason = this.computeHandEndReason() ?? 'WIN_BY_FOLD'
    this.state.handRuntimePhase = 'HAND_COMPLETE'
    this.state.currentTurn = ''
  }

  /**
   * En 2 joueurs, si un seul est encore connecté : attribue le pot au joueur restant et termine la partie.
   * À appeler après avoir mis à jour isConnected sur le joueur qui part.
   * @returns { winnerId, pot } si la partie a été terminée, null sinon
   */
  endGameDueToDisconnect(): { winnerId: string; pot: number } | null {
    const connected = this.state.players.filter((p) => p.isConnected !== false)
    if (this.state.players.length !== 2 || connected.length !== 1) return null
    const winner = connected[0]
    const awardedPot = this.state.pot
    winner.chips += awardedPot
    this.state.pot = 0
    this.state.phase = 'ENDED_OPPONENT_LEFT'
    this.state.currentTurn = ''
    return { winnerId: winner.id, pot: awardedPot }
  }

  /**
   * Quand un joueur se déconnecte alors que ce n'est pas son tour (isActive déjà mis à false par le gateway).
   * Attribue le pot au joueur restant s'il n'en reste qu'un.
   */
  forceFoldForDisconnect(_playerId: string): void {
    if (this.getActivePlayers().length === 1) {
      this.awardPotToSingleRemainingPlayer()
    }
  }

  /**
   * Fold forcé à la sortie volontaire (quit) : même effet qu'un FOLD, même hors de son tour.
   */
  forceFoldQuit(playerId: string): void {
    const player = this.getPlayerState(playerId)
    if (!player) {
      throw new Error('Joueur introuvable')
    }
    if (!this.handStarted) {
      throw new Error('La main n’a pas commencé')
    }
    if (!this.handParticipantIds.has(playerId)) {
      throw new Error('Joueur non participant sur cette main')
    }
    if (!player.isActive) {
      return
    }

    const streetForLog = this.state.phase
    const wasTheirTurn = this.state.currentTurn === playerId

    player.isActive = false
    this.actedPlayerIds.add(player.id)

    if (this.getActivePlayers().length === 1) {
      this.awardPotToSingleRemainingPlayer()
      this.finishPlayerActionLedger(player, 'FOLD', streetForLog)
      return
    }

    if (this.canCloseCurrentBettingRound()) {
      this.moveToNextPhase()
      this.finishPlayerActionLedger(player, 'FOLD', streetForLog)
      return
    }

    if (wasTheirTurn) {
      this.advanceTurn()
    }
    this.finishPlayerActionLedger(player, 'FOLD', streetForLog)
  }

  /**
   * Rembourse immédiatement les mises non appelées (ex: J1 mise 500, J2 call 300, J3 call 400 → J1 récupère 100 tout de suite).
   * À appeler à la fin du tour d'enchères, avant de passer à la rue suivante ou au showdown.
   */
  private processUncalledBetsRefund(): void {
    const activePlayers = this.getActivePlayers()
    if (activePlayers.length < 2) return

    const allWithContrib = this.state.players.filter(
      (p) => (p.totalPutInThisHand ?? p.currentBet ?? 0) > 0
    )
    if (allWithContrib.length < 2) return

    for (const player of activePlayers) {
      const contrib = player.totalPutInThisHand ?? player.currentBet ?? 0
      const maxOther = Math.max(
        0,
        ...allWithContrib
          .filter((p) => p.id !== player.id)
          .map((p) => p.totalPutInThisHand ?? p.currentBet ?? 0)
      )
      const refund = Math.max(0, contrib - maxOther)
      if (refund > 0) {
        player.chips += refund
        player.totalPutInThisHand = (player.totalPutInThisHand ?? contrib) - refund
        this.state.pot -= refund
      }
    }
  }

  /**
   * Passe à la phase suivante.
   * @param lastActorId - Si fourni, le premier à jouer sur la nouvelle rue est le joueur APRÈS lastActorId (évite qu'un joueur joue deux fois de suite)
   */
  private moveToNextPhase(): void {
    // Guardrail: if only one participant remains, always end by fold.
    const handEndReason = this.computeHandEndReason()
    if (handEndReason === 'WIN_BY_FOLD') {
      this.awardPotToSingleRemainingPlayer()
      return
    }

    const phaseOrder: GamePhase[] = ['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN']
    const currentIndex = phaseOrder.indexOf(this.state.phase)

    if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) {
      return
    }

    // Remboursement immédiat des mises non appelées avant de passer à la rue suivante
    this.processUncalledBetsRefund()
    this.state.handRuntimePhase = 'BETTING_ROUND_CLOSED'

    const nextPhase = phaseOrder[currentIndex + 1]
    this.state.phase = nextPhase

    const firstToActId = this.getFirstToActOnNewStreet()

    if (nextPhase === 'FLOP') {
      this.resetBetsForNewRound()
      this.state.communityCards.push(...this.deck.dealFlop())
      this.runOutBoardIfAllIn()
      if (this.state.phase === 'SHOWDOWN') return
      if (this.liveBetWindowDisabled) {
        this.state.currentTurn = firstToActId
        this.state.handRuntimePhase = 'BETTING_ACTIVE'
        return
      }
      this.beginLiveBetWindow('LIVE_FLOP', firstToActId)
      return
    }

    if (nextPhase === 'TURN') {
      this.resetBetsForNewRound()
      this.state.communityCards.push(this.deck.dealTurn())
      this.runOutBoardIfAllIn()
      if (this.state.phase === 'SHOWDOWN') return
      if (this.liveBetWindowDisabled) {
        this.state.currentTurn = firstToActId
        this.state.handRuntimePhase = 'BETTING_ACTIVE'
        return
      }
      this.beginLiveBetWindow('LIVE_TURN', firstToActId)
      return
    }

    if (nextPhase === 'RIVER') {
      this.resetBetsForNewRound()
      this.state.communityCards.push(this.deck.dealRiver())
      this.runOutBoardIfAllIn()
      if (this.state.phase === 'SHOWDOWN') return
      if (this.liveBetWindowDisabled) {
        this.state.currentTurn = firstToActId
        this.state.handRuntimePhase = 'BETTING_ACTIVE'
        return
      }
      this.beginLiveBetWindow('LIVE_RIVER', firstToActId)
      return
    }

    if ((this.computeHandEndReason() ?? null) === 'SHOWDOWN') {
      this.state.handRuntimePhase = 'SHOWDOWN_PENDING'
      this.resolveShowdown()
      this.state.currentTurn = ''
      return
    }

    // Defensive fallback for inconsistent states.
    this.awardPotToSingleRemainingPlayer()
  }

  private beginLiveBetWindow(
    windowType: 'LIVE_FLOP' | 'LIVE_TURN' | 'LIVE_RIVER',
    firstToActId: string
  ): void {
    this.pendingFirstToActAfterLiveWindow = firstToActId
    const closesAt = Date.now() + this.liveBetWindowMs
    this.state.hiddenBetLiveWindow = { windowType, closesAt }
    this.state.currentTurn = ''
    this.state.handRuntimePhase = 'LIVE_BET_WINDOW'
  }

  /** Fermeture timer fenêtre paris live — reprend le tour d’enchères. */
  resumeAfterHiddenBetLiveWindow(): void {
    if (!this.state.hiddenBetLiveWindow) return
    this.state.hiddenBetLiveWindow = undefined
    const first = this.pendingFirstToActAfterLiveWindow ?? this.getFirstToActOnNewStreet()
    this.pendingFirstToActAfterLiveWindow = null
    this.state.currentTurn = first
    this.state.handRuntimePhase = 'BETTING_ACTIVE'
  }

  /** Premier à jouer sur une nouvelle rue : ordre poker postflop standard. */
  private getFirstToActOnNewStreet(): string {
    return this.getPostflopFirstPlayerId()
  }

  /**
   * When at least one active player is all-in (chips === 0), run out the board:
   * deal all remaining community cards and go straight to showdown (no more betting).
   */
  private runOutBoardIfAllIn(): void {
    const activePlayers = this.getNonFoldedParticipants()
    const actingPlayers = activePlayers.filter((p) => p.chips > 0)
    const hasNoMoreBetting = actingPlayers.length <= 1
    const phaseOrder: GamePhase[] = ['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN']
    const currentPhase: GamePhase = this.state.phase
    if (!hasNoMoreBetting || currentPhase === 'SHOWDOWN') return

    const currentIndex = phaseOrder.indexOf(currentPhase)
    if (currentIndex === -1 || currentIndex >= phaseOrder.length - 1) return

    // Move phase by phase until SHOWDOWN, dealing cards
    let phase: GamePhase = currentPhase
    while (phase !== 'SHOWDOWN') {
      const idx = phaseOrder.indexOf(phase)
      const nextPhase: GamePhase = phaseOrder[idx + 1]

      if (nextPhase === 'FLOP') {
        this.resetBetsForNewRound()
        this.state.communityCards.push(...this.deck.dealFlop())
      } else if (nextPhase === 'TURN') {
        this.state.communityCards.push(this.deck.dealTurn())
      } else if (nextPhase === 'RIVER') {
        this.state.communityCards.push(this.deck.dealRiver())
      }

      this.state.phase = nextPhase
      phase = nextPhase
    }

    this.state.currentTurn = ''
    this.state.handEndReason = 'ALL_IN_RUNOUT'
    this.state.handRuntimePhase = 'SHOWDOWN_PENDING'
    this.resolveShowdown()
  }

  private advanceTurn(): void {
    this.nextTurnInternal()
  }

  private nextTurnInternal(): void {
    if (this.state.players.length === 0) {
      this.state.currentTurn = ''
      return
    }

    const currentIndex = this.state.players.findIndex(
      (p) => p.id === this.state.currentTurn
    )
    let nextIndex = (currentIndex + 1) % this.state.players.length
    let loopCount = 0

    while (loopCount < this.state.players.length) {
      const nextPlayer = this.state.players[nextIndex]

      if (
        nextPlayer.isActive &&
        (nextPlayer.cards?.length ?? 0) > 0 &&
        nextPlayer.chips > 0
      ) {
        this.state.currentTurn = nextPlayer.id
        return
      }

      nextIndex = (nextIndex + 1) % this.state.players.length
      loopCount++
    }

    this.state.currentTurn = ''
  }

  /**
   * Démarre un nouveau round de mise (premier joueur actif après le dealer).
   */
  startNewRound(): void {
    const dealerIndex = this.state.players.findIndex((p) => p.isDealer)
    let firstPlayerIndex = (dealerIndex + 1) % this.state.players.length
    let loopCount = 0

    while (
      loopCount < this.state.players.length &&
      !this.state.players[firstPlayerIndex].isActive
    ) {
      firstPlayerIndex = (firstPlayerIndex + 1) % this.state.players.length
      loopCount++
    }

    if (loopCount < this.state.players.length) {
      this.state.currentTurn = this.state.players[firstPlayerIndex].id
    } else {
      this.state.currentTurn = ''
    }
  }

  /**
   * Démarre une nouvelle main.
   * Vigilance : le bouton ne tourne qu'à la fin complète d'une main, au tout début de la suivante.
   * L'affichage du jeton "D" (isDealer) est dérivé de dealerIndex via assignPositionsAndRoles.
   */
  startHand(
    forcedHoleCards?: Record<string, Card[]>,
    opts?: { forcedBigBlindUserId?: string; handId?: string }
  ): void {
    if (this.getConnectedPlayers().length < 2) {
      throw new Error('Il faut au moins 2 joueurs pour démarrer')
    }

    if (this.handStarted) {
      this.dealerIndex = this.getNextLivingPlayerIndex(this.dealerIndex)
    }

    if (opts?.forcedBigBlindUserId) {
      const bbIdx = this.state.players.findIndex((p) => p.id === opts.forcedBigBlindUserId)
      if (bbIdx >= 0) {
        const n = this.state.players.length
        if (n === 2) {
          this.dealerIndex = (bbIdx + 1) % 2
        } else if (n > 2) {
          this.dealerIndex = (bbIdx - 2 + n) % n
        }
      }
    }

    this.handStarted = true
    this.deck = new Deck()
    this.deck.shuffle()
    this.state.pot = 0
    this.state.communityCards = []
    this.state.phase = 'PREFLOP'
    this.highestBet = 0
    this.actedPlayerIds.clear()

    for (const player of this.state.players) {
      player.cards = []
      player.currentBet = 0
      player.totalPutInThisHand = 0
      player.isActive = player.isConnected !== false && player.chips > 0
      player.isDealer = false
      player.role = 'PLAYER'
    }

    this.handParticipantIds.clear()

    if (forcedHoleCards && Object.keys(forcedHoleCards).length > 0) {
      const allForced: Card[] = []
      for (const pid of Object.keys(forcedHoleCards)) {
        const cards = forcedHoleCards[pid]
        if (Array.isArray(cards) && cards.length === 2) {
          const player = this.state.players.find((p) => p.id === pid)
          if (player) {
            player.cards = cards.map((c) => ({
              suit: c.suit,
              rank: c.rank,
              value: (c.value ?? RANK_VALUE[c.rank] ?? 2)
            }));
            allForced.push(...player.cards)
          }
        }
      }
      this.deck.removeCards(allForced)
      for (const player of this.state.players) {
        if (player.cards.length === 0) {
          const c1 = this.deck.draw(1)[0]
          const c2 = this.deck.draw(1)[0]
          player.cards = [c1, c2]
        }
        if (player.isActive && player.isConnected !== false) {
          this.handParticipantIds.add(player.id)
        }
      }
    } else {
      const eligiblePlayers = this.state.players.filter(
        (player) => player.isActive && player.isConnected !== false
      )
      for (const player of eligiblePlayers) {
        this.handParticipantIds.add(player.id)
      }
      this.deck.dealInitialCards(eligiblePlayers)
    }

    if (this.handParticipantIds.size === 0) {
      for (const player of this.state.players) {
        if (player.isActive && player.isConnected !== false) {
          this.handParticipantIds.add(player.id)
        }
      }
    }

    this.setBlinds()
    this.state.currentTurn = this.getPreflopFirstPlayerId()
    this.state.handId = opts?.handId ?? `${this.id}:${Date.now()}`
    this.state.lastHandAction = undefined
    this.state.actionVersion = 0
    this.state.streetVersion = 0
    this.state.handParticipantIds = Array.from(this.handParticipantIds)
    this.state.handEndReason = undefined
    this.state.handRuntimePhase = 'BETTING_ACTIVE'
    this.bumpVersion()
  }

  addPlayer(player: Player): void {
    player.cards = Array.isArray(player.cards) ? player.cards : []
    player.currentBet = 0
    player.isActive =
      this.handStarted && this.state.phase !== 'SHOWDOWN'
        ? false
        : (player.isActive ?? true)
    player.position = this.state.players.length
    player.isDealer = false
    player.isConnected = player.isConnected ?? true
    player.role = 'PLAYER'

    this.state.players.push(player)
  }

  removePlayer(playerId: string): void {
    const removedIndex = this.getPlayerIndexById(playerId)

    this.state.players = this.state.players.filter((player) => player.id !== playerId)

    this.state.players.forEach((player, index) => {
      player.position = index
    })

    if (this.state.players.length === 0) {
      this.dealerIndex = 0
      this.state.currentTurn = ''
      return
    }

    if (removedIndex !== -1 && removedIndex < this.dealerIndex) {
      this.dealerIndex -= 1
    }

    if (this.dealerIndex >= this.state.players.length) {
      this.dealerIndex = 0
    }

    if (this.state.currentTurn === playerId) {
      const fallbackIndex = this.getNextEligiblePlayerIndex(
        Math.max(0, removedIndex - 1)
      )

      this.state.currentTurn =
        fallbackIndex === -1
          ? this.state.players[0]?.id || ''
          : this.state.players[fallbackIndex].id
    }
  }

  getPlayerState(playerId: string): Player | undefined {
    return this.state.players.find((player) => player.id === playerId)
  }

  /** Relance minimum dynamique (last raise increment, floor = big blind). */
  getMinRaise(): number {
    return Math.max(this.bigBlindAmount, this.minRaiseIncrement)
  }

  canPlayerAct(playerId: string): boolean {
    const player = this.getPlayerState(playerId)
    return (
      !!player &&
      this.handParticipantIds.has(playerId) &&
      player.isActive &&
      player.isConnected !== false &&
      player.chips > 0 &&
      this.state.currentTurn === playerId
    )
  }

  calculateBet(playerId: string, amount: number): number {
    const player = this.getPlayerState(playerId)
    return player ? intChips(Math.min(amount, player.chips)) : 0
  }

  calculateCallAmount(playerId: string): number {
    const player = this.getPlayerState(playerId)
    if (!player) return 0
    return intChips(Math.max(0, this.highestBet - (player.currentBet || 0)))
  }

  applyBet(playerId: string, amount: number): void {
    const playerIndex = this.getPlayerIndexById(playerId)
    if (playerIndex === -1) return

    const player = this.state.players[playerIndex]
    const betAmount = intChips(Math.min(amount, player.chips))

    player.chips -= betAmount
    this.state.pot += betAmount
    player.currentBet = (player.currentBet || 0) + betAmount
    this.highestBet = Math.max(this.highestBet, player.currentBet || 0)
  }

  handlePlayerAction(
    playerId: string,
    action: PlayerAction,
    amount?: number
  ): void {
    const player = this.getPlayerState(playerId)

    if (!player) {
      throw new Error('Joueur introuvable')
    }

    if (!this.handStarted) {
      throw new Error('La main n’a pas commencé')
    }

    if (this.state.hiddenBetLiveWindow) {
      throw new Error('Fenêtre paris live — actions suspendues')
    }

    if (!this.handParticipantIds.has(playerId)) {
      throw new Error('Joueur non participant sur cette main')
    }

    if (this.state.phase === 'SHOWDOWN') {
      throw new Error('Aucune action possible maintenant')
    }

    if (this.state.currentTurn !== playerId) {
      throw new Error('Pas ton tour !')
    }

    if (!player.isActive) {
      throw new Error('Joueur inactif')
    }

    const callAmount = this.calculateCallAmount(playerId)

    if (action === 'CHECK' && callAmount > 0) {
      throw new Error('Impossible de check, une mise est à suivre')
    }

    const streetForLog = this.state.phase

    if (action === 'CALL' && callAmount <= 0) {
      throw new Error('Rien à suivre')
    }

    if (action === 'CALL' && player.chips <= 0) {
      throw new Error('Pas de jetons pour suivre')
    }

    if (action === 'RAISE') {
      if (typeof amount !== 'number' || amount <= 0) {
        throw new Error('Montant de relance invalide')
      }

      amount = intChips(amount)

      const totalToPut = callAmount + amount
      const minRaise = this.getMinRaise()
      const isAllIn = totalToPut === player.chips
      const isShortAllInRaise = amount < minRaise && isAllIn

      if (totalToPut > player.chips) {
        throw new Error('Pas assez de jetons pour relancer')
      }

      if (amount < minRaise && !isShortAllInRaise) {
        throw new Error(`La relance minimum est de ${minRaise}`)
      }
    }

    if (action === 'FOLD') {
      player.isActive = false
      this.actedPlayerIds.add(player.id)

      if (this.getActivePlayers().length === 1) {
        this.awardPotToSingleRemainingPlayer()
        this.finishPlayerActionLedger(player, 'FOLD', streetForLog)
        return
      }

      if (this.canCloseCurrentBettingRound()) {
        this.moveToNextPhase()
        this.finishPlayerActionLedger(player, 'FOLD', streetForLog)
        return
      }

      this.advanceTurn()
      this.finishPlayerActionLedger(player, 'FOLD', streetForLog)
      return
    }

    if (action === 'CHECK') {
      this.actedPlayerIds.add(player.id)

      if (this.canCloseCurrentBettingRound()) {
        this.moveToNextPhase()
        this.finishPlayerActionLedger(player, 'CHECK', streetForLog)
        return
      }

      this.advanceTurn()
      this.finishPlayerActionLedger(player, 'CHECK', streetForLog)
      return
    }

    if (action === 'CALL') {
      const actualCallAmount = intChips(Math.min(callAmount, player.chips))
      player.chips -= actualCallAmount
      player.currentBet = (player.currentBet || 0) + actualCallAmount
      player.totalPutInThisHand = (player.totalPutInThisHand ?? 0) + actualCallAmount
      this.state.pot += actualCallAmount

      this.actedPlayerIds.add(player.id)

      if (this.canCloseCurrentBettingRound()) {
        this.moveToNextPhase()
        this.finishPlayerActionLedger(player, 'CALL', streetForLog, actualCallAmount)
        return
      }

      this.advanceTurn()
      this.finishPlayerActionLedger(player, 'CALL', streetForLog, actualCallAmount)
      return
    }

    const raiseAmount = intChips(amount as number)
    const totalToPut = intChips(callAmount + raiseAmount)
    const minRaise = this.getMinRaise()
    const isShortAllInRaise =
      totalToPut === player.chips && raiseAmount < minRaise

    player.chips -= totalToPut
    player.currentBet = (player.currentBet || 0) + totalToPut
    player.totalPutInThisHand = (player.totalPutInThisHand ?? 0) + totalToPut
    this.state.pot += totalToPut
    const previousHighestBet = this.highestBet
    this.highestBet = player.currentBet || 0
    this.actedPlayerIds.add(player.id)

    if (!isShortAllInRaise) {
      this.lastRaiserId = player.id
      this.minRaiseIncrement = Math.max(
        this.bigBlindAmount,
        this.highestBet - previousHighestBet
      )
      this.actedPlayerIds.clear()
      this.actedPlayerIds.add(player.id)
    }

    if (this.canCloseCurrentBettingRound()) {
      this.moveToNextPhase()
      this.finishPlayerActionLedger(player, 'RAISE', streetForLog, raiseAmount)
      return
    }

    this.advanceTurn()
    this.finishPlayerActionLedger(player, 'RAISE', streetForLog, raiseAmount)
  }

  advancePhase(): void {
    if (!this.handStarted) {
      throw new Error('La main n’a pas commencé')
    }

    if (this.state.phase === 'SHOWDOWN') {
      return
    }

    this.moveToNextPhase()
  }

  private resolveShowdown(): void {
    this.state.handRuntimePhase = 'SHOWDOWN_REVEAL'
    const settled = settlePots({
      players: this.state.players,
      communityCards: this.state.communityCards,
    })
    for (const [winnerId, payout] of settled.payouts.entries()) {
      const winner = this.state.players.find((p) => p.id === winnerId)
      if (winner) winner.chips += payout
    }
    this.state.pot = 0
    this.state.showdownWinnerId = settled.showdownWinnerId
    this.state.showdownWinnerIds = settled.showdownWinnerIds
    this.state.showdownIsSplit = settled.showdownWinnerIds.length > 1
    this.state.showdownHandName = settled.showdownHandName
    this.state.showdownPot = settled.showdownPot
    this.state.handEndReason = this.state.handEndReason ?? 'SHOWDOWN'
    this.state.handRuntimePhase = 'HAND_COMPLETE'
    this.bumpVersion()
  }

  private bumpVersion(): void {
    this.state.actionVersion = (this.state.actionVersion ?? 0) + 1
    this.state.updatedAt = new Date().toISOString()
  }

  /**
   * Incrémente actionVersion et enregistre la dernière action pour le journal client (multijoueur).
   */
  private finishPlayerActionLedger(
    player: Player,
    action: PlayerAction,
    streetForLog: GamePhase,
    amount?: number
  ): void {
    this.bumpVersion()
    this.state.lastHandAction = {
      playerId: player.id,
      playerName: player.name,
      action,
      street: streetForLog,
      amount: amount !== undefined ? intChips(amount) : undefined,
      actionVersion: this.state.actionVersion ?? 0,
      actorRole: player.role,
    }
  }

    /**
   * Version simplifiée de handlePlayerAction pour l'interface externe
   * Utilise automatiquement le joueur dont c'est le tour
   */
  handlePlayerActionExternal(action: PlayerAction, amount?: number): void {
    const player = this.getPlayerState(this.state.currentTurn)
    if (!player) throw new Error('Aucun joueur actif')
    this.handlePlayerAction(player.id, action, amount)
  }

  /**
   * Passe au joueur suivant (actif et ayant encore des cartes).
   */
  nextTurn(): void {
    this.nextTurnInternal()
  }

  /**
   * Vérifie si le tour de mise est terminé
   */
  bettingRoundComplete(): boolean {
    return this.isBettingRoundComplete()
  }

  /**
   * Termine le tour de mise et passe à la phase suivante
   */
  endBettingRound(): void {
    if (this.bettingRoundComplete()) {
      this.moveToNextPhase()
    }
  }

  getState(): GameState & { id: string } {
    return {
      id: this.id,
      pot: this.state.pot,
      communityCards: this.state.communityCards,
      players: this.state.players,
      currentTurn: this.state.currentTurn,
      phase: this.state.phase,
      handId: this.state.handId,
      actionVersion: this.state.actionVersion,
      streetVersion: this.state.streetVersion,
      updatedAt: this.state.updatedAt,
      showdownWinnerId: this.state.showdownWinnerId,
      showdownWinnerIds: this.state.showdownWinnerIds,
      showdownIsSplit: this.state.showdownIsSplit,
      showdownHandName: this.state.showdownHandName,
      showdownPot: this.state.showdownPot,
      burnedCardsCount: this.deck.burnedCards.length,
      handParticipantIds: this.state.handParticipantIds,
      handEndReason: this.state.handEndReason,
      handRuntimePhase: this.state.handRuntimePhase,
      lastHandAction: this.state.lastHandAction,
    }
  }

  getSanitizedState(requestingPlayerId?: string): GameState {
    return {
      id: this.id,
      pot: this.state.pot,
      communityCards: this.state.communityCards,
      currentTurn: this.state.currentTurn,
      phase: this.state.phase,
      handId: this.state.handId,
      lastHandAction: this.state.lastHandAction,
      actionVersion: this.state.actionVersion,
      streetVersion: this.state.streetVersion,
      updatedAt: this.state.updatedAt,
      showdownWinnerId: this.state.showdownWinnerId,
      showdownWinnerIds: this.state.showdownWinnerIds,
      showdownIsSplit: this.state.showdownIsSplit,
      showdownHandName: this.state.showdownHandName,
      showdownPot: this.state.showdownPot,
      burnedCardsCount: this.deck.burnedCards.length,
      handParticipantIds: this.state.handParticipantIds,
      handEndReason: this.state.handEndReason,
      handRuntimePhase: this.state.handRuntimePhase,
      hiddenBetLiveWindow: this.state.hiddenBetLiveWindow,
      players: this.state.players.map((player) => ({
        id: player.id,
        name: player.name,
        chips: player.chips,
        currentBet: player.currentBet || 0,
        position: player.position || 0,
        role: player.role,
        isActive: player.isActive,
        isDealer: player.isDealer || false,
        isConnected: player.isConnected !== false,
        // Règles de révélation des cartes :
        // - Avant showdown : chaque joueur voit uniquement ses propres cartes
        // - Au showdown réel (plusieurs joueurs) : tous voient les cartes des joueurs encore en lice (isActive)
        // - "Gagne par abandon" (1 seul restant) : le gagnant ne montre pas, les folders ne voient pas sa main
        cards:
          this.state.phase === 'SHOWDOWN'
            ? this.state.showdownHandName === 'Gagne par abandon'
              ? player.id === requestingPlayerId && player.id === this.state.showdownWinnerId
                ? player.cards
                : []
              : player.isActive
                ? player.cards
                : []
            : player.id === requestingPlayerId
              ? player.cards
              : []
      }))
    }
  }
}