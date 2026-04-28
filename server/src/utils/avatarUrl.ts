/**
 * Valide une URL d’avatar publique envoyée par le client.
 * Inclut les chemins canoniques `/api/auth/avatars/{uuid}` après persistance BYTEA.
 */
/** Taille max des data URLs (avatar uploadé compressé côté client). */
const MAX_DATA_URL_LEN = 2_000_000

const UUID_IN_PATH =
  /^\/api\/auth\/avatars\/([\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12})$/i

export function sanitizePublicAvatarUrl(raw: unknown): string | null {
  if (raw == null || typeof raw !== 'string') return null
  const s = raw.trim()
  if (s.length === 0) return null
  if (s.startsWith('data:image/') && s.length <= MAX_DATA_URL_LEN) return s
  if (s.startsWith('data:image/')) return null
  if (s.length > 8192) return null
  if (s.startsWith('https://') || s.startsWith('http://')) return s
  if (UUID_IN_PATH.test(s.split('?')[0] ?? '')) return s.split('?')[0] ?? s
  return null
}
