import {
  CUSTOM_FELT_BACKGROUND_UNLOCK,
  CUSTOM_FELT_COLOR_UNLOCK,
  feltBackgroundPriceChips,
  feltThemePriceChips,
  tableUnlockPriceChips,
} from '../tableThemes.catalog.js'

describe('tableThemes.catalog', () => {
  it('tarifs tapis : vert gratuit, autres 10k/20k/30k', () => {
    expect(feltThemePriceChips('default')).toBe(0)
    expect(feltThemePriceChips('vegasRed')).toBe(10_000)
    expect(feltThemePriceChips('vegasPurple')).toBe(20_000)
    expect(feltThemePriceChips('darkBlue')).toBe(30_000)
  })

  it('tarifs fonds : ba1 gratuit, ba2/ba4 15k, ba3 10k', () => {
    expect(feltBackgroundPriceChips('ba1')).toBe(0)
    expect(feltBackgroundPriceChips('ba2')).toBe(15_000)
    expect(feltBackgroundPriceChips('ba3')).toBe(10_000)
    expect(feltBackgroundPriceChips('ba4')).toBe(15_000)
  })

  it('options personnalisées à 50k et 40k', () => {
    expect(tableUnlockPriceChips(CUSTOM_FELT_COLOR_UNLOCK)).toBe(50_000)
    expect(tableUnlockPriceChips(CUSTOM_FELT_BACKGROUND_UNLOCK)).toBe(40_000)
  })
})
