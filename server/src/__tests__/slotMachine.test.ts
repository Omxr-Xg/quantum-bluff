import {
  computeSlotWin,
  rollThreeReels,
  spinSlot,
  validateSlotBet,
  SLOT_MIN_BET,
  SLOT_MAX_BET_CAP,
  type SlotSymbolId,
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

describe('slotMachine — computeSlotWin', () => {
  test('3 cerises = mise * 5', () => {
    const reels: [SlotSymbolId, SlotSymbolId, SlotSymbolId] = ['cherry', 'cherry', 'cherry']
    expect(computeSlotWin(100, reels)).toBe(500)
  })

  test('3 diamants = mise * 20', () => {
    const reels: [SlotSymbolId, SlotSymbolId, SlotSymbolId] = ['diamond', 'diamond', 'diamond']
    expect(computeSlotWin(10, reels)).toBe(200)
  })

  test('paire = mise * 1', () => {
    expect(computeSlotWin(50, ['cherry', 'cherry', 'lemon'])).toBe(50)
    expect(computeSlotWin(50, ['bell', 'seven', 'bell'])).toBe(50)
  })

  test('aucune paire = 0', () => {
    expect(computeSlotWin(100, ['cherry', 'lemon', 'bell'])).toBe(0)
  })
})

describe('slotMachine — rollThreeReels + spinSlot (RNG injecté)', () => {
  test('rollThreeReels utilise le RNG fourni', () => {
    // Forcer toujours le premier symbole (index 0 dans l’ordre de tirage pondéré → cherry si r=0)
    const rng = makeSequentialRng([0, 0, 0])
    const reels = rollThreeReels(rng)
    expect(reels.every((s) => s === 'cherry')).toBe(true)
  })

  test('spinSlot cohérent avec computeSlotWin', () => {
    const rng = makeSequentialRng([0, 0, 0])
    const { reels, winAmount } = spinSlot(20, rng)
    expect(reels).toEqual(['cherry', 'cherry', 'cherry'])
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
