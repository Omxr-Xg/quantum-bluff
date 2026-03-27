import type { Card, GamePhase, GameState, Player } from "../types/poker.js";
import { Deck } from "./Deck.js";
import { findWinnersWithHand } from "./Evaluator.js";
import { intChips } from "../utils/chips.js";

type PlayerAction = "FOLD" | "CALL" | "RAISE" | "CHECK";

const RANK_VALUE: Record<string, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

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

  constructor(
    id: string,
    players: Player[],
    options?: { smallBlind?: number; bigBlind?: number },
  ) {
    this.id = id;
    this.deck = new Deck();
    this.dealerIndex = 0;
    this.highestBet = 0;
    this.actedPlayerIds = new Set();
    this.handStarted = false;
    this.smallBlindAmount = intChips(options?.smallBlind ?? 10);
    this.bigBlindAmount = intChips(options?.bigBlind ?? 20);
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
      player.totalPutInThisHand = player.totalPutInThisHand ?? 0;
      player.isActive = player.isActive ?? true;
      player.position = index;
      player.isDealer = false;
      player.isConnected = player.isConnected ?? true;
      player.role = player.role ?? "PLAYER";
    });
  }

  private getConnectedPlayers(): Player[] {
    return this.state.players.filter((player) => player.isConnected !== false);
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
        player.chips > 0 &&
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
        player.chips > 0 &&
        !this.allInPlayerIds.has(player.id)
      ) {
        return index;
      }
    }

    return -1;
  }

  private rotateDealerForNewHand(): void {
    const eligiblePlayers = this.getPlayersEligibleForNewHand();

    if (eligiblePlayers.length < 2) {
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

    const eligibleCount = this.getPlayersEligibleForNewHand().length;
    if (eligibleCount < 2 || this.state.players.length === 0) {
      return;
    }

    const dealer = this.state.players[this.dealerIndex];
    if (!dealer || dealer.isConnected === false || dealer.chips <= 0) {
      return;
    }

    dealer.isDealer = true;

    if (eligibleCount === 2) {
      dealer.role = "SMALL_BLIND";

      const bigBlindIndex = this.getNextHandEligiblePlayerIndex(
        this.dealerIndex,
      );
      if (bigBlindIndex === -1) return;

      this.state.players[bigBlindIndex].role = "BIG_BLIND";
      return;
    }

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

    const blindAmount = intChips(Math.min(amount, player.chips));

    player.chips -= blindAmount;
    player.currentBet = blindAmount;
    player.bet = blindAmount;
    player.totalPutInThisHand = (player.totalPutInThisHand ?? 0) + blindAmount;

    this.state.pot += blindAmount;
    this.highestBet = Math.max(this.highestBet, blindAmount);

    this.markPlayerAllInIfNeeded(player);
  }

  private setBlinds(): void {
    if (this.getPlayersEligibleForNewHand().length < 2) return;

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

    if (activePlayers.length <= 1) {
      return true;
    }

    return activePlayers.every((player) => {
      if (player.chips === 0 || this.allInPlayerIds.has(player.id)) {
        return true;
      }

      return (
        this.actedPlayerIds.has(player.id) &&
        (player.currentBet || 0) === this.highestBet
      );
    });
  }

  private awardPotToSingleRemainingPlayer(): void {
    const activePlayers = this.getActivePlayers();

    if (activePlayers.length !== 1) return;

    const winner = activePlayers[0];
    const awardedPot = this.state.pot;

    winner.chips += awardedPot;
    this.state.showdownWinnerId = winner.id;
    this.state.showdownWinnerIds = [winner.id];
    this.state.showdownIsSplit = false;
    this.state.showdownHandName = "Gagne par abandon";
    this.state.showdownPot = awardedPot;
    this.state.pot = 0;
    this.state.phase = "SHOWDOWN";
    this.state.currentTurn = "";
  }

  endGameDueToDisconnect(): { winnerId: string; pot: number } | null {
    const connected = this.state.players.filter(
      (player) => player.isConnected !== false,
    );

    if (this.state.players.length !== 2 || connected.length !== 1) {
      return null;
    }

    const winner = connected[0];
    const awardedPot = this.state.pot;

    winner.chips += awardedPot;
    this.state.showdownWinnerId = winner.id;
    this.state.showdownWinnerIds = [winner.id];
    this.state.showdownIsSplit = false;
    this.state.showdownHandName = "Victoire par déconnexion";
    this.state.showdownPot = awardedPot;
    this.state.pot = 0;
    this.state.phase = "SHOWDOWN";
    this.state.currentTurn = "";

    return { winnerId: winner.id, pot: awardedPot };
  }

  forceFoldForDisconnect(_playerId: string): void {
    if (this.getActivePlayers().length === 1) {
      this.awardPotToSingleRemainingPlayer();
    }
  }

  private processUncalledBetsRefund(): void {
    const activePlayers = this.getActivePlayers();
    if (activePlayers.length < 2) return;

    const allWithContrib = this.state.players.filter(
      (player) => (player.totalPutInThisHand ?? player.currentBet ?? 0) > 0,
    );
    if (allWithContrib.length < 2) return;

    for (const player of activePlayers) {
      const contrib = player.totalPutInThisHand ?? player.currentBet ?? 0;
      const maxOther = Math.max(
        0,
        ...allWithContrib
          .filter((p) => p.id !== player.id)
          .map((p) => p.totalPutInThisHand ?? p.currentBet ?? 0),
      );

      const refund = intChips(Math.max(0, contrib - maxOther));

      if (refund > 0) {
        player.chips += refund;
        player.totalPutInThisHand =
          (player.totalPutInThisHand ?? contrib) - refund;
        this.state.pot -= refund;
      }
    }
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

    this.processUncalledBetsRefund();

    const nextPhase = phaseOrder[currentIndex + 1];
    this.state.phase = nextPhase;

    if (nextPhase === "FLOP") {
      this.resetBetsForNewRound();
      this.state.communityCards.push(...this.deck.dealFlop());
      this.state.currentTurn = this.getPostflopFirstPlayerId();
      this.runOutBoardIfNoMoreActionPossible();
      return;
    }

    if (nextPhase === "TURN") {
      this.resetBetsForNewRound();
      this.state.communityCards.push(this.deck.dealTurn());
      this.state.currentTurn = this.getPostflopFirstPlayerId();
      this.runOutBoardIfNoMoreActionPossible();
      return;
    }

    if (nextPhase === "RIVER") {
      this.resetBetsForNewRound();
      this.state.communityCards.push(this.deck.dealRiver());
      this.state.currentTurn = this.getPostflopFirstPlayerId();
      this.runOutBoardIfNoMoreActionPossible();
      return;
    }

    this.resolveShowdown();
    this.state.currentTurn = "";
  }

  private runOutBoardIfNoMoreActionPossible(): void {
    const activePlayers = this.getActivePlayers();
    const playersAbleToAct = this.getPlayersAbleToAct();

    if (activePlayers.length <= 1 || playersAbleToAct.length > 1) {
      return;
    }

    const phaseOrder: GamePhase[] = [
      "PREFLOP",
      "FLOP",
      "TURN",
      "RIVER",
      "SHOWDOWN",
    ];

    let phase: GamePhase = this.state.phase;

    while (phase !== "SHOWDOWN") {
      const currentIndex = phaseOrder.indexOf(phase);
      const nextPhase = phaseOrder[currentIndex + 1];

      if (nextPhase === "FLOP") {
        this.resetBetsForNewRound();
        this.state.communityCards.push(...this.deck.dealFlop());
      } else if (nextPhase === "TURN") {
        this.resetBetsForNewRound();
        this.state.communityCards.push(this.deck.dealTurn());
      } else if (nextPhase === "RIVER") {
        this.resetBetsForNewRound();
        this.state.communityCards.push(this.deck.dealRiver());
      }

      this.state.phase = nextPhase;
      phase = nextPhase;
    }

    this.state.currentTurn = "";
    this.resolveShowdown();
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

  startHand(forcedHoleCards?: Record<string, Card[]>): void {
    if (this.getPlayersEligibleForNewHand().length < 2) {
      throw new Error(
        "Il faut au moins 2 joueurs connectés avec des jetons pour démarrer",
      );
    }

    this.rotateDealerForNewHand();
    this.handStarted = true;
    this.deck = new Deck();
    this.deck.shuffle();
    this.state.pot = 0;
    this.state.communityCards = [];
    this.state.phase = "PREFLOP";
    this.state.currentTurn = "";
    this.highestBet = 0;
    this.actedPlayerIds.clear();
    this.allInPlayerIds.clear();
    this.state.showdownWinnerId = undefined;
    this.state.showdownWinnerIds = undefined;
    this.state.showdownIsSplit = undefined;
    this.state.showdownHandName = undefined;
    this.state.showdownPot = undefined;

    for (const player of this.state.players) {
      player.cards = [];
      player.currentBet = 0;
      player.bet = 0;
      player.totalPutInThisHand = 0;
      player.isActive = player.isConnected !== false && player.chips > 0;
      player.isDealer = false;
      player.role = "PLAYER";
    }

    this.setBlinds();

    const playersInHand = this.getActivePlayers();

    if (forcedHoleCards && Object.keys(forcedHoleCards).length > 0) {
      const allForced: Card[] = [];

      for (const pid of Object.keys(forcedHoleCards)) {
        const cards = forcedHoleCards[pid];
        if (!Array.isArray(cards) || cards.length !== 2) continue;

        const player = playersInHand.find((p) => p.id === pid);
        if (!player) continue;

        player.cards = cards.map((card) => ({
          suit: card.suit,
          rank: card.rank,
          value: card.value ?? RANK_VALUE[card.rank] ?? 2,
        }));

        allForced.push(...player.cards);
      }

      this.deck.removeCards(allForced);

      for (const player of playersInHand) {
        if (player.cards.length === 0) {
          const c1 = this.deck.draw(1)[0];
          const c2 = this.deck.draw(1)[0];
          player.cards = [c1, c2];
        }
      }
    } else {
      this.deck.dealInitialCards(playersInHand);
    }

    this.state.currentTurn = this.getPreflopFirstPlayerId();
  }

  addPlayer(player: Player): void {
    player.cards = Array.isArray(player.cards) ? player.cards : [];
    player.currentBet = 0;
    player.bet = 0;
    player.totalPutInThisHand = player.totalPutInThisHand ?? 0;
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

  getMinRaise(): number {
    return this.bigBlindAmount;
  }

  canPlayerAct(playerId: string): boolean {
    const player = this.getPlayerState(playerId);

    return (
      !!player &&
      player.isActive &&
      player.isConnected !== false &&
      !this.allInPlayerIds.has(player.id) &&
      this.state.currentTurn === playerId
    );
  }

  calculateBet(playerId: string, amount: number): number {
    const player = this.getPlayerState(playerId);
    return player ? intChips(Math.min(amount, player.chips)) : 0;
  }

  calculateCallAmount(playerId: string): number {
    const player = this.getPlayerState(playerId);
    if (!player) return 0;
    return intChips(Math.max(0, this.highestBet - (player.currentBet || 0)));
  }

  applyBet(playerId: string, amount: number): void {
    const playerIndex = this.getPlayerIndexById(playerId);
    if (playerIndex === -1) return;

    const player = this.state.players[playerIndex];
    const betAmount = intChips(Math.min(amount, player.chips));

    player.chips -= betAmount;
    this.state.pot += betAmount;
    player.currentBet = (player.currentBet || 0) + betAmount;
    player.bet = player.currentBet;
    player.totalPutInThisHand = (player.totalPutInThisHand ?? 0) + betAmount;
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

    if (action === "CALL" && player.chips <= 0) {
      throw new Error("Pas de jetons pour suivre");
    }

    if (action === "CALL" && callAmount <= 0) {
      throw new Error("Rien à suivre");
    }

    if (action === "RAISE") {
      if (typeof amount !== "number" || amount <= 0) {
        throw new Error("Montant de relance invalide");
      }

      const raiseAmount = intChips(amount);

      if (raiseAmount < this.bigBlindAmount) {
        throw new Error(`La relance minimum est de ${this.bigBlindAmount}`);
      }

      const totalToPut = intChips(callAmount + raiseAmount);

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
      const actualCallAmount = intChips(Math.min(callAmount, player.chips));

      player.chips -= actualCallAmount;
      player.currentBet = (player.currentBet || 0) + actualCallAmount;
      player.bet = player.currentBet;
      player.totalPutInThisHand =
        (player.totalPutInThisHand ?? 0) + actualCallAmount;
      this.state.pot += actualCallAmount;

      this.markPlayerAllInIfNeeded(player);
      this.actedPlayerIds.add(player.id);

      if (this.isBettingRoundComplete()) {
        this.moveToNextPhase();
        return;
      }

      this.advanceTurn();
      return;
    }

    const raiseAmount = intChips(amount as number);
    const totalToPut = intChips(callAmount + raiseAmount);

    player.chips -= totalToPut;
    player.currentBet = (player.currentBet || 0) + totalToPut;
    player.bet = player.currentBet;
    player.totalPutInThisHand = (player.totalPutInThisHand ?? 0) + totalToPut;
    this.state.pot += totalToPut;
    this.highestBet = player.currentBet || 0;

    this.markPlayerAllInIfNeeded(player);
    this.actedPlayerIds.clear();
    this.actedPlayerIds.add(player.id);

    if (this.isBettingRoundComplete()) {
      this.moveToNextPhase();
      return;
    }

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
    const allPlayers = this.state.players;

    if (playersToEvaluate.length === 0) {
      this.state.pot = 0;
      return;
    }

    const totalPot = this.state.pot;
    const levels = [
      ...new Set(
        playersToEvaluate.map(
          (player) => player.totalPutInThisHand ?? player.currentBet ?? 0,
        ),
      ),
    ]
      .filter((level) => level > 0)
      .sort((a, b) => a - b);

    if (levels.length === 0) {
      const { winnerIds, handName } = findWinnersWithHand(
        playersToEvaluate,
        this.state.communityCards,
      );

      this.state.showdownWinnerId = winnerIds[0] ?? "";
      this.state.showdownWinnerIds = winnerIds;
      this.state.showdownIsSplit = winnerIds.length > 1;
      this.state.showdownHandName = handName;
      this.state.showdownPot = totalPot;
      this.state.pot = 0;
      return;
    }

    let distributed = 0;
    let lastWinnerId = "";
    let lastWinnerIds: string[] = [];
    let lastHandName = "";

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      const prevLevel = i === 0 ? 0 : levels[i - 1];
      const diff = level - prevLevel;
      if (diff <= 0) continue;

      const eligible = playersToEvaluate.filter(
        (player) =>
          (player.totalPutInThisHand ?? player.currentBet ?? 0) >= level,
      );
      if (eligible.length === 0) continue;

      let potSize = 0;

      for (const player of allPlayers) {
        const contrib = player.totalPutInThisHand ?? player.currentBet ?? 0;
        const contributionAtThisLevel = Math.min(
          Math.max(0, contrib - prevLevel),
          diff,
        );
        potSize += contributionAtThisLevel;
      }

      if (potSize <= 0) continue;

      const { winnerIds, handName } = findWinnersWithHand(
        eligible,
        this.state.communityCards,
      );

      const share =
        winnerIds.length > 0 ? Math.floor(potSize / winnerIds.length) : 0;
      const remainder = potSize - share * winnerIds.length;

      for (let j = 0; j < winnerIds.length; j++) {
        const winnerId = winnerIds[j];
        const winner = this.state.players.find(
          (player) => player.id === winnerId,
        );

        if (winner) {
          let amount = share;
          if (j === 0) amount += remainder;
          winner.chips += amount;
          distributed += amount;
        }
      }

      lastWinnerId = winnerIds[0] ?? lastWinnerId;
      lastWinnerIds = winnerIds;
      lastHandName = handName;
    }

    const remaining = totalPot - distributed;
    if (remaining > 0 && lastWinnerId) {
      const winner = this.state.players.find(
        (player) => player.id === lastWinnerId,
      );
      if (winner) {
        winner.chips += remaining;
      }
    }

    this.state.pot = 0;
    this.state.showdownWinnerId = lastWinnerId;
    this.state.showdownWinnerIds = lastWinnerIds;
    this.state.showdownIsSplit = lastWinnerIds.length > 1;
    this.state.showdownHandName = lastHandName;
    this.state.showdownPot = totalPot;
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
      showdownWinnerId: this.state.showdownWinnerId,
      showdownWinnerIds: this.state.showdownWinnerIds,
      showdownIsSplit: this.state.showdownIsSplit,
      showdownHandName: this.state.showdownHandName,
      showdownPot: this.state.showdownPot,
      burnedCardsCount: this.deck.burnedCards.length,
    };
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
      burnedCardsCount: this.deck.burnedCards.length,
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
        cards:
          this.state.phase === "SHOWDOWN"
            ? this.state.showdownHandName === "Gagne par abandon"
              ? player.id === requestingPlayerId &&
                player.id === this.state.showdownWinnerId
                ? player.cards
                : []
              : player.isActive
                ? player.cards
                : []
            : player.id === requestingPlayerId
              ? player.cards
              : [],
      })),
    };
  }
}
