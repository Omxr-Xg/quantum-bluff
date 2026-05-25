/**
 * URL exposée aux clients (login, profil, jeux) : chemin API si image en base, sinon URL externe legacy.
 *
 * Les champs `avatarUrl` et `avatarHasBinary` sont optionnels pour tolérer les
 * variantes de sélection Prisma (certaines routes ne demandent que `id` +
 * `username` + `level`). Un appelant qui ne sélectionne pas les colonnes
 * obtiendra `null` (= comme s'il n'y avait pas d'avatar) plutôt qu'une erreur.
 */
export function clientAvatarUrlFromUser(row: {
  id: string
  avatarUrl?: string | null
  avatarHasBinary?: boolean
}): string | null {
  if (row.avatarHasBinary) return `/api/auth/avatars/${row.id}`
  return row.avatarUrl ?? null
}
