import type { GamePhase, GameState, Player } from "../types/poker.js";
import { Deck } from "./Deck.js";
import { findWinner } from "./Evaluator.js";

type PlayerAction = "FOLD" | "CALL" | "RAISE" | "CHECK";

export class GameTable {
  public readonly id: string;
  private deck: Deck;
  public state: GameState;
  private dealerIndex: number;
  private highestBet: number;
  private actedPlayerIds: Set<string>;
  private handStarted: boolean;
  private readonly smallBlindAmount: number;
  private readonly bigBlindAmount: number;
  private allInPlayerIds: Set<string>;

  constructor(id: string, players: Player[]) {
    this.id = id;
    this.deck = new Deck();
    this.dealerIndex = 0;
    this.highestBet = 0;
    this.actedPlayerIds = new Set();
    this.handStarted = false;
    this.smallBlindAmount = 10;
    this.bigBlindAmount = 20;
    this.allInPlayerIds = new Set();

    this.state = {
      id,
      pot: 0,
      communityCards: [],
      players,
      currentTurn: players[0]?.id || "",
      phase: "PREFLOP",
    };

    this.normalizePlayers();
  }

  private normalizePlayers(): void {
    this.state.players.forEach((player, index) => {
      player.cards = Array.isArray(player.cards) ? player.cards : [];
      player.currentBet = player.currentBet ?? 0;
      player.bet = player.bet ?? 0;
      player.isActive = player.isActive ?? true;
      player.position = index;
      player.isDealer = false;
      player.isConnected = player.isConnected ?? true;
      player.role = player.role ?? "PLAYER";
    });
  }

  private getPlayersEligibleForNewHand(): Player[] {
    return this.state.players.filter(
      (player) => player.isConnected !== false && player.chips > 0,
    );
  }

  private getActivePlayers(): Player[] {
    return this.state.players.filter(
      (player) => player.isActive && player.isConnected !== false,
    );
  }

  private getPlayersAbleToAct(): Player[] {
    return this.state.players.filter(
      (player) =>
        player.isActive &&
        player.isConnected !== false &&
        !this.allInPlayerIds.has(player.id),
    );
  }

  private getPlayerIndexById(playerId: string): number {
    return this.state.players.findIndex((player) => player.id === playerId);
  }

  private markPlayerAllInIfNeeded(player: Player): void {
    if (player.chips === 0 && player.isActive) {
      this.allInPlayerIds.add(player.id);
    }
  }

  private getNextHandEligiblePlayerIndex(startIndex: number): number {
    if (this.state.players.length === 0) return -1;

    let index = startIndex;

    for (let i = 0; i < this.state.players.length; i++) {
      index =
        (index + 1 + this.state.players.length) % this.state.players.length;
      const player = this.state.players[index];

      if (player.isConnected !== false && player.chips > 0) {
        return index;
      }
    }

    return -1;
  }

  private getNextActingPlayerIndex(startIndex: number): number {
    if (this.state.players.length === 0) return -1;

    let index = startIndex;

    for (let i = 0; i < this.state.players.length; i++) {
      index =
        (index + 1 + this.state.players.length) % this.state.players.length;
      const player = this.state.players[index];

      if (
        player.isActive &&
        player.isConnected !== false &&
        !this.allInPlayerIds.has(player.id)
      ) {
        return index;
      }
    }

    return -1;
  }

  private rotateDealerForNewHand(): void {
    const eligiblePlayers = this.getPlayersEligibleForNewHand();

    if (eligiblePlayers.length < 3) {
      return;
    }

    const startIndex = this.handStarted
      ? this.dealerIndex
      : this.dealerIndex - 1;
    const nextDealerIndex = this.getNextHandEligiblePlayerIndex(startIndex);

    if (nextDealerIndex !== -1) {
      this.dealerIndex = nextDealerIndex;
    }
  }

