import { getPresenceBatch } from '../services/presence.service.js'

describe('getPresenceBatch', () => {
  it('retourne online/activity pour chaque userId', async () => {
    const map = await getPresenceBatch(['u1', 'u2'])
    expect(map.size).toBe(2)
    expect(map.get('u1')).toEqual({ online: false, activity: null, lastSeenAt: null })
    expect(map.get('u2')).toEqual({ online: false, activity: null, lastSeenAt: null })
  })

  it('déduplique les ids', async () => {
    const map = await getPresenceBatch(['u1', 'u1', ''])
    expect(map.size).toBe(1)
  })
})
