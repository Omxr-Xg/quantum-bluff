import express from "express";
import { jest } from "@jest/globals";
import { Server } from 'http';

// Mock complet de Prisma
const mockedPrisma = {
  gameAction: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  gameResult: {
    findUnique: jest.fn().mockResolvedValue(null),
  },
};

// Mock du module database
jest.unstable_mockModule("../config/database.js", () => ({
  prisma: mockedPrisma,
}));

// Import dynamique du router après le mock
let router: any;
beforeAll(async () => {
  const module = await import("../routes/game.api.routes.js");
  router = module.default;
});

describe("Game history API", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/game", router);

    server = app.listen(0);

    await new Promise<void>((resolve) => {
      server.on("listening", () => resolve());
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Impossible de récupérer le port du serveur de test");
    }

    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err: Error | undefined) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 404 when no history exists", async () => {
    mockedPrisma.gameAction.findMany.mockResolvedValue([]);
    mockedPrisma.gameResult.findUnique.mockResolvedValue(null);

    const response = await fetch(`${baseUrl}/api/game/game-404/history`);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Historique introuvable" });
  });

  it("should return actions, winner and date for an existing game history", async () => {
    const now = new Date();
    
    mockedPrisma.gameAction.findMany.mockResolvedValue([
      {
        id: "a1",
        gameId: "game-1",
        playerId: "p1",
        action: "CALL",
        amount: 10,
        timestamp: now,
        player: { username: "alice" },
      },
      {
        id: "a2",
        gameId: "game-1",
        playerId: "p2",
        action: "RAISE",
        amount: 30,
        timestamp: now,
        player: { username: "bob" },
      },
    ]);

    mockedPrisma.gameResult.findUnique.mockResolvedValue({
      gameId: "game-1",
      winnerId: "p2",
      createdAt: now,
      endedAt: now,
    });

    const response = await fetch(`${baseUrl}/api/game/game-1/history`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.gameId).toBe("game-1");
    expect(body.winner).toBe("p2");
    expect(new Date(body.date)).toEqual(now);
    expect(Array.isArray(body.actions)).toBe(true);
    expect(body.actions.length).toBe(2);
  });
});