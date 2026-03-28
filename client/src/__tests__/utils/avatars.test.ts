/**
 * Tests du module `avatars` — siège local vs adversaires (bots).
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("../../utils/userProfile", () => ({
  getUserAvatar: () => "https://profile.example/me.png",
  getUsername: () => "TestUser",
}));

import { getPlayerAvatar } from "../../utils/avatars";

describe("getPlayerAvatar", () => {
  it("retourne l’avatar profil pour le joueur local (siège human, mode bot)", () => {
    expect(getPlayerAvatar("Vous", "human", "human")).toBe("https://profile.example/me.png");
  });

  it("retourne un avatar distinct pour chaque bot (Dicebear bottts)", () => {
    const a = getPlayerAvatar("Bot Alpha", "bot-1", "human");
    const b = getPlayerAvatar("Bot Beta", "bot-2", "human");
    expect(a).toContain("api.dicebear.com");
    expect(a).toContain("bottts");
    expect(b).toContain("api.dicebear.com");
    expect(a).not.toBe(b);
  });

  it("n’utilise pas l’avatar profil pour un adversaire", () => {
    const url = getPlayerAvatar("Bot Gamma", "bot-3", "human");
    expect(url).not.toBe("https://profile.example/me.png");
  });

  it("utilise l’URL serveur pour un adversaire multijoueur quand elle est fournie", () => {
    const remote = "https://cdn.example/peer-avatar.png";
    expect(getPlayerAvatar("Alice", "uuid-a", "uuid-me", remote)).toBe(remote);
  });
});
