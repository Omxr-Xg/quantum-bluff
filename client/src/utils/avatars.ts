import { getUserAvatar, getUsername } from "./userProfile";
import { apiUrl } from "./apiBase";
/* Avatars bundlés : tous les PNG de `assets/avatars/` sauf B1 (réservé aux bots).
 * Vite résout l'import en URL hashée du build — utilisable directement dans <img src=…>. */
import avatarFA1 from "../assets/avatars/FA1.png";
import avatarFA2 from "../assets/avatars/FA2.png";
import avatarFJ1 from "../assets/avatars/FJ1.png";
import avatarFJ2 from "../assets/avatars/FJ2.png";
import avatarFJ3 from "../assets/avatars/FJ3.png";
import avatarFJ4 from "../assets/avatars/FJ4.png";
import avatarFJ5 from "../assets/avatars/FJ5.png";
import avatarFJ6 from "../assets/avatars/FJ6.png";
import avatarFJ7 from "../assets/avatars/FJ7.png";
import avatarFJ8 from "../assets/avatars/FJ8.png";
import avatarHA1 from "../assets/avatars/HA1.png";
import avatarHA2 from "../assets/avatars/HA2.png";
import avatarHA3 from "../assets/avatars/HA3.png";
import avatarHJ1 from "../assets/avatars/HJ1.png";
import avatarHJ2 from "../assets/avatars/HJ2.png";
import avatarHJ3 from "../assets/avatars/HJ3.png";
import avatarHJ4 from "../assets/avatars/HJ4.png";
import avatarHJ5 from "../assets/avatars/HJ5.png";
import avatarHJ6 from "../assets/avatars/HJ6.png";
import avatarHJ7 from "../assets/avatars/HJ7.png";
import avatarHJ8 from "../assets/avatars/HJ8.png";
import avatarHJ9 from "../assets/avatars/HJ9.png";
import avatarHJ10 from "../assets/avatars/HJ10.png";
import avatarTJ1 from "../assets/avatars/TJ1.png";
/* Avatar dédié aux bots — volontairement hors de `AVATAR_PRESETS` pour ne pas
 * etre proposé à la sélection profil. */
import avatarBot from "../assets/avatars/B1.png";

function normalizeRemoteAvatarUrl(remoteAvatarUrl?: string | null): string {
  const trimmed = typeof remoteAvatarUrl === "string" ? remoteAvatarUrl.trim() : "";
  if (trimmed === "") return "";
  if (trimmed.startsWith("/api/")) return apiUrl(trimmed);
  // Déploiement web avec préfixe /vm…/ dans l’URL (localStorage ou payload) : ne pas laisser relatif sous Capacitor.
  const vmApi = trimmed.match(/^\/vm[^/]+(\/api\/.+)$/i);
  if (vmApi?.[1]) return apiUrl(vmApi[1]);
  return trimmed;
}

/**
 * Presets d'avatar offerts à la sélection (Edit Profile / inscription).
 * Ordre alphabétique par fichier (sans B1.png).
 */
export const AVATAR_PRESETS: readonly string[] = [
  avatarFA1,
  avatarFA2,
  avatarFJ1,
  avatarFJ2,
  avatarFJ3,
  avatarFJ4,
  avatarFJ5,
  avatarFJ6,
  avatarFJ7,
  avatarFJ8,
  avatarHA1,
  avatarHA2,
  avatarHA3,
  avatarHJ1,
  avatarHJ2,
  avatarHJ3,
  avatarHJ4,
  avatarHJ5,
  avatarHJ6,
  avatarHJ7,
  avatarHJ8,
  avatarHJ9,
  avatarHJ10,
  avatarTJ1,
];

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
 * — Siège local : avatar du profil (`getUserAvatar()`).
 * — Bot (mode entrainement / tutoriel) : avatar dédié `B1.png`.
 * — Multijoueur : si le serveur a diffusé une URL (`remoteAvatarUrl`), on l’utilise.
 * — Adversaire humain sans URL : **string vide** — le composant consommateur
 *   ré-affiche son propre fallback (initiale, icône).
 */
export function getPlayerAvatar(
  playerName: string,
  playerId?: string | number,
  heroSeatId?: string | number | null,
  remoteAvatarUrl?: string | null
): string {
  if (isLocalPlayerSeat(playerName, playerId, heroSeatId)) {
    return getUserAvatar();
  }
  if (isBotSeat(playerId)) {
    return avatarBot;
  }
  const trimmed = normalizeRemoteAvatarUrl(remoteAvatarUrl);
  if (trimmed !== "") {
    return trimmed;
  }
  return "";
}

/**
 * Avatars sur la table de poker :
 * - joueur local : avatar du profil ;
 * - bot : avatar dédié `B1.png` ;
 * - adversaire humain avec URL serveur (photo uploadée) : on l'utilise ;
 * - adversaire humain sans URL : **string vide** (pas d'avatar).
 */
export function getPokerTableAvatar(
  playerName: string,
  playerId?: string | number,
  heroSeatId?: string | number | null,
  serverAvatarUrl?: string | null
): string {
  if (isLocalPlayerSeat(playerName, playerId, heroSeatId)) {
    return getUserAvatar();
  }
  if (isBotSeat(playerId)) {
    return avatarBot;
  }
  const trimmed = normalizeRemoteAvatarUrl(serverAvatarUrl);
  if (trimmed !== "") {
    return trimmed;
  }
  return "";
}
