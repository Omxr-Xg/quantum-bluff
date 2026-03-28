import { getUserAvatar, getUsername } from "./userProfile";

/**
 * Bibliothèque F7 — 20 avatars (Dicebear, déterministes par seed).
 * Utilisée par `AvatarGallery` sur `/edit-profile`.
 */
export const AVATAR_PRESETS: readonly string[] = Array.from({ length: 20 }, (_, i) => {
  const seed = encodeURIComponent(`qb-avatar-${i}`);
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
});

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
 * — Autres (bots, adversaires) : image stable et distincte (Dicebear `bottts` + seed siège).
 */
export function getPlayerAvatar(
  playerName: string,
  playerId?: string | number,
  heroSeatId?: string | number | null
): string {
  if (isLocalPlayerSeat(playerName, playerId, heroSeatId)) {
    return getUserAvatar();
  }
  const seedKey = playerId != null ? String(playerId) : playerName;
  const seed = encodeURIComponent(`qb-opp-${seedKey}-${playerName}`);
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
}
