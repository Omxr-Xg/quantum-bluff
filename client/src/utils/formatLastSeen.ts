import type { TFunction } from 'i18next'

/** Libellé relatif « Connecté il y a X min/h/j » pour un ami hors ligne. */
export function formatFriendLastSeen(
  lastSeenAt: string | number | null | undefined,
  t: TFunction,
): string | null {
  if (lastSeenAt == null || lastSeenAt === '') return null
  const ts =
    typeof lastSeenAt === 'number' ? lastSeenAt : Date.parse(String(lastSeenAt))
  if (!Number.isFinite(ts)) return null

  const diffMs = Math.max(0, Date.now() - ts)
  const minutes = Math.floor(diffMs / 60_000)

  if (minutes < 1) {
    return t('friends.lastSeenJustNow')
  }
  if (minutes < 60) {
    return t('friends.lastSeenMinutes', { count: minutes })
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return t('friends.lastSeenHours', { count: hours })
  }
  const days = Math.floor(hours / 24)
  return t('friends.lastSeenDays', { count: days })
}
