/**
 * Tests du module `avatars` — siège local vs adversaires (bots).
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("../../utils/userProfile", () => ({
  getUserAvatar: () => "https://profile.example/me.png",
  getUsername: () => "TestUser",
}));
vi.mock("../../utils/apiBase", () => ({
  apiUrl: (path: string) => `https://api.example.test${path}`,
}));

import { getPlayerAvatar, getPokerTableAvatar } from "../../utils/avatars";

describe("getPlayerAvatar", () => {
  it("retourne l’avatar profil pour le joueur local (siège human, mode bot)", () => {
    expect(getPlayerAvatar("Vous", "human", "human")).toBe("https://profile.example/me.png");
  });

  it("retourne un avatar distinct pour chaque bot (Dicebear micah, style luxe)", () => {
    const a = getPlayerAvatar("Bot Alpha", "bot-1", "human");
    const b = getPlayerAvatar("Bot Beta", "bot-2", "human");
    expect(a).toContain("api.dicebear.com");
    expect(a).toContain("micah");
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

  it("normalise un chemin avatar relatif /api/... en URL exploitable", () => {
    const url = getPlayerAvatar("Alice", "uuid-a", "uuid-me", "/api/auth/avatars/abc");
    expect(url).toContain("/api/auth/avatars/abc");
    expect(url).not.toBe("/api/auth/avatars/abc");
  });

  it("normalise /vm…/api/… (déploiement avec préfixe) en URL via apiUrl", () => {
    const url = getPlayerAvatar(
      "Alice",
      "uuid-a",
      "uuid-me",
      "/vmProjetIntegrateurgrp10-0/api/auth/avatars/abc",
    );
    expect(url).toBe("https://api.example.test/api/auth/avatars/abc");
  });
});

describe("getPokerTableAvatar", () => {
  it("affiche l’avatar profil pour le joueur local", () => {
    expect(getPokerTableAvatar("Vous", "human", "human", "https://ignore.test/x.png")).toBe(
      "https://profile.example/me.png"
    );
  });

  it("utilise l’URL serveur pour les adversaires quand elle est fournie", () => {
    const remote = "https://cdn.example/peer-avatar.png";
    const url = getPokerTableAvatar("Alice", "uuid-a", "uuid-me", remote);
    expect(url).toBe(remote);
  });
});
