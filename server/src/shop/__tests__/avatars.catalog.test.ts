import {
  AVATAR_PRESET_IDS,
  AVATAR_PRESET_PRICES,
  FREE_AVATAR_IDS,
  avatarPresetPriceChips,
  isFreeAvatarPreset,
} from '../avatars.catalog.js'

describe('avatars.catalog', () => {
  it('expose 24 presets utilisateur', () => {
    expect(AVATAR_PRESET_IDS).toHaveLength(24)
  })

  it('marque FA1, FJ1, HA1, HJ1 comme gratuits', () => {
    expect([...FREE_AVATAR_IDS].sort()).toEqual(['FA1', 'FJ1', 'HA1', 'HJ1'])
    for (const id of FREE_AVATAR_IDS) {
      expect(isFreeAvatarPreset(id)).toBe(true)
      expect(avatarPresetPriceChips(id)).toBe(0)
    }
  })

  it('facture entre 1500 et 15000 jetons pour les presets payants', () => {
    const paid = AVATAR_PRESET_IDS.filter((id) => !FREE_AVATAR_IDS.has(id))
    expect(paid.length).toBe(20)
    const prices = paid.map((id) => avatarPresetPriceChips(id))
    expect(Math.min(...prices)).toBe(1_500)
    expect(Math.max(...prices)).toBe(15_000)
    expect(new Set(prices).size).toBe(paid.length)
    for (const id of paid) {
      expect(avatarPresetPriceChips(id)).toBe(AVATAR_PRESET_PRICES[id])
      expect(avatarPresetPriceChips(id)).toBeGreaterThanOrEqual(1_500)
      expect(avatarPresetPriceChips(id)).toBeLessThanOrEqual(15_000)
    }
  })
})
