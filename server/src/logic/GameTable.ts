import type { GameState, Player, GamePhase } from '../types/poker.js';
import { Deck } from './Deck.js';
import { findWinner } from './Evaluator.js';

export class GameTable {
  public readonly id: string;
  private deck: Deck;
  public state: GameState;

  constructor(id: string, players: Player[]) {
    this.id = id;
    this.deck = new Deck();
    this.state = {
      pot: 0,
      communityCards: [],
      players,
      currentTurn: players[0]?.id || '',
      phase: 'PREFLOP'
    };
  }

  private setBlinds(): void {
    if (this.state.players.length < 2) return;

    for (const player of this.state.players) {
      player.role = 'PLAYER';
      player.currentBet = 0;
    }

    this.state.players[0].role = 'DEALER';

    if (this.state.players.length === 2) {
      this.state.players[1].role = 'BIG_BLIND';
    } else {
      this.state.players[1].role = 'SMALL_BLIND';
      this.state.players[2].role = 'BIG_BLIND';
    }

    const smallBlind = this.state.players.find((p) => p.role === 'SMALL_BLIND');
    const bigBlind = this.state.players.find((p) => p.role === 'BIG_BLIND');

    if (smallBlind) {
      const amount = Math.min(10, smallBlind.chips);
      smallBlind.chips -= amount;
      smallBlind.currentBet = amount;
      this.state.pot += amount;
    }

    if (bigBlind) {
      const amount = Math.min(20, bigBlind.chips);
      bigBlind.chips -= amount;
      bigBlind.currentBet = amount;
      this.state.pot += amount;
    }
  }

  startHand(): void {
    this.deck = new Deck();
    this.deck.shuffle();

    for (const player of this.state.players) {
      player.cards = [];
      player.currentBet = 0;
      player.isActive = true;
    }

    this.state = {
      ...this.state,
      pot: 0,
      communityCards: [],
      phase: 'PREFLOP',
      currentTurn: this.state.players[0]?.id || ''
    };

    this.deck.dealInitialCards(this.state.players);
    this.setBlinds();
  }

  addPlayer(player: Player): void {
    this.state.players.push(player);
  }

  removePlayer(playerId: string): void {
    this.state.players = this.state.players.filter((p) => p.id !== playerId);
  }

  getPlayerState(playerId: string): Player | undefined {
    return this.state.players.find((p) => p.id === playerId);
  }

  canPlayerAct(playerId: string): boolean {
    const player = this.getPlayerState(playerId);
    return player ? player.isActive : false;
  }

  calculateBet(playerId: string, amount: number): number {
    const player = this.getPlayerState(playerId);
    return player ? Math.min(amount, player.chips) : 0;
  }

  applyBet(playerId: string, amount: number): void {
    const playerIndex = this.state.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return;

    const player = this.state.players[playerIndex];
    const betAmount = Math.min(amount, player.chips);

    player.chips -= betAmount;
    this.state.pot += betAmount;
    player.currentBet = (player.currentBet || 0) + betAmount;
  }

  handlePlayerAction(
    playerId: string,
    action: 'FOLD' | 'CALL' | 'RAISE' | 'CHECK',
    amount?: number
  ): void {
    const playerIndex = this.state.players.findIndex((p) => p.id === playerId);

    if (
      playerIndex === -1 ||
      this.state.players[playerIndex].id !== this.state.currentTurn
    ) {
      throw new Error('Pas ton tour !');
    }

    const player = this.state.players[playerIndex];

    if (action === 'CALL' && amount && amount > player.chips) {
      throw new Error('Pas assez de jetons pour suivre');
    }

    if (action === 'RAISE') {
      if (!amount || amount < 20) {
        throw new Error('La relance minimum est de 20');
      }
      if (amount > player.chips) {
        throw new Error('Pas assez de jetons pour relancer');
      }
    }

    switch (action) {
      case 'FOLD':
        player.currentBet = 0;
        player.isActive = false;
        break;

      case 'CHECK':
        break;

      case 'CALL':
        if (player.chips >= (amount || 0)) {
          const callAmount = amount || 0;
          player.chips -= callAmount;
          this.state.pot += callAmount;
          player.currentBet = (player.currentBet || 0) + callAmount;
        }
        break;

      case 'RAISE':
        if (!amount || amount > player.chips) {
          throw new Error('Pas assez de jetons');
        }
        player.chips -= amount;
        player.currentBet = (player.currentBet || 0) + amount;
        this.state.pot += amount;
        break;
    }

    this.nextTurn();
  }

  private nextTurn(): void {
    const currentIndex = this.state.players.findIndex(
      (p) => p.id === this.state.currentTurn
    );
    let nextIndex = (currentIndex + 1) % this.state.players.length;

    while (
      nextIndex !== currentIndex &&
      (!this.state.players[nextIndex].cards?.length ||
        !this.state.players[nextIndex].isActive)
    ) {
      nextIndex = (nextIndex + 1) % this.state.players.length;
    }

    this.state.currentTurn = this.state.players[nextIndex].id;
  }

  advancePhase(): void {
    const phaseOrder: GamePhase[] = [
      'PREFLOP',
      'FLOP',
      'TURN',
      'RIVER',
      'SHOWDOWN'
    ];
    const currentIndex = phaseOrder.indexOf(this.state.phase);

    if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) return;

    const nextPhase = phaseOrder[currentIndex + 1];

    switch (nextPhase) {
      case 'FLOP':
        this.state.communityCards.push(...this.deck.dealFlop());
        break;
      case 'TURN':
        this.state.communityCards.push(this.deck.dealTurn());
        break;
      case 'RIVER':
        this.state.communityCards.push(this.deck.dealRiver());
        break;
      case 'SHOWDOWN':
        this.resolveShowdown();
        break;
    }

    this.state.phase = nextPhase;
    this.state.currentTurn = this.state.players[0]?.id || '';
  }

  private resolveShowdown(): void {
    const activePlayers = this.state.players.filter((p) => p.isActive);
    const playersToEvaluate =
      activePlayers.length > 0 ? activePlayers : this.state.players;

    const winnerId = findWinner(playersToEvaluate, this.state.communityCards);
    const winner = this.state.players.find((p) => p.id === winnerId);

    if (winner) {
      winner.chips += this.state.pot;
    }

    this.state.pot = 0;
  }

  getState(): GameState & { id: string } {
    return {
      id: this.id,
      pot: this.state.pot,
      communityCards: this.state.communityCards,
      players: this.state.players,
      currentTurn: this.state.currentTurn,
      phase: this.state.phase
    };
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
    };
  }
}