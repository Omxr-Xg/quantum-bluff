import { describe, expect, it } from 'vitest'
import { parseAvailableGiftCodesResponse } from '../giftCodesClient'

describe('parseAvailableGiftCodesResponse', () => {
  it('accepte un tableau brut', () => {
    const rows = [{ id: '1', code: 'ABC', amount: 100 }]
    expect(parseAvailableGiftCodesResponse(rows)).toEqual(rows)
  })

  it('accepte { codes: [...] }', () => {
    const rows = [{ id: '1', code: 'XYZ', amount: 50 }]
    expect(parseAvailableGiftCodesResponse({ codes: rows })).toEqual(rows)
  })

  it('retourne [] pour une forme inconnue', () => {
    expect(parseAvailableGiftCodesResponse({ items: [] })).toEqual([])
    expect(parseAvailableGiftCodesResponse(null)).toEqual([])
  })
})
