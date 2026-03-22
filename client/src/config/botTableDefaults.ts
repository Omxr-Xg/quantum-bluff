/**
 * Constantes du mode **bot** (table locale) — source unique pour blinds / relance min. côté client.
 * Les parties réseau utilisent les blinds de la salle (`GameTable` / cash game).
 */
export const BOT_TABLE_DEFAULTS = {
  SMALL_BLIND: 50,
  BIG_BLIND: 100,
  /** Aligné sur la grosse blind pour les relances demandées à l’API bot. */
  MIN_RAISE_FOR_BOT_API: 100,
} as const;
