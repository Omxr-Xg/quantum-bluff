import {
  computeSlotWin,
  rollFourReels,
  spinSlot,
  validateSlotBet,
  isSlotBonusLine,
  SLOT_MIN_BET,
  SLOT_MAX_BET_CAP,
  type SlotReels,
} from '../logic/slotMachine.js'

/** RNG déterministe : séquence de valeurs 0..max pour pickSymbol (consommé dans l’ordre). */
function makeSequentialRng(values: number[]): (min: number, max: number) => number {
  let i = 0
  return (min: number, max: number) => {
    const v = values[i] ?? 0
    i++
    expect(v).toBeGreaterThanOrEqual(min)
    expect(v).toBeLessThanOrEqual(max)
    return v
  }
}

describe('slotMachine — computeSlotWin (4 rouleaux)', () => {
  test('4 cerises = mise × 12', () => {
    const reels: SlotReels = ['cherry', 'cherry', 'cherry', 'cherry']
    expect(computeSlotWin(100, reels)).toBe(1200)
  })

  test('4 sept = mise × 200', () => {
    expect(computeSlotWin(10, ['seven', 'seven', 'seven', 'seven'])).toBe(2000)
  })

  test('3 identiques au début = mise × 3', () => {
    expect(computeSlotWin(50, ['cherry', 'cherry', 'cherry', 'bar'])).toBe(150)
  })

  test('3 identiques à la fin = mise × 3', () => {
    expect(computeSlotWin(50, ['bar', 'bell', 'bell', 'bell'])).toBe(150)
  })

  test('paire adjacente = mise × 1.5', () => {
    expect(computeSlotWin(100, ['cherry', 'cherry', 'bar', 'bell'])).toBe(150)
    expect(computeSlotWin(100, ['cherry', 'bell', 'bell', 'seven'])).toBe(150)
  })

  test('aucun alignement = 0', () => {
    expect(computeSlotWin(100, ['cherry', 'bar', 'bell', 'seven'])).toBe(0)
  })
})

describe('slotMachine — isSlotBonusLine', () => {
  test('détecte carré et brelan', () => {
    expect(isSlotBonusLine(['diamond', 'diamond', 'diamond', 'diamond'])).toBe(true)
    expect(isSlotBonusLine(['crown', 'crown', 'crown', 'bar'])).toBe(true)
    expect(isSlotBonusLine(['bar', 'bell', 'bell', 'bell'])).toBe(true)
    expect(isSlotBonusLine(['cherry', 'bar', 'bell', 'seven'])).toBe(false)
  })
})

describe('slotMachine — rollFourReels + spinSlot (RNG injecté)', () => {
  test('rollFourReels utilise le RNG fourni', () => {
    const rng = makeSequentialRng([0, 0, 0, 0])
    const reels = rollFourReels(rng)
    expect(reels.every((s) => s === 'cherry')).toBe(true)
  })

  test('spinSlot cohérent avec computeSlotWin', () => {
    const rng = makeSequentialRng([0, 0, 0, 0])
    const { reels, winAmount } = spinSlot(20, rng)
    expect(reels).toEqual(['cherry', 'cherry', 'cherry', 'cherry'])
    expect(winAmount).toBe(computeSlotWin(20, reels))
  })
})

describe('slotMachine — validateSlotBet', () => {
  test('refuse si solde < mise min', () => {
    expect(validateSlotBet(10, 5).ok).toBe(false)
  })

  test('refuse mise trop basse', () => {
    expect(validateSlotBet(SLOT_MIN_BET - 1, 1000).ok).toBe(false)
  })

  test('refuse mise > plafond', () => {
    expect(validateSlotBet(SLOT_MAX_BET_CAP + 1, 50000).ok).toBe(false)
  })

  test('refuse mise > solde', () => {
    expect(validateSlotBet(500, 100).ok).toBe(false)
  })

  test('accepte mise valide', () => {
    const r = validateSlotBet(100, 500)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.bet).toBe(100)
  })
})