  private assignPositionsAndRoles(): void {
    this.state.players.forEach((player, index) => {
      player.position = index;
      player.isDealer = false;
      player.role = "PLAYER";
      player.currentBet = 0;
      player.bet = 0;
    });

    const eligiblePlayers = this.getPlayersEligibleForNewHand();
    if (eligiblePlayers.length < 3 || this.state.players.length === 0) {
      return;
    }

    const dealer = this.state.players[this.dealerIndex];
    if (!dealer || dealer.isConnected === false || dealer.chips <= 0) {
      return;
    }

    dealer.isDealer = true;
    dealer.role = "DEALER";

    const smallBlindIndex = this.getNextHandEligiblePlayerIndex(
      this.dealerIndex,
    );
    if (smallBlindIndex === -1) return;

    const bigBlindIndex = this.getNextHandEligiblePlayerIndex(smallBlindIndex);
    if (bigBlindIndex === -1) return;

    this.state.players[smallBlindIndex].role = "SMALL_BLIND";
    this.state.players[bigBlindIndex].role = "BIG_BLIND";
  }

  private postBlind(role: "SMALL_BLIND" | "BIG_BLIND", amount: number): void {
    const player = this.state.players.find((p) => p.role === role);
    if (!player) return;

    const blindAmount = Math.min(amount, player.chips);

    player.chips -= blindAmount;
    player.currentBet = blindAmount;
    player.bet = blindAmount;

    this.state.pot += blindAmount;
    this.highestBet = Math.max(this.highestBet, blindAmount);

    this.markPlayerAllInIfNeeded(player);
  }

  private setBlinds(): void {
    if (this.getPlayersEligibleForNewHand().length < 3) return;

    this.assignPositionsAndRoles();
    this.postBlind("SMALL_BLIND", this.smallBlindAmount);
    this.postBlind("BIG_BLIND", this.bigBlindAmount);
  }

  private getPreflopFirstPlayerId(): string {
    const bigBlindIndex = this.state.players.findIndex(
      (player) => player.role === "BIG_BLIND",
    );

    if (bigBlindIndex === -1) {
      return "";
    }

    const firstIndex = this.getNextActingPlayerIndex(bigBlindIndex);

    return firstIndex === -1 ? "" : this.state.players[firstIndex].id;
  }

  private getPostflopFirstPlayerId(): string {
    const firstIndex = this.getNextActingPlayerIndex(this.dealerIndex);

    return firstIndex === -1 ? "" : this.state.players[firstIndex].id;
  }

  private resetBetsForNewRound(): void {
    this.highestBet = 0;
    this.actedPlayerIds.clear();

    for (const player of this.state.players) {
      player.currentBet = 0;
      player.bet = 0;
    }
  }

  private isBettingRoundComplete(): boolean {
    const activePlayers = this.getActivePlayers();
    const playersAbleToAct = this.getPlayersAbleToAct();

    if (activePlayers.length <= 1) {
      return true;
    }

    if (playersAbleToAct.length === 0) {
      return true;
    }

    return playersAbleToAct.every(
      (player) =>
        this.actedPlayerIds.has(player.id) &&
        (player.currentBet || 0) === this.highestBet,
    );
  }

  private awardPotToSingleRemainingPlayer(): void {
    const activePlayers = this.getActivePlayers();

    if (activePlayers.length !== 1) return;

    activePlayers[0].chips += this.state.pot;
    this.state.pot = 0;
    this.state.phase = "SHOWDOWN";
    this.state.currentTurn = "";
  }

  private moveToNextPhase(): void {
    const phaseOrder: GamePhase[] = [
      "PREFLOP",
      "FLOP",
      "TURN",
      "RIVER",
      "SHOWDOWN",
    ];
    const currentIndex = phaseOrder.indexOf(this.state.phase);

    if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) {
      return;
    }

    const nextPhase = phaseOrder[currentIndex + 1];
    this.state.phase = nextPhase;

    if (nextPhase === "FLOP") {
      this.resetBetsForNewRound();
      this.state.communityCards.push(...this.deck.dealFlop());
      this.state.currentTurn = this.getPostflopFirstPlayerId();
      return;
    }

    if (nextPhase === "TURN") {
      this.resetBetsForNewRound();
      this.state.communityCards.push(this.deck.dealTurn());
      this.state.currentTurn = this.getPostflopFirstPlayerId();
      return;
    }

    if (nextPhase === "RIVER") {
      this.resetBetsForNewRound();
      this.state.communityCards.push(this.deck.dealRiver());
      this.state.currentTurn = this.getPostflopFirstPlayerId();
      return;
    }

