import { describe, expect, it } from "vitest";
import { notificationChipsLabel } from "../notificationPayload";

describe("notificationChipsLabel", () => {
  it("affiche chips en priorité", () => {
    expect(notificationChipsLabel({ chips: 2000 })).toBe("2,000");
  });

  it("retombe sur rewardTokens puis amount", () => {
    expect(notificationChipsLabel({ rewardTokens: 1500 })).toBe("1,500");
    expect(notificationChipsLabel({ amount: 500 })).toBe("500");
  });

  it("accepte une chaîne numérique", () => {
    expect(notificationChipsLabel({ chips: "1200" })).toBe("1,200");
  });

  it("retourne un tiret si absent", () => {
    expect(notificationChipsLabel({})).toBe("—");
    expect(notificationChipsLabel({ chips: "n/a" })).toBe("—");
  });
});
