/**
 * URL exposée aux clients (login, profil, jeux) : chemin API si image en base, sinon URL externe legacy.
 */
export function clientAvatarUrlFromUser(row: {
  id: string
  avatarUrl: string | null
  avatarHasBinary: boolean
}): string | null {
  if (row.avatarHasBinary) return `/api/auth/avatars/${row.id}`
  return row.avatarUrl ?? null
}
