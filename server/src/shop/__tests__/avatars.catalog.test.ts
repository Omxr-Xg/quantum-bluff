import {
  AVATAR_PRESET_IDS,
  FREE_AVATAR_IDS,
  PAID_AVATAR_PRICE_CHIPS,
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

  it('facture 2500 jetons pour les autres presets', () => {
    const paid = AVATAR_PRESET_IDS.filter((id) => !FREE_AVATAR_IDS.has(id))
    expect(paid.length).toBe(20)
    for (const id of paid) {
      expect(avatarPresetPriceChips(id)).toBe(PAID_AVATAR_PRICE_CHIPS)
    }
  })
})
