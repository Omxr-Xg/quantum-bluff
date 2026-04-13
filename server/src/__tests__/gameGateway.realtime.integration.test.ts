import { createServer, type Server as HttpServer } from "node:http";
import { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";
import { Server as SocketIOServer } from "socket.io";
import { io as createClient, Socket as ClientSocket } from "socket.io-client";
import { GameGateway } from "../sockets/game.gateway.js";
import { CashGameController } from "../logic/CashGameController.js";
import { activeGames } from "../shared/activeGames.js";
import { disposeActiveGamesForTests } from "../shared/activeGames.js";
import { pokerStateStore } from "../shared/pokerStateStore.js";
import type { PokerRuntimeSnapshot } from "../poker/store/pokerStateStore.js";

function waitForEvent<T>(
  socket: ClientSocket,
  event: string,
  timeoutMs = 5000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(event, onEvent);
      reject(new Error(`Timeout waiting for ${event}`));
    }, timeoutMs);

    const onEvent = (payload: T) => {
      clearTimeout(timeout);
      socket.off(event, onEvent);
      resolve(payload);
    };

    socket.on(event, onEvent);
  });
}

function makeSnapshot(
  gameId: string,
  overrides: Partial<PokerRuntimeSnapshot> = {},
): PokerRuntimeSnapshot {
  return {
    tableId: gameId,
    gameId,
    handId: "hand-1",
    phase: "PREFLOP",
    actingPlayerId: "u1",
    dealerPosition: 0,
    players: [
      {
        id: "u1",
        name: "u1",
        cards: [
          { rank: "A", suit: "SPADES", value: 14 },
          { rank: "K", suit: "HEARTS", value: 13 },
        ],
        chips: 1000,
        role: "PLAYER",
        isActive: true,
        isConnected: true,
        position: 0,
      },
      {
        id: "u2",
        name: "u2",
        cards: [
          { rank: "Q", suit: "DIAMONDS", value: 12 },
          { rank: "J", suit: "CLUBS", value: 11 },
        ],
        chips: 1000,
        role: "PLAYER",
        isActive: true,
        isConnected: true,
        position: 1,
      },
    ],
    communityCards: [],
    pot: 30,
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 1,
    ...overrides,
  };
}

