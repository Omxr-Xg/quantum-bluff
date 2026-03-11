import type { GameState, Player, GamePhase } from '../types/poker.js';
import { Deck } from './Deck.js';
import { findWinner } from './Evaluator.js';
// Supprimé: Card (inutilisé)
// Supprimé: getHandValue (inutilisé)

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

  // Initialiser une nouvelle main
  startHand(): void {
    this.deck = new Deck();
    this.deck.shuffle();
    this.deck.dealInitialCards(this.state.players);
    
    this.state = {
      ...this.state,
      pot: 0,
      communityCards: [],
      phase: 'PREFLOP',
      currentTurn: this.state.players[0]?.id || ''
    };
  }

  // Ajouter un joueur
  addPlayer(player: Player): void {
    this.state.players.push(player);
  }

  // Retirer un joueur
  removePlayer(playerId: string): void {
    this.state.players = this.state.players.filter(p => p.id !== playerId);
  }

  // Obtenir l'état d'un joueur
  getPlayerState(playerId: string): Player | undefined {
    return this.state.players.find(p => p.id === playerId);
  }

  // Vérifier si un joueur peut agir
  canPlayerAct(playerId: string): boolean {
    const player = this.getPlayerState(playerId);
    return player ? player.isActive : false;
  }

  // Calculer une mise
  calculateBet(playerId: string, amount: number): number {
    const player = this.getPlayerState(playerId);
    return player ? Math.min(amount, player.chips) : 0;
  }

  // Appliquer une mise
  applyBet(playerId: string, amount: number): void {
    const playerIndex = this.state.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    const player = this.state.players[playerIndex];
    const betAmount = Math.min(amount, player.chips);
    
    player.chips -= betAmount;
    this.state.pot += betAmount;
    player.currentBet = (player.currentBet || 0) + betAmount;
  }

  // Gérer une action de joueur
  handlePlayerAction(
    playerId: string, 
    action: 'FOLD' | 'CALL' | 'RAISE' | 'CHECK', 
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
      case 'CHECK':
        // Rien à faire
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
          throw new Error("Pas assez de jetons");
        }
        player.chips -= amount;
        player.currentBet = (player.currentBet || 0) + amount;
        this.state.pot += amount;
        break;
    }

    this.nextTurn();
  }

  // Passer au joueur suivant
  private nextTurn(): void {
    const currentIndex = this.state.players.findIndex(p => p.id === this.state.currentTurn);
    let nextIndex = (currentIndex + 1) % this.state.players.length;
    
    // Ignorer les joueurs inactifs (foldés)
    while (nextIndex !== currentIndex && 
           (!this.state.players[nextIndex].cards?.length || 
            !this.state.players[nextIndex].isActive)) {
      nextIndex = (nextIndex + 1) % this.state.players.length;
    }
    
    this.state.currentTurn = this.state.players[nextIndex].id;
  }

  // Avancer à la phase suivante
  advancePhase(): void {
    const phaseOrder: GamePhase[] = ['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'];
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

  // Résoudre le showdown (déterminer le gagnant)
  private resolveShowdown(): void {
    const winnerId = findWinner(this.state.players, this.state.communityCards);
    const winner = this.state.players.find(p => p.id === winnerId);
    
    if (winner) {
      winner.chips += this.state.pot;
    }
    
    this.state.pot = 0;
  }

  // Obtenir l'état complet de la table
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

  // Obtenir l'état filtré pour un joueur (sans voir les cartes des autres)
  getSanitizedState(requestingPlayerId?: string): GameState {
    return {
      id: this.id,
      pot: this.state.pot,
      communityCards: this.state.communityCards,
      currentTurn: this.state.currentTurn,
      phase: this.state.phase,
      players: this.state.players.map(player => ({
        id: player.id,
        name: player.name,
        chips: player.chips,
        bet: player.currentBet || 0,
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