import { getUserAvatar, getUsername } from "./userProfile";

/**
 * Style unique **luxe / caricature** : Dicebear 7.x `micah` partout (même trait graphique).
 * Fonds or, champagne, minuit, velours — seeds thématiques VIP pour varier les visages.
 */
const LUXURY_MICAH_STYLE = "micah" as const;

function luxuryMicahCaricature(seed: string, backgroundColor: string): string {
  const s = encodeURIComponent(seed);
  return `https://api.dicebear.com/7.x/${LUXURY_MICAH_STYLE}/svg?seed=${s}&backgroundColor=${backgroundColor}`;
}

/** Fonds « luxe » (hex sans #) — rotation pour 20 presets distincts. */
const LUXURY_BACKGROUNDS: readonly string[] = [
  "1a1a2e", // minuit
  "292524", // chocolat / velours
  "3d2c29",
  "4c1d95", // violet profond
  "581c87",
  "6d28d9",
  "78350f", // bronze
  "854d0e", // or vieilli
  "d4af37", // or
  "f4e4bc", // champagne
  "f5e6d3", // ivoire
  "e8dcc4",
  "1e3a5f", // bleu nuit
  "0c4a6e",
  "422006", // ambre sombre
  "14532d", // vert prestige
  "312e81",
  "1e1b4b",
  "4a044e",
  "7c2d12",
];

const LUXURY_SEEDS: readonly string[] = [
  "Penthouse-Suite",
  "Velvet-Rope-VIP",
  "Gold-Reserve",
  "Champagne-Tower",
  "Private-Jet-Lounge",
  "Marble-Lobby",
  "Concierge-Black-Card",
  "Diamond-Concierge",
  "Silk-Robe-Morning",
  "Caviar-Tasting",
  "Yacht-Deck-Sunset",
  "Vintage-Champagne",
  "Rooftop-Pool-VIP",
  "Limousine-Line",
  "Crystal-Chandelier",
  "Heritage-Portfolio",
  "Boutique-Platinum",
  "Opera-Box-Elite",
  "Art-Gallery-Opening",
  "Helipad-Arrival",
];

export const AVATAR_PRESETS: readonly string[] = LUXURY_SEEDS.map((seed, i) =>
  luxuryMicahCaricature(seed, LUXURY_BACKGROUNDS[i % LUXURY_BACKGROUNDS.length]!)
);

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
 * — Multijoueur : si le serveur a diffusé une URL (`remoteAvatarUrl`), on l’utilise.
 * — Sinon (bots, adversaires sans URL) : même style `micah` luxe + seed siège.
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
  const trimmed = typeof remoteAvatarUrl === "string" ? remoteAvatarUrl.trim() : "";
  if (trimmed !== "") {
    return trimmed;
  }
  const seedKey = playerId != null ? String(playerId) : playerName;
  return luxuryMicahCaricature(`qb-opp-${seedKey}-${playerName}`, "1e1b4b");
}
