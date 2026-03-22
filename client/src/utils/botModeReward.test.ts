import { describe, it, expect } from "vitest";
import { getWinMultiplierFromDifficultyParam, BOT_WIN_MULTIPLIERS } from "./botModeReward";

describe("botModeReward", () => {
  it("mappe les difficultés URL", () => {
    expect(getWinMultiplierFromDifficultyParam("facile")).toBe(BOT_WIN_MULTIPLIERS.facile);
    expect(getWinMultiplierFromDifficultyParam("moyen")).toBe(BOT_WIN_MULTIPLIERS.moyen);
    expect(getWinMultiplierFromDifficultyParam("difficile")).toBe(BOT_WIN_MULTIPLIERS.difficile);
    expect(getWinMultiplierFromDifficultyParam("expert")).toBe(BOT_WIN_MULTIPLIERS.expert);
  });

  it("expert > difficile (incitation économique)", () => {
    expect(BOT_WIN_MULTIPLIERS.expert).toBeGreaterThan(BOT_WIN_MULTIPLIERS.difficile);
  });
});
