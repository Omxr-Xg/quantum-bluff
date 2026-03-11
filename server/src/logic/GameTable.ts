import { Card, Player, GameState } from '../types/poker.js';
import { Deck } from './Deck.js';
import { Evaluator } from './Evaluator.js';

export class GameTable {
  private deck: Deck;
  private players: Player[] = [];
  private communityCards: Card[] = [];
  private pot: number = 0;
  private currentTurn: number = 0;

  constructor() {
    this.deck = new Deck();
    this.deck.shuffle();
  }

  addPlayer(player: Player): void {
    this.players.push(player);
  }

  removePlayer(playerId: string): void {
    this.players = this.players.filter(p => p.id !== playerId);
  }

  getPlayerState(p: Player): Player | undefined {
    return this.players.find(player => player.id === p.id);
  }

  canPlayerAct(p: Player): boolean {
    const player = this.getPlayerState(p);
    return player ? player.isActive : false;
  }

  calculateBet(p: Player): number {
    return p.chips > 0 ? p.chips : 0;
  }

  applyBet(player: Player, amount: number): void {
    const existingPlayer = this.getPlayerState(player);
    if (existingPlayer) {
      existingPlayer.chips -= amount;
      this.pot += amount;
    }
  }

  getState(): GameState {
    return {
      pot: this.pot,
      communityCards: this.communityCards,
      players: this.players,
      currentTurn: this.players[this.currentTurn]?.id || '',
      phase: 'PREFLOP'
    };
  }
}
