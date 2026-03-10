// server/src/logic/GameTable.ts
// QUANTUM BLUFF - GAME STATE ENGINE (Azra + Soheil Phase 3)
// Compatible 100% avec tes Deck.ts + Evaluator.ts + types poker.ts

import type { GameState, Player, Card, GamePhase } from '../types/poker';
import { 
  generateDeck, 
  shuffle, 
  dealInitialCards, 
  dealFlop, 
  dealTurn, 
  dealRiver, 
  findWinner 
} from './Deck';
import { getHandValue } from './Evaluator';

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

  /** Démarre une nouvelle main */
  startHand(): void {
    // 1. Nouveau deck (TES fonctions Deck.ts)
    this.deck = generateDeck();
    shuffle(this.deck);
    
    // 2. Distribue 2 cartes par joueur (round-robin)
    dealInitialCards(this.deck, this.state.players);
    
    // 3. Reset état
    this.state = {
      ...this.state,
      pot: 0,
      communityCards: [],
      phase: 'PREFLOP',
      currentTurn: this.state.players[0]?.id || ''
    };
  }

  /** Action joueur (FOLD/CALL/RAISE) */
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
        player.currentBet = 0; // Reset bet
        break;
        
      case 'CALL':
        // TODO: Calculer montant à call
        if (player.chips >= amount!) {
          player.chips -= amount!;
          this.state.pot += amount!;
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

  /** Joueur suivant ou phase suivante */
  private nextTurn(): void {
    const currentIndex = this.state.players.findIndex(p => p.id === this.state.currentTurn);
    let nextIndex = (currentIndex + 1) % this.state.players.length;
    
    // Trouve prochain joueur actif
    while (nextIndex !== currentIndex && 
           !this.state.players[nextIndex].cards?.length) {
      nextIndex = (nextIndex + 1) % this.state.players.length;
    }
    
    this.state.currentTurn = this.state.players[nextIndex].id;

    // TODO: Si betting round fini → avance phase
    // this.advancePhase();
  }

  /** Avance à la phase suivante */
  advancePhase(): void {
    const phaseOrder: GamePhase[] = ['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'];
    const currentIndex = phaseOrder.indexOf(this.state.phase);
    
    if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) return;

    const nextPhase = phaseOrder[currentIndex + 1];
    
    switch (nextPhase) {
      case 'FLOP':
        this.state.communityCards.push(...dealFlop(this.deck)); // ✅ TES fonctions
        break;
      case 'TURN':
        this.state.communityCards.push(dealTurn(this.deck));    // ✅ TES fonctions
        break;
      case 'RIVER':
        this.state.communityCards.push(dealRiver(this.deck));   // ✅ TES fonctions
        break;
      case 'SHOWDOWN':
        this.resolveShowdown();                                 // ✅ Evaluator
        break;
    }
    
    this.state.phase = nextPhase;
    this.state.currentTurn = this.state.players[0]?.id || '';
  }

  /** Résout le showdown */
  private resolveShowdown(): void {
    const winnerId = findWinner(this.state.players, this.state.communityCards); // ✅ TES Evaluator
    const winner = this.state.players.find(p => p.id === winnerId);
    
    if (winner) {
      winner.chips += this.state.pot;
      console.log(`🏆 ${winner.name} gagne ${this.state.pot} jetons`);
    }
    
    this.state.pot = 0;
  }

  /** État censuré pour frontend (Fog of War) */
  getSanitizedState(requestingPlayerId?: string) {
    return {
      id: this.id,
      phase: this.state.phase,
      pot: this.state.pot,
      communityCards: this.state.communityCards,
      currentTurn: this.state.currentTurn,
      players: this.state.players.map(player => ({
        ...player,
        cards: player.id === requestingPlayerId ? player.cards : [] // ✅ Anti-cheat
      }))
    };
  }
}

