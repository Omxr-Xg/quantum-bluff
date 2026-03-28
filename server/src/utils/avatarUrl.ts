/**
 * Valide une URL d’avatar publique envoyée par le client (pas de stockage serveur des images).
 */
export function sanitizePublicAvatarUrl(raw: unknown): string | null {
  if (raw == null || typeof raw !== 'string') return null
  const s = raw.trim()
  if (s.length === 0 || s.length > 8192) return null
  if (s.startsWith('https://') || s.startsWith('http://')) return s
  if (s.startsWith('data:image/') && s.length <= 600_000) return s
  return null
}
