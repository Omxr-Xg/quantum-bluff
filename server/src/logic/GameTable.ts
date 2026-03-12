import type { GamePhase, GameState, Player } from '../types/poker.js'
import { Deck } from './Deck.js'
import { findWinner } from './Evaluator.js'

export class GameTable {
  public readonly id: string
  private deck: Deck
  public state: GameState
  private dealerIndex: number
  private highestBet: number
  private actedPlayerIds: Set<string>
  private handStarted: boolean

  constructor(id: string, players: Player[]) {
    this.id = id
    this.deck = new Deck()
    this.dealerIndex = 0
    this.highestBet = 0
    this.actedPlayerIds = new Set()
    this.handStarted = false

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
      player.cards = player.cards ?? []
      player.currentBet = player.currentBet ?? 0
      player.isActive = player.isActive ?? true
      player.position = index
      player.isDealer = false
      player.isConnected = player.isConnected ?? true
      player.role = player.role ?? 'PLAYER'
    })
  }

  private getActivePlayers(): Player[] {
    return this.state.players.filter((player) => player.isActive && player.isConnected !== false)
  }

  private getNextActivePlayerIndex(startIndex: number): number {
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

  private assignPositions(): void {
    this.state.players.forEach((player, index) => {
      player.position = index
      player.isDealer = false
      player.role = 'PLAYER'
      player.currentBet = 0
    })

    if (this.state.players.length === 0) return

    const dealer = this.state.players[this.dealerIndex]
    dealer.role = 'DEALER'
    dealer.isDealer = true

    if (this.state.players.length === 2) {
      const bigBlindIndex = this.getNextActivePlayerIndex(this.dealerIndex)
      if (bigBlindIndex !== -1) {
        this.state.players[bigBlindIndex].role = 'BIG_BLIND'
      }
      return
    }

    const smallBlindIndex = this.getNextActivePlayerIndex(this.dealerIndex)
    if (smallBlindIndex !== -1) {
      this.state.players[smallBlindIndex].role = 'SMALL_BLIND'
    }

    const bigBlindIndex =
      smallBlindIndex !== -1 ? this.getNextActivePlayerIndex(smallBlindIndex) : -1

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
    this.state.pot += blindAmount
    this.highestBet = Math.max(this.highestBet, blindAmount)
  }

  private setBlinds(): void {
    if (this.state.players.length < 2) return

    this.assignPositions()
    this.postBlind('SMALL_BLIND', 10)
    this.postBlind('BIG_BLIND', 20)
  }

  private getPreflopFirstPlayerId(): string {
    if (this.state.players.length === 2) {
      return this.state.players[this.dealerIndex]?.id || ''
    }

    const bigBlindIndex = this.state.players.findIndex((p) => p.role === 'BIG_BLIND')
    const firstIndex = bigBlindIndex === -1 ? 0 : this.getNextActivePlayerIndex(bigBlindIndex)

    return firstIndex === -1 ? this.state.players[0]?.id || '' : this.state.players[firstIndex].id
  }

  private getPostflopFirstPlayerId(): string {
    const firstIndex = this.getNextActivePlayerIndex(this.dealerIndex)
    return firstIndex === -1 ? this.state.players[0]?.id || '' : this.state.players[firstIndex].id
  }

  private resetBetsForNewRound(): void {
    this.highestBet = 0
    this.actedPlayerIds.clear()

    for (const player of this.state.players) {
      player.currentBet = 0
    }
  }

  private isBettingRoundComplete(): boolean {
    const activePlayers = this.getActivePlayers()

    if (activePlayers.length <= 1) {
      return true
    }

    return activePlayers.every(
      (player) =>
        this.actedPlayerIds.has(player.id) && (player.currentBet || 0) === this.highestBet
    )
  }

  private awardPotToSingleRemainingPlayer(): void {
    const activePlayers = this.getActivePlayers()
    if (activePlayers.length !== 1) return

    activePlayers[0].chips += this.state.pot
    this.state.pot = 0
    this.state.phase = 'SHOWDOWN'
    this.state.currentTurn = ''
  }

  private moveToNextPhase(): void {
    const phaseOrder: GamePhase[] = ['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN']
    const currentIndex = phaseOrder.indexOf(this.state.phase)

    if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) {
      return
    }

    const nextPhase = phaseOrder[currentIndex + 1]
    this.state.phase = nextPhase

    if (nextPhase === 'FLOP') {
      this.resetBetsForNewRound()
      this.state.communityCards.push(...this.deck.dealFlop())
      this.state.currentTurn = this.getPostflopFirstPlayerId()
      return
    }

    if (nextPhase === 'TURN') {
      this.resetBetsForNewRound()
      this.state.communityCards.push(this.deck.dealTurn())
      this.state.currentTurn = this.getPostflopFirstPlayerId()
      return
    }

    if (nextPhase === 'RIVER') {
      this.resetBetsForNewRound()
      this.state.communityCards.push(this.deck.dealRiver())
      this.state.currentTurn = this.getPostflopFirstPlayerId()
      return
    }

    if (nextPhase === 'SHOWDOWN') {
      this.resolveShowdown()
      this.state.currentTurn = ''
    }
  }

  private advanceTurn(): void {
    const currentIndex = this.state.players.findIndex((p) => p.id === this.state.currentTurn)
    const nextIndex = currentIndex === -1 ? -1 : this.getNextActivePlayerIndex(currentIndex)

    if (nextIndex === -1) {
      this.state.currentTurn = ''
      return
    }

    this.state.currentTurn = this.state.players[nextIndex].id
  }

  startHand(): void {
    if (this.state.players.length < 2) {
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
      player.isActive = player.chips > 0
    }

    this.deck.dealInitialCards(this.state.players)
    this.setBlinds()
    this.state.currentTurn = this.getPreflopFirstPlayerId()
  }

  addPlayer(player: Player): void {
    player.cards = player.cards ?? []
    player.currentBet = 0
    player.isActive = player.isActive ?? true
    player.position = this.state.players.length
    player.isDealer = false
    player.isConnected = player.isConnected ?? true
    player.role = 'PLAYER'
    this.state.players.push(player)
  }

  removePlayer(playerId: string): void {
    this.state.players = this.state.players.filter((p) => p.id !== playerId)
    this.state.players.forEach((player, index) => {
      player.position = index
    })

    if (this.dealerIndex >= this.state.players.length) {
      this.dealerIndex = 0
    }

    if (this.state.currentTurn === playerId) {
      this.state.currentTurn = this.state.players[0]?.id || ''
    }
  }

  getPlayerState(playerId: string): Player | undefined {
    return this.state.players.find((p) => p.id === playerId)
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
    const playerIndex = this.state.players.findIndex((p) => p.id === playerId)
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
    action: 'FOLD' | 'CALL' | 'RAISE' | 'CHECK',
    amount?: number
  ): void {
    const player = this.getPlayerState(playerId)

    if (!player) {
      throw new Error('Joueur introuvable')
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

    if (action === 'CALL' && callAmount > player.chips) {
      throw new Error('Pas assez de jetons pour suivre')
    }

    if (action === 'RAISE') {
      if (typeof amount !== 'number' || amount <= 0) {
        throw new Error('Montant de relance invalide')
      }

      if (amount < 20) {
        throw new Error('La relance minimum est de 20')
      }

      const totalToPut = callAmount + amount

      if (totalToPut > player.chips) {
        throw new Error('Pas assez de jetons pour relancer')
      }
    }

    if (action === 'FOLD') {
      player.isActive = false
      player.currentBet = player.currentBet || 0
      this.actedPlayerIds.add(player.id)

      if (this.getActivePlayers().length === 1) {
        this.awardPotToSingleRemainingPlayer()
        return
      }

      if (this.isBettingRoundComplete()) {
        this.moveToNextPhase()
        return
      }

      this.advanceTurn()
      return
    }

    if (action === 'CHECK') {
      this.actedPlayerIds.add(player.id)

      if (this.isBettingRoundComplete()) {
        this.moveToNextPhase()
        return
      }

      this.advanceTurn()
      return
    }

    if (action === 'CALL') {
      player.chips -= callAmount
      player.currentBet = (player.currentBet || 0) + callAmount
      this.state.pot += callAmount
      this.actedPlayerIds.add(player.id)

      if (this.isBettingRoundComplete()) {
        this.moveToNextPhase()
        return
      }

      this.advanceTurn()
      return
    }

    if (action === 'RAISE') {
      const raiseAmount = amount as number
      const totalToPut = callAmount + raiseAmount

      player.chips -= totalToPut
      player.currentBet = (player.currentBet || 0) + totalToPut
      this.state.pot += totalToPut
      this.highestBet = player.currentBet || 0
      this.actedPlayerIds.clear()
      this.actedPlayerIds.add(player.id)

      this.advanceTurn()
    }
  }

  advancePhase(): void {
    if (this.state.phase === 'SHOWDOWN') {
      return
    }

    this.moveToNextPhase()
  }

  private resolveShowdown(): void {
    const activePlayers = this.getActivePlayers()
    const playersToEvaluate = activePlayers.length > 0 ? activePlayers : this.state.players
    const winnerId = findWinner(playersToEvaluate, this.state.communityCards)
    const winner = this.state.players.find((p) => p.id === winnerId)

    if (winner) {
      winner.chips += this.state.pot
    }

    this.state.pot = 0
  }

  getState(): GameState & { id: string } {
    return {
      id: this.id,
      pot: this.state.pot,
      communityCards: this.state.communityCards,
      players: this.state.players,
      currentTurn: this.state.currentTurn,
      phase: this.state.phase
    }
  }

  getSanitizedState(requestingPlayerId?: string): GameState {
    return {
      id: this.id,
      pot: this.state.pot,
      communityCards: this.state.communityCards,
      currentTurn: this.state.currentTurn,
      phase: this.state.phase,
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
        cards: player.id === requestingPlayerId ? player.cards : []
      }))
    }
  }
}