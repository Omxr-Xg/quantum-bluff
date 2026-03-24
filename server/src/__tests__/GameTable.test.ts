import { GameTable } from "../logic/GameTable.js";
import type { Player } from "../types/poker.js";

const createPlayers = (): Player[] => [
  {
    id: "p1",
    name: "Azra",
    cards: [],
    chips: 1000,
    role: "PLAYER",
    isActive: true,
    position: 0,
    isConnected: true,
  },
  {
    id: "p2",
    name: "Soheil",
    cards: [],
    chips: 1000,
    role: "PLAYER",
    isActive: true,
    position: 1,
    isConnected: true,
  },
  {
    id: "p3",
    name: "Lina",
    cards: [],
    chips: 1000,
    role: "PLAYER",
    isActive: true,
    position: 2,
    isConnected: true,
  },
];

describe("GameTable - Moteur Principal", () => {
  let table: GameTable;

  beforeEach(() => {
    table = new GameTable("room1", createPlayers());
  });

  test("constructor initialise GameState PREFLOP", () => {
    expect(table.state.phase).toBe("PREFLOP");
    expect(table.state.pot).toBe(0);
    expect(table.state.currentTurn).toBe("p1");
  });

  test("getSanitizedState structure + Fog of War", () => {
    table.startHand();
    const state = table.getSanitizedState("p1");

    expect(state).toHaveProperty("id", "room1");
    expect(state).toHaveProperty("phase", "PREFLOP");
    expect(state).toHaveProperty("pot", 30);
    expect(state.players).toHaveLength(3);

    expect(state.players[0]).toHaveProperty("id");
    expect(state.players[0]).toHaveProperty("name");
    expect(state.players[0]).toHaveProperty("chips");
    expect(state.players[0]).toHaveProperty("currentBet");
    expect(state.players[0]).toHaveProperty("role");
    expect(state.players[0]).toHaveProperty("isActive");
    expect(state.players[0]).toHaveProperty("cards");

    expect(state.players.find((p) => p.id === "p1")?.cards).toHaveLength(2);
    expect(state.players.find((p) => p.id === "p2")?.cards).toHaveLength(0);
    expect(state.players.find((p) => p.id === "p3")?.cards).toHaveLength(0);
  });

  test("impossible de jouer avant startHand", () => {
    expect(() => table.handlePlayerAction("p1", "CALL")).toThrow(
      "La main n’a pas commencé",
    );
  });

  test("startHand distribue les cartes, assigne les rôles et poste les blinds", () => {
    table.startHand();

    expect(table.state.phase).toBe("PREFLOP");
    expect(table.state.communityCards).toHaveLength(0);
    expect(table.state.pot).toBe(30);

    expect(table.getPlayerState("p1")?.cards).toHaveLength(2);
    expect(table.getPlayerState("p2")?.cards).toHaveLength(2);
    expect(table.getPlayerState("p3")?.cards).toHaveLength(2);

    expect(table.getPlayerState("p1")?.role).toBe("DEALER");
    expect(table.getPlayerState("p2")?.role).toBe("SMALL_BLIND");
    expect(table.getPlayerState("p3")?.role).toBe("BIG_BLIND");

    expect(table.getPlayerState("p1")?.chips).toBe(1000);
    expect(table.getPlayerState("p2")?.chips).toBe(990);
    expect(table.getPlayerState("p3")?.chips).toBe(980);
  });

  test("préflop : le premier à parler est le joueur à gauche de la big blind", () => {
    table.startHand();

    expect(table.state.currentTurn).toBe("p1");
    expect(table.canPlayerAct("p1")).toBe(true);
    expect(table.canPlayerAct("p2")).toBe(false);
    expect(table.canPlayerAct("p3")).toBe(false);
  });

  test("postflop : le premier à parler est le joueur à gauche du dealer", () => {
    table.startHand();
    table.advancePhase();

    expect(table.state.phase).toBe("FLOP");
    expect(table.state.communityCards).toHaveLength(3);
    expect(table.state.currentTurn).toBe("p2");
  });

  test("les positions tournent correctement après chaque main", () => {
    table.startHand();

    expect(table.getPlayerState("p1")?.role).toBe("DEALER");
    expect(table.getPlayerState("p2")?.role).toBe("SMALL_BLIND");
    expect(table.getPlayerState("p3")?.role).toBe("BIG_BLIND");

    table.startHand();

    expect(table.getPlayerState("p2")?.role).toBe("DEALER");
    expect(table.getPlayerState("p3")?.role).toBe("SMALL_BLIND");
    expect(table.getPlayerState("p1")?.role).toBe("BIG_BLIND");
  });

  test("CHECK est interdit quand une mise est à suivre", () => {
    table.startHand();

    expect(table.calculateCallAmount("p1")).toBe(20);
    expect(() => table.handlePlayerAction("p1", "CHECK")).toThrow(
      "Impossible de check, une mise est à suivre",
    );
  });

  test("CALL est autorisé quand une mise est à suivre", () => {
    table.startHand();

    expect(table.calculateCallAmount("p1")).toBe(20);
    expect(() => table.handlePlayerAction("p1", "CALL")).not.toThrow();
  });

  test("pas ton tour déclenche une erreur", () => {
    table.startHand();

    expect(() => table.handlePlayerAction("p2", "CALL")).toThrow(
      "Pas ton tour !",
    );
  });

  test("deux folds successifs donnent le pot au dernier joueur restant", () => {
    table.startHand();

    table.handlePlayerAction("p1", "FOLD");
    table.handlePlayerAction("p2", "FOLD");

    expect(table.state.phase).toBe("SHOWDOWN");
    expect(table.state.pot).toBe(0);

    const p3 = table.getPlayerState("p3");
    expect(p3?.chips).toBe(1010);
  });

  test("advancePhase fait progresser FLOP -> TURN -> RIVER -> SHOWDOWN", () => {
    table.startHand();

    table.advancePhase();
    expect(table.state.phase).toBe("FLOP");
    expect(table.state.communityCards).toHaveLength(3);

    table.advancePhase();
    expect(table.state.phase).toBe("TURN");
    expect(table.state.communityCards).toHaveLength(4);

    table.advancePhase();
    expect(table.state.phase).toBe("RIVER");
    expect(table.state.communityCards).toHaveLength(5);

    table.advancePhase();
    expect(table.state.phase).toBe("SHOWDOWN");
    expect(table.state.currentTurn).toBe("");
  });

  test("si un joueur ne couvre pas totalement sa blind, il poste ce qu’il peut et le pot est ajusté", () => {
    const shortBlindTable = new GameTable("room2", [
      {
        id: "p1",
        name: "Azra",
        cards: [],
        chips: 1000,
        role: "PLAYER",
        isActive: true,
        position: 0,
        isConnected: true,
      },
      {
        id: "p2",
        name: "Soheil",
        cards: [],
        chips: 5,
        role: "PLAYER",
        isActive: true,
        position: 1,
        isConnected: true,
      },
      {
        id: "p3",
        name: "Lina",
        cards: [],
        chips: 1000,
        role: "PLAYER",
        isActive: true,
        position: 2,
        isConnected: true,
      },
    ]);

    shortBlindTable.startHand();

    expect(shortBlindTable.getPlayerState("p1")?.role).toBe("DEALER");
    expect(shortBlindTable.getPlayerState("p2")?.role).toBe("SMALL_BLIND");
    expect(shortBlindTable.getPlayerState("p3")?.role).toBe("BIG_BLIND");

    expect(shortBlindTable.getPlayerState("p2")?.chips).toBe(0);
    expect(shortBlindTable.getPlayerState("p2")?.currentBet).toBe(5);
    expect(shortBlindTable.getPlayerState("p3")?.chips).toBe(980);
    expect(shortBlindTable.state.pot).toBe(25);
  });

  test("un joueur all-in sur la blind est ignoré dans l’ordre de parole", () => {
    const shortBlindTable = new GameTable("room2", [
      {
        id: "p1",
        name: "Azra",
        cards: [],
        chips: 1000,
        role: "PLAYER",
        isActive: true,
        position: 0,
        isConnected: true,
      },
      {
        id: "p2",
        name: "Soheil",
        cards: [],
        chips: 5,
        role: "PLAYER",
        isActive: true,
        position: 1,
        isConnected: true,
      },
      {
        id: "p3",
        name: "Lina",
        cards: [],
        chips: 1000,
        role: "PLAYER",
        isActive: true,
        position: 2,
        isConnected: true,
      },
    ]);

    shortBlindTable.startHand();

    expect(shortBlindTable.state.currentTurn).toBe("p1");

    shortBlindTable.nextTurn();

    expect(shortBlindTable.state.currentTurn).toBe("p3");
  });
});