describe("GameGateway realtime integration", () => {
  let httpServer: HttpServer;
  let ioServer: SocketIOServer;
  let baseUrl = "";
  const clients: ClientSocket[] = [];

  beforeAll(async () => {
    httpServer = createServer();
    ioServer = new SocketIOServer(httpServer, {
      cors: { origin: "*" },
    });
    new GameGateway(ioServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => resolve());
    });

    const port = (httpServer.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    for (const client of clients) {
      if (client.connected) client.disconnect();
    }
    await new Promise<void>((resolve) => ioServer.close(() => resolve()));
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    disposeActiveGamesForTests();
  });

  async function connectAs(userId: string): Promise<ClientSocket> {
    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET || "quantum_bluff_secret",
    );
    const client = createClient(baseUrl, {
      transports: ["websocket"],
      auth: { token },
    });
    clients.push(client);
    await waitForEvent(client, "connect");
    return client;
  }

  test("CASH_LEAVE in heads-up dissolves table and emits GAME_ENDED", async () => {
    const gameId = `it-game-${Date.now()}`;
    const game = new CashGameController({
      id: gameId,
      roomId: "room-it",
    });
    game.initFromRoomPlayers([
      { userId: "u1", username: "u1", chips: 1000 },
      { userId: "u2", username: "u2", chips: 1000 },
    ]);
    await activeGames.set(gameId, game);

    const u1 = await connectAs("u1");
    const u2 = await connectAs("u2");

    u1.emit("JOIN_GAME", { gameId, playerId: "u1" });
    u2.emit("JOIN_GAME", { gameId, playerId: "u2" });
    await waitForEvent(u1, "GAME_UPDATE");
    await waitForEvent(u2, "GAME_UPDATE");

    const playerLeftPromise = waitForEvent<{
      gameId: string;
      playerId: string;
      scope: string;
    }>(u2, "PLAYER_LEFT");
    const gameEndedPromise = waitForEvent<{
      gameId: string;
      reason: string;
      roomId?: string;
    }>(u2, "GAME_ENDED");

    u1.emit("CASH_LEAVE", { gameId });

    const playerLeft = await playerLeftPromise;
    const gameEnded = await gameEndedPromise;

    expect(playerLeft.gameId).toBe(gameId);
    expect(playerLeft.playerId).toBe("u1");
    expect(playerLeft.scope).toBe("GAME");
    expect(gameEnded.reason).toBe("heads_up_peer_left");
    expect(gameEnded.roomId).toBe("room-it");
    expect(await activeGames.get(gameId)).toBeUndefined();
  });
  test("JOIN_GAME falls back to stored poker snapshot when runtime is not loaded locally", async () => {
    const gameId = `snapshot-join-${Date.now()}`;
    await pokerStateStore.set(gameId, makeSnapshot(gameId), { ttlSec: 60 });

    const u1 = await connectAs("u1");
    const updatePromise = waitForEvent<any>(u1, "GAME_UPDATE");

    u1.emit("JOIN_GAME", { gameId, playerId: "u1" });
    const update = await updatePromise;

    expect(update.phase).toBe("PREFLOP");
    expect(update.pot).toBe(30);
    expect(update.players.find((p: any) => p.id === "u1")?.cards).toHaveLength(
      2,
    );
    expect(update.players.find((p: any) => p.id === "u2")?.cards).toHaveLength(
      0,
    );

    await pokerStateStore.delete(gameId);
  });

  test("RECONNECT_GAME falls back to stored poker snapshot when runtime is not loaded locally", async () => {
    const gameId = `snapshot-reconnect-${Date.now()}`;
    await pokerStateStore.set(
      gameId,
      makeSnapshot(gameId, { pot: 45, version: 2 }),
      { ttlSec: 60 },
    );

    const u1 = await connectAs("u1");
    const updatePromise = waitForEvent<any>(u1, "GAME_UPDATE");

    u1.emit("RECONNECT_GAME", { gameId });
    const update = await updatePromise;

    expect(update.pot).toBe(45);
    expect(update.players.find((p: any) => p.id === "u1")?.cards).toHaveLength(
      2,
    );
    expect(update.players.find((p: any) => p.id === "u2")?.cards).toHaveLength(
      0,
    );

    await pokerStateStore.delete(gameId);
  });

  test("PLAYER_ACTION on snapshot-only poker table returns TABLE_NOT_LOADED_LOCALLY", async () => {
    const gameId = `snapshot-action-${Date.now()}`;
    await pokerStateStore.set(gameId, makeSnapshot(gameId), { ttlSec: 60 });

    const u1 = await connectAs("u1");
    u1.emit("JOIN_GAME", { gameId, playerId: "u1" });
    await waitForEvent(u1, "GAME_UPDATE");

    const errorPromise = waitForEvent<any>(u1, "ERROR");
    u1.emit("PLAYER_ACTION", {
      gameId,
      playerId: "u1",
      action: "CALL",
      handId: "hand-1",
      actionId: `a-${Date.now()}`,
      expectedStreet: "PREFLOP",
    });

    const error = await errorPromise;
    expect(error.code).toBe("TABLE_NOT_LOADED_LOCALLY");

    await pokerStateStore.delete(gameId);
  });

  test("forwards poker snapshot updates to connected sockets on nodes without local runtime", async () => {
    const gameId = `snapshot-sub-${Date.now()}`;
    await pokerStateStore.set(gameId, makeSnapshot(gameId), { ttlSec: 60 });

    const u1 = await connectAs("u1");
    u1.emit("JOIN_GAME", { gameId, playerId: "u1" });
    await waitForEvent(u1, "GAME_UPDATE");

    const nextSnapshot = makeSnapshot(gameId, {
      pot: 80,
      version: 3,
      updatedAt: "2026-01-01T00:01:00.000Z",
      communityCards: [{ rank: "2", suit: "SPADES", value: 2 }],
    });

    const updatePromise = waitForEvent<any>(u1, "GAME_UPDATE");
    await pokerStateStore.set(gameId, nextSnapshot, { ttlSec: 60 });
    await pokerStateStore.publishUpdate({
      type: "POKER_TABLE_UPDATE",
      gameId,
      updatedAt: nextSnapshot.updatedAt,
      version: nextSnapshot.version,
    });

    const update = await updatePromise;
    expect(update.pot).toBe(80);
    expect(update.communityCards).toHaveLength(1);
    expect(update.players.find((p: any) => p.id === "u1")?.cards).toHaveLength(
      2,
    );
    expect(update.players.find((p: any) => p.id === "u2")?.cards).toHaveLength(
      0,
    );

    await pokerStateStore.delete(gameId);
  });

  test("forwards poker table deletion to connected sockets on nodes without local runtime", async () => {
    const gameId = `snapshot-delete-${Date.now()}`;
    await pokerStateStore.set(gameId, makeSnapshot(gameId), { ttlSec: 60 });

    const u1 = await connectAs("u1");
    u1.emit("JOIN_GAME", { gameId, playerId: "u1" });
    await waitForEvent(u1, "GAME_UPDATE");

    const endedPromise = waitForEvent<any>(u1, "GAME_ENDED");
    await pokerStateStore.delete(gameId);
    await pokerStateStore.publishUpdate({
      type: "POKER_TABLE_DELETED",
      gameId,
      updatedAt: new Date().toISOString(),
    });

    const ended = await endedPromise;
    expect(ended.gameId).toBe(gameId);
    expect(ended.reason).toBe("table_deleted");
  });
});
