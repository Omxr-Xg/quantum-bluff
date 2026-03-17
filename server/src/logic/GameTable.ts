import type { Card, GamePhase, GameState, Player } from '../types/poker.js'
import { Deck } from './Deck.js'
import { findWinnersWithHand } from './Evaluator.js'

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

  constructor(id: string, players: Player[], options?: { smallBlind?: number; bigBlind?: number }) {
    this.id = id
    this.deck = new Deck()
    this.dealerIndex = 0
    this.highestBet = 0
    this.actedPlayerIds = new Set()
    this.lastRaiserId = null
    this.handStarted = false
    this.smallBlindAmount = options?.smallBlind ?? 10
    this.bigBlindAmount = options?.bigBlind ?? 20

    this.state = {
      id,
      pot: 0,
      communityCards: [],
      players,
      currentTurn: players[0]?.id || '',
      phase: 'PREFLOP'
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
    return this.state.players.filter(
      (player) => player.isActive && player.isConnected !== false
    )
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

      if (player.isActive && player.isConnected !== false) {
        return index
      }
    }

    return -1
  }

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

    if (this.state.players.length === 2) {
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

    const blindAmount = Math.min(amount, player.chips)
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
    if (this.state.players.length === 2) {
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
    if (this.state.players.length === 2) {
      const dealer = this.state.players[this.dealerIndex]
      if (dealer?.isActive && dealer?.isConnected !== false) {
        return dealer.id
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
    this.actedPlayerIds.clear()

    for (const player of this.state.players) {
      player.currentBet = 0
      // totalPutInThisHand is kept for the whole hand (side pots)
    }
  }

  private isBettingRoundComplete(): boolean {
    const activePlayers = this.getActivePlayers()

    if (activePlayers.length <= 1) {
      return true
    }

    // All-in players (chips === 0) have no more actions; others must have acted and matched highestBet
    return activePlayers.every((player) => {
      if (player.chips === 0) return true // all-in: no action needed
      return (
        this.actedPlayerIds.has(player.id) &&
        (player.currentBet || 0) === this.highestBet
      )
    })
  }

  private awardPotToSingleRemainingPlayer(): void {
    const activePlayers = this.getActivePlayers()

    if (activePlayers.length !== 1) return

    const winner = activePlayers[0]
    const awardedPot = this.state.pot

    winner.chips += awardedPot
    this.state.showdownWinnerId = winner.id
    this.state.showdownHandName = 'Gagne par abandon'
    this.state.showdownPot = awardedPot

    this.state.pot = 0
    this.state.phase = 'SHOWDOWN'
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
   * Passe à la phase suivante.
   * @param lastActorId - Si fourni, le premier à jouer sur la nouvelle rue est le joueur APRÈS lastActorId (évite qu'un joueur joue deux fois de suite)
   */
  private moveToNextPhase(lastActorId?: string): void {
    const phaseOrder: GamePhase[] = ['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN']
    const currentIndex = phaseOrder.indexOf(this.state.phase)

    if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) {
      return
    }

    const nextPhase = phaseOrder[currentIndex + 1]
    this.state.phase = nextPhase

    const firstToActId = this.getFirstToActOnNewStreet(lastActorId)

    if (nextPhase === 'FLOP') {
      this.resetBetsForNewRound()
      this.state.communityCards.push(...this.deck.dealFlop())
      this.state.currentTurn = firstToActId
      this.runOutBoardIfAllIn()
      return
    }

    if (nextPhase === 'TURN') {
      this.resetBetsForNewRound()
      this.state.communityCards.push(this.deck.dealTurn())
      this.state.currentTurn = firstToActId
      this.runOutBoardIfAllIn()
      return
    }

    if (nextPhase === 'RIVER') {
      this.resetBetsForNewRound()
      this.state.communityCards.push(this.deck.dealRiver())
      this.state.currentTurn = firstToActId
      this.runOutBoardIfAllIn()
      return
    }

    this.resolveShowdown()
    this.state.currentTurn = ''
  }

  /** Premier à jouer sur une nouvelle rue : après lastActorId si fourni, sinon dealer/postflop standard */
  private getFirstToActOnNewStreet(lastActorId?: string): string {
    if (lastActorId) {
      const lastIndex = this.getPlayerIndexById(lastActorId)
      if (lastIndex !== -1) {
        const nextIndex = this.getNextEligiblePlayerIndex(lastIndex)
        if (nextIndex !== -1) {
          return this.state.players[nextIndex].id
        }
      }
    }
    return this.getPostflopFirstPlayerId()
  }

  /**
   * When at least one active player is all-in (chips === 0), run out the board:
   * deal all remaining community cards and go straight to showdown (no more betting).
   */
  private runOutBoardIfAllIn(): void {
    const activePlayers = this.getActivePlayers()
    const hasAllIn = activePlayers.some((p) => p.chips === 0)
    const phaseOrder: GamePhase[] = ['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN']
    const currentPhase: GamePhase = this.state.phase
    if (!hasAllIn || currentPhase === 'SHOWDOWN') return

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

  startHand(forcedHoleCards?: Record<string, Card[]>): void {
    if (this.getConnectedPlayers().length < 2) {
      throw new Error('Il faut au moins 2 joueurs pour démarrer')
    }

    if (this.handStarted) {
      this.dealerIndex = (this.dealerIndex + 1) % this.state.players.length
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
      }
    } else {
      this.deck.dealInitialCards(this.state.players)
    }

    this.setBlinds()
    this.state.currentTurn = this.getPreflopFirstPlayerId()
  }

  addPlayer(player: Player): void {
    player.cards = Array.isArray(player.cards) ? player.cards : []
    player.currentBet = 0
    player.isActive = player.isActive ?? true
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

  canPlayerAct(playerId: string): boolean {
    const player = this.getPlayerState(playerId)
    return !!player && player.isActive && this.state.currentTurn === playerId
  }

  calculateBet(playerId: string, amount: number): number {
    const player = this.getPlayerState(playerId)
    return player ? Math.min(amount, player.chips) : 0
  }

  calculateCallAmount(playerId: string): number {
    const player = this.getPlayerState(playerId)
    if (!player) return 0
    return Math.max(0, this.highestBet - (player.currentBet || 0))
  }

  applyBet(playerId: string, amount: number): void {
    const playerIndex = this.getPlayerIndexById(playerId)
    if (playerIndex === -1) return

    const player = this.state.players[playerIndex]
    const betAmount = Math.min(amount, player.chips)

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

      if (amount < this.bigBlindAmount) {
        throw new Error(`La relance minimum est de ${this.bigBlindAmount}`)
      }

      const totalToPut = callAmount + amount

      if (totalToPut > player.chips) {
        throw new Error('Pas assez de jetons pour relancer')
      }
    }

    if (action === 'FOLD') {
      player.isActive = false
      this.actedPlayerIds.add(player.id)

      if (this.getActivePlayers().length === 1) {
        this.awardPotToSingleRemainingPlayer()
        return
      }

      if (this.isBettingRoundComplete()) {
        this.moveToNextPhase(player.id) // premier à jouer = suivant du folder
        return
      }

      this.advanceTurn()
      return
    }

    if (action === 'CHECK') {
      this.actedPlayerIds.add(player.id)

      if (this.isBettingRoundComplete()) {
        this.moveToNextPhase(player.id) // évite que le même joueur joue deux fois de suite
        return
      }

      this.advanceTurn()
      return
    }

    if (action === 'CALL') {
      const actualCallAmount = Math.min(callAmount, player.chips)
      player.chips -= actualCallAmount
      player.currentBet = (player.currentBet || 0) + actualCallAmount
      player.totalPutInThisHand = (player.totalPutInThisHand ?? 0) + actualCallAmount
      this.state.pot += actualCallAmount

      this.actedPlayerIds.add(player.id)
      // S'assurer que le relanceur et tous ceux qui ont matché sont dans acted (évite de redemander au raiser)
      if (this.lastRaiserId) this.actedPlayerIds.add(this.lastRaiserId)
      for (const p of this.getActivePlayers()) {
        if ((p.currentBet || 0) === this.highestBet) this.actedPlayerIds.add(p.id)
      }

      if (this.isBettingRoundComplete()) {
        this.moveToNextPhase(player.id) // A raise B call → premier sur nouvelle rue = B (qui vient de call)
        return
      }

      this.advanceTurn()
      return
    }

    const raiseAmount = amount as number
    const totalToPut = callAmount + raiseAmount

    player.chips -= totalToPut
    player.currentBet = (player.currentBet || 0) + totalToPut
    player.totalPutInThisHand = (player.totalPutInThisHand ?? 0) + totalToPut
    this.state.pot += totalToPut
    this.highestBet = player.currentBet || 0
    this.lastRaiserId = player.id
    this.actedPlayerIds.clear()
    this.actedPlayerIds.add(player.id)

    this.advanceTurn()
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
    const activePlayers = this.getActivePlayers()
    const playersToEvaluate =
      activePlayers.length > 0 ? activePlayers : this.state.players
    const allPlayers = this.state.players

    if (playersToEvaluate.length === 0) {
      this.state.pot = 0
      return
    }

    const totalPot = this.state.pot

    // Get unique contribution levels from active (non-folded) players
    const levels = [
      ...new Set(
        playersToEvaluate.map((p) => p.totalPutInThisHand ?? p.currentBet ?? 0)
      ),
    ].sort((a, b) => a - b)

    let distributed = 0
    let lastWinnerId = ''
    let lastWinnerIds: string[] = []
    let lastHandName = ''

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i]
      const prevLevel = i === 0 ? 0 : levels[i - 1]
      const diff = level - prevLevel
      if (diff <= 0) continue

      // Eligible to WIN: only active (non-folded) players who contributed at least this level
      const eligible = playersToEvaluate.filter(
        (p) => (p.totalPutInThisHand ?? p.currentBet ?? 0) >= level
      )
      if (eligible.length === 0) continue

      // Pot size: count contributions from ALL players (including folded) at this level
      let potSize = 0
      for (const p of allPlayers) {
        const contrib = p.totalPutInThisHand ?? p.currentBet ?? 0
        const contributionAtThisLevel = Math.min(Math.max(0, contrib - prevLevel), diff)
        potSize += contributionAtThisLevel
      }
      if (potSize <= 0) continue

      const { winnerIds, handName } = findWinnersWithHand(
        eligible,
        this.state.communityCards
      )
      const n = winnerIds.length
      const share = n > 0 ? Math.floor(potSize / n) : 0
      const remainderThisLevel = potSize - share * n
      for (let j = 0; j < winnerIds.length; j++) {
        const wid = winnerIds[j]
        const winner = this.state.players.find((p) => p.id === wid)
        if (winner) {
          let amount = share
          if (j === 0) amount += remainderThisLevel
          winner.chips += amount
          distributed += amount
        }
      }
      lastWinnerId = winnerIds[0] ?? lastWinnerId
      lastWinnerIds = winnerIds
      lastHandName = handName
    }

    const remainder = totalPot - distributed
    if (remainder > 0 && lastWinnerId) {
      const winner = this.state.players.find((p) => p.id === lastWinnerId)
      if (winner) winner.chips += remainder
    }

    this.state.pot = 0
    this.state.showdownWinnerId = lastWinnerId
    this.state.showdownWinnerIds = lastWinnerIds
    this.state.showdownIsSplit = lastWinnerIds.length > 1
    this.state.showdownHandName = lastHandName
    this.state.showdownPot = totalPot
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
      showdownWinnerId: this.state.showdownWinnerId,
      showdownWinnerIds: this.state.showdownWinnerIds,
      showdownIsSplit: this.state.showdownIsSplit,
      showdownHandName: this.state.showdownHandName,
      showdownPot: this.state.showdownPot
    }
  }

  getSanitizedState(requestingPlayerId?: string): GameState {
    return {
      id: this.id,
      pot: this.state.pot,
      communityCards: this.state.communityCards,
      currentTurn: this.state.currentTurn,
      phase: this.state.phase,
      showdownWinnerId: this.state.showdownWinnerId,
      showdownWinnerIds: this.state.showdownWinnerIds,
      showdownIsSplit: this.state.showdownIsSplit,
      showdownHandName: this.state.showdownHandName,
      showdownPot: this.state.showdownPot,
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
        // Au showdown, révéler toutes les cartes pour l'affichage
        cards: this.state.phase === 'SHOWDOWN' ? player.cards : (player.id === requestingPlayerId ? player.cards : [])
      }))
    }
  }
}