    this.resolveShowdown();
    this.state.currentTurn = "";
  }

  private advanceTurn(): void {
    const currentIndex = this.getPlayerIndexById(this.state.currentTurn);
    const nextIndex =
      currentIndex === -1 ? -1 : this.getNextActingPlayerIndex(currentIndex);

    if (nextIndex === -1) {
      this.state.currentTurn = "";
      return;
    }

    this.state.currentTurn = this.state.players[nextIndex].id;
  }

  startHand(): void {
    if (this.getPlayersEligibleForNewHand().length < 3) {
      throw new Error(
        "Il faut au moins 3 joueurs connectés avec des jetons pour démarrer",
      );
    }

    this.rotateDealerForNewHand();
    this.handStarted = true;
    this.deck = new Deck();
    this.deck.shuffle();
    this.state.pot = 0;
    this.state.communityCards = [];
    this.state.phase = "PREFLOP";
    this.highestBet = 0;
    this.actedPlayerIds.clear();
    this.allInPlayerIds.clear();

    for (const player of this.state.players) {
      player.cards = [];
      player.currentBet = 0;
      player.bet = 0;
      player.isActive = player.isConnected !== false && player.chips > 0;
      player.isDealer = false;
      player.role = "PLAYER";
    }

    this.setBlinds();

    const playersInHand = this.getActivePlayers();
    this.deck.dealInitialCards(playersInHand);

    this.state.currentTurn = this.getPreflopFirstPlayerId();
  }

  addPlayer(player: Player): void {
    player.cards = Array.isArray(player.cards) ? player.cards : [];
    player.currentBet = 0;
    player.bet = 0;
    player.isActive = player.isActive ?? true;
    player.position = this.state.players.length;
    player.isDealer = false;
    player.isConnected = player.isConnected ?? true;
    player.role = "PLAYER";

    this.state.players.push(player);
  }

  removePlayer(playerId: string): void {
    const removedIndex = this.getPlayerIndexById(playerId);

    this.state.players = this.state.players.filter(
      (player) => player.id !== playerId,
    );
    this.allInPlayerIds.delete(playerId);

    this.state.players.forEach((player, index) => {
      player.position = index;
    });

    if (this.state.players.length === 0) {
      this.dealerIndex = 0;
      this.state.currentTurn = "";
      return;
    }

    if (removedIndex !== -1 && removedIndex < this.dealerIndex) {
      this.dealerIndex -= 1;
    }

    if (this.dealerIndex >= this.state.players.length) {
      this.dealerIndex = 0;
    }

    if (this.state.currentTurn === playerId) {
      const fallbackIndex = this.getNextActingPlayerIndex(
        Math.max(0, removedIndex - 1),
      );

      this.state.currentTurn =
        fallbackIndex === -1 ? "" : this.state.players[fallbackIndex].id;
    }
  }

  getPlayerState(playerId: string): Player | undefined {
    return this.state.players.find((player) => player.id === playerId);
  }

  canPlayerAct(playerId: string): boolean {
    const player = this.getPlayerState(playerId);

    return (
      !!player &&
      player.isActive &&
      !this.allInPlayerIds.has(player.id) &&
      this.state.currentTurn === playerId
    );
  }

  calculateBet(playerId: string, amount: number): number {
    const player = this.getPlayerState(playerId);
    return player ? Math.min(amount, player.chips) : 0;
  }

  calculateCallAmount(playerId: string): number {
    const player = this.getPlayerState(playerId);
    if (!player) return 0;
    return Math.max(0, this.highestBet - (player.currentBet || 0));
  }

  applyBet(playerId: string, amount: number): void {
    const playerIndex = this.getPlayerIndexById(playerId);
    if (playerIndex === -1) return;

    const player = this.state.players[playerIndex];
    const betAmount = Math.min(amount, player.chips);

    player.chips -= betAmount;
    this.state.pot += betAmount;
    player.currentBet = (player.currentBet || 0) + betAmount;
    player.bet = player.currentBet;
    this.highestBet = Math.max(this.highestBet, player.currentBet || 0);

    this.markPlayerAllInIfNeeded(player);
  }

  handlePlayerAction(
    playerId: string,
    action: PlayerAction,
    amount?: number,
  ): void {
    const player = this.getPlayerState(playerId);

    if (!player) {
      throw new Error("Joueur introuvable");
    }

    if (!this.handStarted) {
      throw new Error("La main n’a pas commencé");
    }

    if (this.state.phase === "SHOWDOWN") {
      throw new Error("Aucune action possible maintenant");
    }

    if (this.state.currentTurn !== playerId) {
      throw new Error("Pas ton tour !");
    }

    if (!player.isActive) {
      throw new Error("Joueur inactif");
    }

    if (this.allInPlayerIds.has(player.id)) {
      throw new Error("Joueur all-in");
    }

    const callAmount = this.calculateCallAmount(playerId);

    if (action === "CHECK" && callAmount > 0) {
      throw new Error("Impossible de check, une mise est à suivre");
    }

    if (action === "CALL" && callAmount <= 0) {
      throw new Error("Rien à suivre");
    }

    if (action === "CALL" && callAmount > player.chips) {
      throw new Error("Pas assez de jetons pour suivre");
    }

    if (action === "RAISE") {
      if (typeof amount !== "number" || amount <= 0) {
        throw new Error("Montant de relance invalide");
      }

      if (amount < this.bigBlindAmount) {
        throw new Error(`La relance minimum est de ${this.bigBlindAmount}`);
      }

      const totalToPut = callAmount + amount;

      if (totalToPut > player.chips) {
        throw new Error("Pas assez de jetons pour relancer");
      }
    }

    if (action === "FOLD") {
      player.isActive = false;
      this.allInPlayerIds.delete(player.id);
      this.actedPlayerIds.add(player.id);

      if (this.getActivePlayers().length === 1) {
        this.awardPotToSingleRemainingPlayer();
        return;
      }

      if (this.isBettingRoundComplete()) {
        this.moveToNextPhase();
        return;
      }

      this.advanceTurn();
      return;
    }

    if (action === "CHECK") {
      this.actedPlayerIds.add(player.id);

      if (this.isBettingRoundComplete()) {
        this.moveToNextPhase();
        return;
      }

      this.advanceTurn();
      return;
    }

    if (action === "CALL") {
      player.chips -= callAmount;
      player.currentBet = (player.currentBet || 0) + callAmount;
      player.bet = player.currentBet;
      this.state.pot += callAmount;
      this.markPlayerAllInIfNeeded(player);
      this.actedPlayerIds.add(player.id);

      if (this.isBettingRoundComplete()) {
        this.moveToNextPhase();
        return;
      }

      this.advanceTurn();
      return;
    }

    const raiseAmount = amount as number;
    const totalToPut = callAmount + raiseAmount;

    player.chips -= totalToPut;
    player.currentBet = (player.currentBet || 0) + totalToPut;
    player.bet = player.currentBet;
    this.state.pot += totalToPut;
    this.highestBet = player.currentBet || 0;
    this.markPlayerAllInIfNeeded(player);
    this.actedPlayerIds.clear();
    this.actedPlayerIds.add(player.id);

    this.advanceTurn();
  }

  advancePhase(): void {
    if (!this.handStarted) {
      throw new Error("La main n’a pas commencé");
    }

    if (this.state.phase === "SHOWDOWN") {
      return;
    }

    this.moveToNextPhase();
  }

  private resolveShowdown(): void {
    const activePlayers = this.getActivePlayers();
    const playersToEvaluate =
      activePlayers.length > 0 ? activePlayers : this.state.players;

    const winnerId = findWinner(playersToEvaluate, this.state.communityCards);
    const winner = this.state.players.find((player) => player.id === winnerId);

    if (winner) {
      winner.chips += this.state.pot;
    }

    this.state.pot = 0;
  }

  handlePlayerActionExternal(action: PlayerAction, amount?: number): void {
    const player = this.getPlayerState(this.state.currentTurn);
    if (!player) throw new Error("Aucun joueur actif");
    this.handlePlayerAction(player.id, action, amount);
  }

  nextTurn(): void {
    this.advanceTurn();
  }

  bettingRoundComplete(): boolean {
    return this.isBettingRoundComplete();
  }

  endBettingRound(): void {
    if (this.bettingRoundComplete()) {
      this.moveToNextPhase();
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
        cards: player.id === requestingPlayerId ? player.cards : [],
      })),
    };
  }
}
