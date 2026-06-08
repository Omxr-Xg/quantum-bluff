import { getUserAvatar, getUsername } from "./userProfile";
import { apiUrl } from "./apiBase";
/* Avatars bundlés : tous les PNG de `assets/avatars/` sauf B1 (réservé aux bots).
 * Vite résout l'import en URL hashée du build — utilisable directement dans <img src=…>. */
import avatarFA1 from "../assets/avatars/FA1.webp";
import avatarFA2 from "../assets/avatars/FA2.webp";
import avatarFJ1 from "../assets/avatars/FJ1.webp";
import avatarFJ2 from "../assets/avatars/FJ2.webp";
import avatarFJ3 from "../assets/avatars/FJ3.webp";
import avatarFJ4 from "../assets/avatars/FJ4.webp";
import avatarFJ5 from "../assets/avatars/FJ5.webp";
import avatarFJ6 from "../assets/avatars/FJ6.webp";
import avatarFJ7 from "../assets/avatars/FJ7.webp";
import avatarFJ8 from "../assets/avatars/FJ8.webp";
import avatarHA1 from "../assets/avatars/HA1.webp";
import avatarHA2 from "../assets/avatars/HA2.webp";
import avatarHA3 from "../assets/avatars/HA3.webp";
import avatarHJ1 from "../assets/avatars/HJ1.webp";
import avatarHJ2 from "../assets/avatars/HJ2.webp";
import avatarHJ3 from "../assets/avatars/HJ3.webp";
import avatarHJ4 from "../assets/avatars/HJ4.webp";
import avatarHJ5 from "../assets/avatars/HJ5.webp";
import avatarHJ6 from "../assets/avatars/HJ6.webp";
import avatarHJ7 from "../assets/avatars/HJ7.webp";
import avatarHJ8 from "../assets/avatars/HJ8.webp";
import avatarHJ9 from "../assets/avatars/HJ9.webp";
import avatarHJ10 from "../assets/avatars/HJ10.webp";
import avatarTJ1 from "../assets/avatars/TJ1.webp";
/* Avatar dédié aux bots — volontairement hors de `AVATAR_PRESETS` pour ne pas
 * etre proposé à la sélection profil. */
import avatarBot from "../assets/avatars/B1.webp";
/* Avatar par défaut affiché pour tout joueur qui n'a pas choisi de preset
 * ni uploadé de photo — volontairement hors de `AVATAR_PRESETS` pour qu'il
 * ne soit pas sélectionnable. */
import avatarDefault from "../assets/avatars/NA.webp";

/** Avatar utilisé en l'absence de toute photo / preset (joueur "neutre"). */
export const DEFAULT_AVATAR_URL: string = avatarDefault;

function normalizeRemoteAvatarUrl(remoteAvatarUrl?: string | null): string {
  const trimmed = typeof remoteAvatarUrl === "string" ? remoteAvatarUrl.trim() : "";
  if (trimmed === "") return "";
  if (trimmed.startsWith("/api/")) return apiUrl(trimmed);
  // Déploiement web avec préfixe /vm…/ dans l’URL (localStorage ou payload) : ne pas laisser relatif sous Capacitor.
  const vmApi = trimmed.match(/^\/vm[^/]+(\/api\/.+)$/i);
  if (vmApi?.[1]) return apiUrl(vmApi[1]);
  return trimmed;
}

export const FREE_AVATAR_IDS = new Set(["FA1", "FJ1", "HA1", "HJ1"]);

/** Jetons par preset payant (1 500 – 15 000) — aligné sur `server/src/shop/avatars.catalog.ts`. */
export const AVATAR_PRESET_PRICES: Record<string, number> = {
  FA1: 0,
  FA2: 1_500,
  FJ1: 0,
  FJ2: 2_000,
  FJ3: 2_500,
  FJ4: 3_000,
  FJ5: 3_500,
  FJ6: 4_500,
  FJ7: 5_500,
  FJ8: 6_500,
  HA1: 0,
  HA2: 4_000,
  HA3: 7_000,
  HJ1: 0,
  HJ2: 2_200,
  HJ3: 3_200,
  HJ4: 4_800,
  HJ5: 5_800,
  HJ6: 7_500,
  HJ7: 8_500,
  HJ8: 10_000,
  HJ9: 12_000,
  HJ10: 14_000,
  TJ1: 15_000,
};

export function avatarPresetPriceChips(id: string): number {
  return AVATAR_PRESET_PRICES[id] ?? 0;
}

