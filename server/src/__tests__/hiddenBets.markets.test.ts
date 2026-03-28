import { validateSelections, computeQuotedOdds } from '../poker/hiddenBets/markets.js'

describe('hidden bets markets', () => {
  it('valide SINGLE PLAYER_WINS', () => {
    const r = validateSelections([{ marketType: 'PLAYER_WINS', playerId: 'u1' }], 'SINGLE', 'PRE_HAND')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.selections[0].marketType).toBe('PLAYER_WINS')
  })

  it('valide AND whitelist', () => {
    const r = validateSelections(
      [
        { marketType: 'PLAYER_WINS', playerId: 'u1' },
        { marketType: 'WINNING_HAND_CLASS', class: 'STRAIGHT' },
      ],
      'AND',
      'PRE_HAND'
    )
    expect(r.ok).toBe(true)
  })

  it('refuse AND non whitelist', () => {
    const r = validateSelections(
      [
        { marketType: 'WINNING_HAND_CLASS', class: 'STRAIGHT' },
        { marketType: 'WINNING_HAND_CLASS', class: 'FLUSH' },
      ],
      'AND',
      'PRE_HAND'
    )
    expect(r.ok).toBe(false)
  })

  it('computeQuotedOdds PLAYER_WINS', () => {
    const v = validateSelections([{ marketType: 'PLAYER_WINS', playerId: 'a' }], 'SINGLE', 'PRE_HAND')
    expect(v.ok).toBe(true)
    if (!v.ok) return
    const odds = computeQuotedOdds(v.selections, 'SINGLE', 4, 'PRE_HAND')
    expect(odds).toBeGreaterThan(2)
  })
})
