import express from "express";
import { jest } from "@jest/globals";

const mockedPrisma = {
  gameAction: {
    findMany: jest.fn(),
  },
  gameResult: {
    findUnique: jest.fn(),
  },
};

// ESM mock: must happen BEFORE importing the route file
jest.unstable_mockModule("../config/database.js", () => ({
  prisma: mockedPrisma,
}));

const { default: router } = await import("../routes/game.api.routes.js");

describe("Game history API", () => {
  let server: any;
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
    mockedPrisma.gameAction.findMany.mockReset();
    mockedPrisma.gameResult.findUnique.mockReset();
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
    mockedPrisma.gameAction.findMany.mockResolvedValue([
      {
        id: "a1",
        gameId: "game-1",
        playerId: "p1",
        action: "CALL",
        amount: 10,
        timestamp: "2026-03-13T10:00:00.000Z",
        player: { username: "alice" },
      },
      {
        id: "a2",
        gameId: "game-1",
        playerId: "p2",
        action: "RAISE",
        amount: 30,
        timestamp: "2026-03-13T10:01:00.000Z",
        player: { username: "bob" },
      },
    ]);

    mockedPrisma.gameResult.findUnique.mockResolvedValue({
      gameId: "game-1",
      winnerId: "p2",
      createdAt: "2026-03-13T10:05:00.000Z",
      endedAt: "2026-03-13T10:05:00.000Z",
    });

    const response = await fetch(`${baseUrl}/api/game/game-1/history`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.gameId).toBe("game-1");
    expect(body.winner).toBe("p2");
    expect(body.date).toBe("2026-03-13T10:05:00.000Z");
    expect(body.actions).toHaveLength(2);

    expect(body.actions[0]).toMatchObject({
      action: "CALL",
      amount: 10,
      player: { username: "alice" },
    });

    expect(body.actions[1]).toMatchObject({
      action: "RAISE",
      amount: 30,
      player: { username: "bob" },
    });
  });
});
