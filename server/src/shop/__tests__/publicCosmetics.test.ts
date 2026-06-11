import { resolvePublicCosmetics } from '../publicCosmetics.js'

describe('resolvePublicCosmetics', () => {
  it('retourne null pour chaque slot sans équipement', () => {
    expect(resolvePublicCosmetics({})).toEqual({
      banner: null,
      frame: null,
      title: null,
    })
  })

  it('résout bannière, cadre et titre depuis le catalogue', () => {
    const cosmetics = resolvePublicCosmetics({
      equippedBannerId: 'banner_ban_generic',
      equippedFrameId: 'frame_gold',
      equippedTitleId: 'title_champion',
    })

    expect(cosmetics.banner).toEqual({
      id: 'banner_ban_generic',
      gradient: 'url("/cosmetic-banners/ban1.webp")',
      overlayOpacity: 0.32,
    })
    expect(cosmetics.frame?.id).toBe('frame_gold')
    expect(cosmetics.frame?.border).toBeTruthy()
    expect(cosmetics.title).toEqual({
      id: 'title_champion',
      nameKey: 'cosmetic.title.champion',
      color: expect.any(String),
    })
  })

  it('ignore les ids inconnus ou mal typés', () => {
    expect(
      resolvePublicCosmetics({
        equippedBannerId: 'unknown_banner',
        equippedFrameId: 'banner_ban_generic',
        equippedTitleId: null,
      }),
    ).toEqual({
      banner: null,
      frame: null,
      title: null,
    })
  })
})
