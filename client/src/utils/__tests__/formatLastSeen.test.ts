import { describe, expect, it, vi } from 'vitest'
import { formatFriendLastSeen } from '../formatLastSeen'

const t = (key: string, opts?: { count?: number }) => {
  if (key === 'friends.lastSeenMinutes') return `Connecté il y a ${opts?.count} min`
  if (key === 'friends.lastSeenHours') return `Connecté il y a ${opts?.count} h`
  if (key === 'friends.lastSeenDays') return `Connecté il y a ${opts?.count} j`
  return key
}

describe('formatFriendLastSeen', () => {
  it('formats minutes', () => {
    const iso = new Date(Date.now() - 15 * 60_000).toISOString()
    expect(formatFriendLastSeen(iso, t as never)).toBe('Connecté il y a 15 min')
  })

  it('formats hours', () => {
    const iso = new Date(Date.now() - 3 * 3600_000).toISOString()
    expect(formatFriendLastSeen(iso, t as never)).toBe('Connecté il y a 3 h')
  })

  it('returns null when missing', () => {
    expect(formatFriendLastSeen(null, t as never)).toBeNull()
  })
})
