/** Normalise la réponse secrète pour comparaison (insensible à la casse, espaces). */
export function normalizeSecretAnswer(raw: string): string {
  return raw.trim().toLowerCase()
}
