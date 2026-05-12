import { sanitizePublicAvatarUrl } from '../utils/avatarUrl.js'
import { normalizeSecretAnswer } from '../utils/secretAnswer.js'

describe('avatarUrl / secretAnswer', () => {
  it('normalizeSecretAnswer lowercases and trims', () => {
    expect(normalizeSecretAnswer('  Hello ')).toBe('hello')
  })

  it('sanitizePublicAvatarUrl accepts https and api avatar paths', () => {
    expect(sanitizePublicAvatarUrl(null)).toBeNull()
    expect(sanitizePublicAvatarUrl('')).toBeNull()
    expect(sanitizePublicAvatarUrl('https://cdn.example/a.png')).toBe('https://cdn.example/a.png')
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    expect(sanitizePublicAvatarUrl(`/api/auth/avatars/${uuid}`)).toBe(`/api/auth/avatars/${uuid}`)
    expect(sanitizePublicAvatarUrl('ftp://bad')).toBeNull()
  })
})
