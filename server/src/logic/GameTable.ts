// server/src/logic/GameTable.ts
// QUANTUM BLUFF - GAME STATE ENGINE (Azra + Soheil Phase 3)
// ✅ ESLint + TypeScript + Pipeline GitLab OK

import type { GameState, Player, GamePhase } from '../types/poker';
import { 
  generateDeck, 
  shuffle, 
  dealInitialCards, 
  dealFlop, 
  dealTurn, 
  dealRiver 
} from './Deck';
import { findWinner } from './Evaluator';

export class GameTable {
  public readonly id: string;
  private deck: ReturnType<typeof generateDeck>;
  public state: GameState;

  constructor(id: string, players: Player[]) {
    this.id = id;
    this.state = {
      pot: 0,
      communityCards: [],
      players,
      currentTurn: players[0]?.id || '',
      phase: 'PREFLOP' as GamePhase
    };
  }

  startHand(): void {
    this.deck = generateDeck();
    shuffle(this.deck);
    dealInitialCards(this.deck, this.state.players);
    
    this.state = {
      ...this.state,
      pot: 0,
      communityCards: [],
      phase: 'PREFLOP',
      currentTurn: this.state.players[0]?.id || ''
    };
  }

  handlePlayerAction(
    playerId: string, 
    action: 'FOLD' | 'CALL' | 'RAISE', 
    amount?: number
  ): void {
    const playerIndex = this.state.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1 || this.state.players[playerIndex].id !== this.state.currentTurn) {
      throw new Error("Pas ton tour !");
    }

    const player = this.state.players[playerIndex];
    
    switch (action) {
      case 'FOLD':
        player.currentBet = 0;
        break;
      case 'CALL':
        if (player.chips >= (amount || 0)) {
          const callAmount = amount || 0;
          player.chips -= callAmount;
          this.state.pot += callAmount;
        }
        break;
      case 'RAISE':
        if (!amount || amount > player.chips) {
          throw new Error("Pas assez de jetons");
        }
        player.chips -= amount;
        player.currentBet = amount;
        this.state.pot += amount;
        break;
    }

    this.nextTurn();
  }

  private nextTurn(): void {
    const currentIndex = this.state.players.findIndex(p => p.id === this.state.currentTurn);
    let nextIndex = (currentIndex + 1) % this.state.players.length;
    
    while (nextIndex !== currentIndex && 
           !this.state.players[nextIndex].cards?.length) {
      nextIndex = (nextIndex + 1) % this.state.players.length;
    }
    
    this.state.currentTurn = this.state.players[nextIndex].id;
  }

  advancePhase(): void {
    const phaseOrder: GamePhase[] = ['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'];
    const currentIndex = phaseOrder.indexOf(this.state.phase);
    
    if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) return;

    const nextPhase = phaseOrder[currentIndex + 1];
    
    switch (nextPhase) {
      case 'FLOP':
        this.state.communityCards.push(...dealFlop(this.deck));
        break;
      case 'TURN':
        this.state.communityCards.push(dealTurn(this.deck));
        break;
      case 'RIVER':
        this.state.communityCards.push(dealRiver(this.deck));
        break;
      case 'SHOWDOWN':
        this.resolveShowdown();
        break;
    }
    
    this.state.phase = nextPhase;
    this.state.currentTurn = this.state.players[0]?.id || '';
  }

  private resolveShowdown(): void {
    const winnerId = findWinner(this.state.players, this.state.communityCards);
    const winner = this.state.players.find(p => p.id === winnerId);
    
    if (winner) {
      winner.chips += this.state.pot;
    }
    
    this.state.pot = 0;
  }

  getSanitizedState(requestingPlayerId?: string) {
    return {
      id: this.id,
      phase: this.state.phase,
      pot: this.state.pot,
      communityCards: this.state.communityCards,
      currentTurn: this.state.currentTurn,
      players: this.state.players.map(player => ({
        ...player,
        cards: player.id === requestingPlayerId ? player.cards : []
      }))
    };
  }
}
