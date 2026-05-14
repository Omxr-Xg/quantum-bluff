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

import { AVATAR_PRESETS, getPlayerAvatar, getPokerTableAvatar } from "../../utils/avatars";

describe("getPlayerAvatar", () => {
  it("retourne l’avatar profil pour le joueur local (siège human, mode bot)", () => {
    expect(getPlayerAvatar("Vous", "human", "human")).toBe("https://profile.example/me.png");
  });

  it("utilise l’avatar bot dédié (B1) pour les sièges bot (entrainement / tutoriel)", () => {
    /* Bots : "bot", "bot-1" (mode local), "qb-bot-1" (practice API serveur). */
    const url1 = getPlayerAvatar("Bot Alpha", "bot-1", "human");
    const url2 = getPlayerAvatar("Bot Beta", "bot-2", "human");
    const urlTuto = getPlayerAvatar("Bot", "bot", "human");
    const urlQb = getPlayerAvatar("Bot Iota", "qb-bot-1", "uuid-human");
    expect(url1).toMatch(/B1/i);
    expect(url2).toMatch(/B1/i);
    expect(urlTuto).toMatch(/B1/i);
    expect(urlQb).toMatch(/B1/i);
    expect(url1).toBe(url2);
    expect(url1).toBe(urlTuto);
    expect(url1).toBe(urlQb);
  });

  it("renvoie une string vide pour un adversaire HUMAIN sans URL serveur", () => {
    /* Pas de bot, pas d'URL : le composant consommateur affiche son fallback
     * (initiale, icone). On ne devine plus d'avatar pour les opposants humains. */
    expect(getPlayerAvatar("Alice", "uuid-a", "uuid-me")).toBe("");
    expect(getPlayerAvatar("Alice", "uuid-a", "uuid-me", null)).toBe("");
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

  it("utilise l’avatar bot dédié (B1) pour les bots à la table", () => {
    expect(getPokerTableAvatar("Bot Delta", "bot-4", "human", null)).toMatch(/B1/i);
    expect(getPokerTableAvatar("Bot Zeta", "qb-bot-2", "uuid-me", null)).toMatch(/B1/i);
  });

  it("utilise l’URL serveur pour les adversaires quand elle est fournie", () => {
    const remote = "https://cdn.example/peer-avatar.png";
    const url = getPokerTableAvatar("Alice", "uuid-a", "uuid-me", remote);
    expect(url).toBe(remote);
  });

  it("renvoie une string vide pour un adversaire HUMAIN sans URL serveur", () => {
    expect(getPokerTableAvatar("Alice", "uuid-a", "uuid-me", null)).toBe("");
  });
});

describe("AVATAR_PRESETS", () => {
  it("ne contient pas l'avatar bot (B1) — réservé aux bots, hors sélection profil", () => {
    /* `B1.png` est l'avatar dédié aux opposants bots ; il ne doit JAMAIS être
     * proposé dans la galerie de sélection d'avatar utilisateur. */
    for (const url of AVATAR_PRESETS) {
      expect(url).not.toMatch(/B1/i);
    }
  });

  it("expose tous les presets utilisateur (24 PNG, sans B1 bot)", () => {
    expect(AVATAR_PRESETS.length).toBe(24);
  });
});