describe("GameTable - Nouvelles méthodes simplifiées", () => {
  let table: GameTable;

  beforeEach(() => {
    table = new GameTable("room1", createPlayers());
    table.startHand();
  });

  test("nextTurn() passe au joueur suivant", () => {
    expect(table.state.currentTurn).toBe("p1");
    table.nextTurn();
    expect(table.state.currentTurn).toBe("p2");
  });

  test("bettingRoundComplete() détecte que le tour n’est pas terminé au départ", () => {
    expect(table.bettingRoundComplete()).toBe(false);
  });

  test("endBettingRound() ne change rien si le tour n’est pas complet", () => {
    const initialPhase = table.state.phase;
    table.endBettingRound();
    expect(table.state.phase).toBe(initialPhase);
  });

  test("handlePlayerAction() avec CHECK lance une erreur si une mise est à suivre", () => {
    const currentPlayerId = table.state.currentTurn;

    expect(() => table.handlePlayerAction(currentPlayerId, "CHECK")).toThrow(
      "Impossible de check, une mise est à suivre",
    );
  });

  test("handlePlayerAction() avec RAISE fonctionne", () => {
    const currentPlayerId = table.state.currentTurn;

    expect(() =>
      table.handlePlayerAction(currentPlayerId, "RAISE", 30),
    ).not.toThrow();

    const player = table.getPlayerState(currentPlayerId);
    expect(player).toBeDefined();
    expect(player!.currentBet).toBeGreaterThan(20);
    expect(table.state.pot).toBeGreaterThan(30);
    expect(table.state.currentTurn).not.toBe(currentPlayerId);
  });

  test("handlePlayerAction() avec CALL fonctionne", () => {
    const currentPlayerId = table.state.currentTurn;
    expect(() =>
      table.handlePlayerAction(currentPlayerId, "CALL"),
    ).not.toThrow();
  });

  test("handlePlayerAction() avec FOLD fonctionne", () => {
    const currentPlayerId = table.state.currentTurn;
    expect(() =>
      table.handlePlayerAction(currentPlayerId, "FOLD"),
    ).not.toThrow();
    expect(table.getPlayerState(currentPlayerId)?.isActive).toBe(false);
  });
});
