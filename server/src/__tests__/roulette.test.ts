import {
  spinWheel,
  payoutForBet,
  validateRouletteBets,
  resolveSpin,
  isRouletteRed,
  resultColor,
  ROULETTE_MIN_BET,
  ROULETTE_MAX_BET_CAP,
  ROULETTE_MAX_TOTAL_STAKE,
  type RouletteBetNormalized,
} from '../logic/roulette.js'

function rngAlways(n: number): (min: number, max: number) => number {
  return () => n
}

describe('roulette — spinWheel', () => {
  test('retourne la valeur forcée par le RNG', () => {
    expect(spinWheel(rngAlways(0))).toBe(0)
    expect(spinWheel(rngAlways(36))).toBe(36)
    expect(spinWheel(rngAlways(17))).toBe(17)
  })
})

describe('roulette — couleurs', () => {
  test('0 vert', () => {
    expect(resultColor(0)).toBe('green')
  })
  test('rouges connus', () => {
    expect(isRouletteRed(1)).toBe(true)
    expect(isRouletteRed(36)).toBe(true)
    expect(resultColor(1)).toBe('red')
  })
  test('noirs connus', () => {
    expect(isRouletteRed(2)).toBe(false)
    expect(resultColor(2)).toBe('black')
  })
})

describe('roulette — payoutForBet', () => {
  const amt = 10
  test('plein gagne 36×', () => {
    const b: RouletteBetNormalized = { type: 'straight', n: 7, amount: amt }
    expect(payoutForBet(b, 7)).toBe(360)
    expect(payoutForBet(b, 8)).toBe(0)
  })
  test('plein sur 0', () => {
    const b: RouletteBetNormalized = { type: 'straight', n: 0, amount: amt }
    expect(payoutForBet(b, 0)).toBe(360)
  })
  test('cheval', () => {
    const b: RouletteBetNormalized = { type: 'split', a: 1, b: 2, amount: amt }
    expect(payoutForBet(b, 1)).toBe(180)
    expect(payoutForBet(b, 2)).toBe(180)
    expect(payoutForBet(b, 3)).toBe(0)
  })
  test('transversale', () => {
    const b: RouletteBetNormalized = { type: 'street', base: 1, amount: amt }
    expect(payoutForBet(b, 1)).toBe(120)
    expect(payoutForBet(b, 2)).toBe(120)
    expect(payoutForBet(b, 3)).toBe(120)
    expect(payoutForBet(b, 4)).toBe(0)
  })
  test('carré', () => {
    const b: RouletteBetNormalized = { type: 'corner', nums: [1, 2, 4, 5], amount: amt }
    expect(payoutForBet(b, 1)).toBe(90)
    expect(payoutForBet(b, 5)).toBe(90)
    expect(payoutForBet(b, 3)).toBe(0)
  })
  test('sixain', () => {
    const b: RouletteBetNormalized = { type: 'sixLine', base: 1, amount: amt }
    expect(payoutForBet(b, 6)).toBe(60)
    expect(payoutForBet(b, 7)).toBe(0)
  })
  test('douzaine', () => {
    const b: RouletteBetNormalized = { type: 'dozen', which: 1, amount: amt }
    expect(payoutForBet(b, 12)).toBe(30)
    expect(payoutForBet(b, 13)).toBe(0)
    expect(payoutForBet(b, 0)).toBe(0)
  })
  test('colonne', () => {
    const b: RouletteBetNormalized = { type: 'column', which: 1, amount: amt }
    expect(payoutForBet(b, 1)).toBe(30)
    expect(payoutForBet(b, 2)).toBe(0)
    expect(payoutForBet(b, 0)).toBe(0)
  })
  test('rouge / noir', () => {
    expect(payoutForBet({ type: 'red', amount: amt }, 1)).toBe(20)
    expect(payoutForBet({ type: 'red', amount: amt }, 2)).toBe(0)
    expect(payoutForBet({ type: 'black', amount: amt }, 2)).toBe(20)
  })
  test('pair / impair — 0 perd', () => {
    expect(payoutForBet({ type: 'even', amount: amt }, 2)).toBe(20)
    expect(payoutForBet({ type: 'even', amount: amt }, 0)).toBe(0)
    expect(payoutForBet({ type: 'odd', amount: amt }, 3)).toBe(20)
  })
  test('manque / passe — 0 perd', () => {
    expect(payoutForBet({ type: 'low', amount: amt }, 18)).toBe(20)
    expect(payoutForBet({ type: 'low', amount: amt }, 19)).toBe(0)
    expect(payoutForBet({ type: 'high', amount: amt }, 19)).toBe(20)
    expect(payoutForBet({ type: 'high', amount: amt }, 0)).toBe(0)
  })
})

describe('roulette — validateRouletteBets', () => {
  test('refuse si pas tableau', () => {
    expect(validateRouletteBets(null, 1000).ok).toBe(false)
  })
  test('refuse vide', () => {
    expect(validateRouletteBets([], 1000).ok).toBe(false)
  })
  test('refuse solde insuffisant', () => {
    const r = validateRouletteBets([{ type: 'red', amount: ROULETTE_MIN_BET }], 5)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('INSUFFICIENT_CHIPS')
  })
  test('refuse split invalide', () => {
    const r = validateRouletteBets([{ type: 'split', a: 1, b: 3, amount: ROULETTE_MIN_BET }], 1000)
    expect(r.ok).toBe(false)
  })
  test('accepte mise valide', () => {
    const r = validateRouletteBets(
      [
        { type: 'straight', n: 17, amount: ROULETTE_MIN_BET },
        { type: 'black', amount: ROULETTE_MIN_BET },
      ],
      1000
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.totalStake).toBe(ROULETTE_MIN_BET * 2)
      expect(r.bets).toHaveLength(2)
    }
  })
  test('refuse total stake trop élevé', () => {
    const many = Array.from({ length: 10 }, () => ({
      type: 'red' as const,
      amount: ROULETTE_MAX_BET_CAP,
    }))
    const r = validateRouletteBets(many, 1_000_000)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('TOTAL_STAKE_TOO_HIGH')
  })
})

describe('roulette — resolveSpin', () => {
  test('cohérent avec somme des payouts', () => {
    const bets: RouletteBetNormalized[] = [
      { type: 'straight', n: 5, amount: 10 },
      { type: 'red', amount: 10 },
    ]
    const { breakdown, totalPayout, totalStake } = resolveSpin(bets, 5)
    expect(totalStake).toBe(20)
    expect(totalPayout).toBe(360 + 20)
    expect(breakdown).toHaveLength(2)
    expect(breakdown[0]!.payout).toBe(360)
    expect(breakdown[1]!.payout).toBe(20)
  })
})
