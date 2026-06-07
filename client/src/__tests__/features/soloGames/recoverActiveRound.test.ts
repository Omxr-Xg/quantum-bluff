import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../utils/authStorage", () => ({
  getAuthItem: (key: string) => (key === "token" ? "test-token" : null),
}));

vi.mock("../../../utils/apiBase", () => ({
  apiUrl: (path: string) => `https://api.test${path}`,
}));

import {
  fetchCrashActiveRound,
  fetchMinesActiveRound,
  isSoloActiveConflict,
} from "../../../features/soloGames/recoverActiveRound";

describe("isSoloActiveConflict", () => {
  it("détecte les codes solo actifs", () => {
    expect(isSoloActiveConflict("ACTIVE_CRASH_ROUND")).toBe(true);
    expect(isSoloActiveConflict("ACTIVE_MINES_ROUND")).toBe(true);
    expect(isSoloActiveConflict("ACTIVE_WHEEL_SPIN")).toBe(true);
    expect(isSoloActiveConflict("ACTIVE_LUCKY_NUMBER_PLAY")).toBe(true);
    expect(isSoloActiveConflict("INSUFFICIENT_CHIPS")).toBe(false);
    expect(isSoloActiveConflict(undefined)).toBe(false);
  });
});

describe("fetchCrashActiveRound", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("retourne null si aucune manche", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ active: false }),
    } as Response);
    expect(await fetchCrashActiveRound()).toBeNull();
  });

  it("retourne la manche active", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        active: true,
        roundId: "r-1",
        bet: 100,
        startedAt: 1_700_000_000_000,
        status: "running",
        multiplier: 1.42,
      }),
    } as Response);
    const round = await fetchCrashActiveRound();
    expect(round?.roundId).toBe("r-1");
    expect(round?.multiplier).toBe(1.42);
  });
});

describe("fetchMinesActiveRound", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("retourne null sur erreur réseau", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    expect(await fetchMinesActiveRound()).toBeNull();
  });

  it("retourne la grille en cours", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        active: true,
        roundId: "m-9",
        bet: 50,
        mineCount: 5,
        revealedCells: [2, 7],
        multiplier: 1.8,
        status: "running",
        startedAt: 1_700_000_000_000,
      }),
    } as Response);
    const round = await fetchMinesActiveRound();
    expect(round?.revealedCells).toEqual([2, 7]);
  });
});
