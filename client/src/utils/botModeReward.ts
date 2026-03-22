/**
 * Pondération des **gains** (jetons) du joueur humain en mode bot hors partie réseau.
 * Les pertes ne sont pas multipliées.
 *
 * `expert` > `difficile` pour inciter l’usage des niveaux plus bas (économie de jeu).
 */
export const BOT_WIN_MULTIPLIERS = {
  facile: 0.3,
  moyen: 0.6,
  difficile: 1,
  /** Bonus léger vs difficile (même IA serveur `hard` vs `expert`, paramètres différents). */
  expert: 1.05,
} as const;

export function getWinMultiplierFromDifficultyParam(param: string): number {
  const p = (param || "moyen").toLowerCase();
  if (p === "facile") return BOT_WIN_MULTIPLIERS.facile;
  if (p === "moyen") return BOT_WIN_MULTIPLIERS.moyen;
  if (p === "difficile") return BOT_WIN_MULTIPLIERS.difficile;
  if (p === "expert") return BOT_WIN_MULTIPLIERS.expert;
  return BOT_WIN_MULTIPLIERS.moyen;
}
