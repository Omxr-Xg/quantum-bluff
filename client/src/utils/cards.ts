/**
 * Utilitaires cartes — normalisation des cartes reçues du serveur pour l’affichage client.
 * Exporté pour pouvoir être testé unitairement (voir __tests__/utils/cards.test.ts).
 */

export type ClientCardSuit = "hearts" | "diamonds" | "clubs" | "spades";

export interface ClientCard {
  suit: ClientCardSuit;
  value: string;
}

/**
 * Convertit une carte reçue du serveur (suit en MAJUSCULES, value number, rank optionnel)
 * en format client (suit minuscules, value string "2"-"10","J","Q","K","A").
 * Retourne null si l’entrée est invalide.
 */
export function normalizeServerCard(
  c: { suit?: string; value?: number | string; rank?: string } | null
): ClientCard | null {
  if (!c || typeof c !== "object") return null;
  const suitRaw = (c.suit ?? "").toString().toLowerCase();
  const suit: ClientCardSuit = ["hearts", "diamonds", "clubs", "spades"].includes(suitRaw)
    ? (suitRaw as ClientCardSuit)
    : "hearts";
  const rank = c.rank;
  const numVal = typeof c.value === "number" ? c.value : undefined;
  const value =
    typeof rank === "string" && rank.length > 0
      ? rank
      : numVal !== undefined
        ? String(({ 11: "J", 12: "Q", 13: "K", 14: "A" } as Record<number, string>)[numVal] ?? numVal)
        : String(c.value ?? "");
  return { suit, value };
}

/** Clé stable pour surbrillance board / mains (cartes normalisées client). */
export function cardHighlightKey(c: ClientCard): string {
  return `${c.suit}|${c.value}`;
}