/** Catalogue presets : id stable (nom fichier) + URL bundlée Vite. */
export const AVATAR_PRESET_CATALOG: readonly { id: string; url: string }[] = [
  { id: "FA1", url: avatarFA1 },
  { id: "FA2", url: avatarFA2 },
  { id: "FJ1", url: avatarFJ1 },
  { id: "FJ2", url: avatarFJ2 },
  { id: "FJ3", url: avatarFJ3 },
  { id: "FJ4", url: avatarFJ4 },
  { id: "FJ5", url: avatarFJ5 },
  { id: "FJ6", url: avatarFJ6 },
  { id: "FJ7", url: avatarFJ7 },
  { id: "FJ8", url: avatarFJ8 },
  { id: "HA1", url: avatarHA1 },
  { id: "HA2", url: avatarHA2 },
  { id: "HA3", url: avatarHA3 },
  { id: "HJ1", url: avatarHJ1 },
  { id: "HJ2", url: avatarHJ2 },
  { id: "HJ3", url: avatarHJ3 },
  { id: "HJ4", url: avatarHJ4 },
  { id: "HJ5", url: avatarHJ5 },
  { id: "HJ6", url: avatarHJ6 },
  { id: "HJ7", url: avatarHJ7 },
  { id: "HJ8", url: avatarHJ8 },
  { id: "HJ9", url: avatarHJ9 },
  { id: "HJ10", url: avatarHJ10 },
  { id: "TJ1", url: avatarTJ1 },
];

/**
 * Presets d'avatar offerts à la sélection (Edit Profile).
 * Ordre alphabétique par fichier (sans B1.webp).
 */
export const AVATAR_PRESETS: readonly string[] = AVATAR_PRESET_CATALOG.map((entry) => entry.url);

const PRESET_URL_TO_ID = new Map(AVATAR_PRESET_CATALOG.map((entry) => [entry.url, entry.id]));

export function avatarPresetIdFromUrl(url: string): string | null {
  return PRESET_URL_TO_ID.get(url) ?? null;
}

export function avatarPresetUrlFromId(id: string): string | null {
  return AVATAR_PRESET_CATALOG.find((entry) => entry.id === id)?.url ?? null;
}

export function isFreeAvatarPresetId(id: string): boolean {
  return FREE_AVATAR_IDS.has(id);
}

/**
 * Détecte un siège bot via le préfixe / forme de l'ID :
 *  - `Game.tsx` (mode bot local) : `bot-1`, `bot-2`, … ;
 *  - `TutorialGame.tsx` : `"bot"` ;
 *  - practice servi par l'API (`POST /api/game/bot/start`, …) : `qb-bot-1`, `qb-bot-2`, …
 * Un UUID ou `"human"` ne matche pas.
 */
function isBotSeat(playerId: string | number | undefined): boolean {
  if (playerId == null) return false;
  const s = String(playerId).toLowerCase();
  return s === "bot" || s.startsWith("bot-") || s.startsWith("qb-bot-");
}

/**
 * Indique si ce siège correspond au joueur local (profil + solde).
 * @param heroSeatId — ex. `userId` en multijoueur, `"human"` en mode bot.
 */
function isLocalPlayerSeat(
  playerName: string,
  playerId: string | number | undefined,
  heroSeatId: string | number | null | undefined
): boolean {
  if (playerName === "Vous" || playerName === "you") return true;
  if (playerId === "human") return true;
  if (heroSeatId != null && heroSeatId !== "" && playerId != null) {
    if (String(playerId) === String(heroSeatId)) return true;
  }
  try {
    const me = getUsername();
    if (me && playerName === me) return true;
  } catch {
    /* SSR / pas de window */
  }
  return false;
}

/**
 * Avatar affiché pour un joueur à la table ou dans les listes.
 * — Siège local : avatar du profil (`getUserAvatar()`), avec fallback `NA.webp`
 *   si l'utilisateur n'a rien choisi.
 * — Bot (mode entrainement / tutoriel) : avatar dédié `B1.webp`.
 * — Multijoueur : si le serveur a diffusé une URL (`remoteAvatarUrl`), on l’utilise.
 * — Adversaire humain sans URL : avatar par défaut `NA.webp`.
 *
 * Cette fonction renvoie donc toujours une URL exploitable — les composants
 * consommateurs n'ont plus besoin de tester `?` puis fallback initiale.
 */
export function getPlayerAvatar(
  playerName: string,
  playerId?: string | number,
  heroSeatId?: string | number | null,
  remoteAvatarUrl?: string | null
): string {
  if (isLocalPlayerSeat(playerName, playerId, heroSeatId)) {
    return getUserAvatar() || avatarDefault;
  }
  if (isBotSeat(playerId)) {
    return avatarBot;
  }
  const trimmed = normalizeRemoteAvatarUrl(remoteAvatarUrl);
  if (trimmed !== "") {
    return trimmed;
  }
  return avatarDefault;
}

/**
 * Avatars sur la table de poker :
 * - joueur local : avatar du profil (ou `NA.webp` si rien de défini) ;
 * - bot : avatar dédié `B1.webp` ;
 * - adversaire humain avec URL serveur (photo uploadée) : on l'utilise ;
 * - adversaire humain sans URL : avatar par défaut `NA.webp`.
 */
export function getPokerTableAvatar(
  playerName: string,
  playerId?: string | number,
  heroSeatId?: string | number | null,
  serverAvatarUrl?: string | null
): string {
  if (isLocalPlayerSeat(playerName, playerId, heroSeatId)) {
    return getUserAvatar() || avatarDefault;
  }
  if (isBotSeat(playerId)) {
    return avatarBot;
  }
  const trimmed = normalizeRemoteAvatarUrl(serverAvatarUrl);
  if (trimmed !== "") {
    return trimmed;
  }
  return avatarDefault;
}
