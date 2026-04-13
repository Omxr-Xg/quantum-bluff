import {
  handValue,
  isNaturalBlackjack,
  dealerShouldHit,
  settleRound,
  validateBlackjackBet,
  playDealerHand,
  drawCard,
  type Card,
} from '../logic/blackjack.js'
import { BLACKJACK_MIN_BET } from '../logic/blackjack.js'

describe('blackjack handValue', () => {
  it('empty', () => {
    expect(handValue([]).total).toBe(0)
  })

  it('hard 20', () => {
    const c: Card[] = [
      { rank: 'K', suit: 'h' },
      { rank: '10', suit: 'd' },
    ]
    expect(handValue(c).total).toBe(20)
    expect(handValue(c).bust).toBe(false)
  })

  it('soft 21', () => {
    const c: Card[] = [
      { rank: 'A', suit: 'h' },
      { rank: 'K', suit: 'd' },
    ]
    expect(handValue(c).total).toBe(21)
    expect(handValue(c).soft).toBe(true)
  })

  it('Ace low after bust risk', () => {
    const c: Card[] = [
      { rank: 'A', suit: 'h' },
      { rank: '9', suit: 'd' },
      { rank: '9', suit: 'c' },
    ]
    // 11+9+9 = 29 -> reduce ace -> 1+9+9 = 19
    expect(handValue(c).total).toBe(19)
    expect(handValue(c).bust).toBe(false)
  })

  it('bust', () => {
    const c: Card[] = [
      { rank: 'K', suit: 'h' },
      { rank: 'Q', suit: 'd' },
      { rank: '5', suit: 'c' },
    ]
    expect(handValue(c).bust).toBe(true)
  })
})

describe('blackjack natural', () => {
  it('detects natural', () => {
    expect(
      isNaturalBlackjack([
        { rank: 'A', suit: 'h' },
        { rank: 'Q', suit: 'd' },
      ])
    ).toBe(true)
  })

  it('21 in 3 cards is not natural', () => {
    expect(
      isNaturalBlackjack([
        { rank: '7', suit: 'h' },
        { rank: '7', suit: 'd' },
        { rank: '7', suit: 'c' },
      ])
    ).toBe(false)
  })
})

describe('dealerShouldHit', () => {
  it('hits on 16', () => {
    expect(
      dealerShouldHit([
        { rank: '10', suit: 'h' },
        { rank: '6', suit: 'd' },
      ])
    ).toBe(true)
  })

  it('stands on 17', () => {
    expect(
      dealerShouldHit([
        { rank: '10', suit: 'h' },
        { rank: '7', suit: 'd' },
      ])
    ).toBe(false)
  })
})

describe('settleRound', () => {
  it('both natural push', () => {
    const p: Card[] = [
      { rank: 'A', suit: 'h' },
      { rank: 'K', suit: 'd' },
    ]
    const d: Card[] = [
      { rank: 'A', suit: 'c' },
      { rank: 'J', suit: 's' },
    ]
    const r = settleRound(p, d, 100)
    expect(r.reason).toBe('push')
    expect(r.payout).toBe(100)
  })

  it('player natural pays 3:2', () => {
    const p: Card[] = [
      { rank: 'A', suit: 'h' },
      { rank: 'K', suit: 'd' },
    ]
    const d: Card[] = [
      { rank: '9', suit: 'c' },
      { rank: '8', suit: 's' },
    ]
    const r = settleRound(p, d, 100)
    expect(r.reason).toBe('player_blackjack')
    expect(r.payout).toBe(100 + Math.floor(150))
  })

  it('dealer bust player wins double', () => {
    const p: Card[] = [
      { rank: '9', suit: 'h' },
      { rank: '7', suit: 'd' },
    ]
    const d: Card[] = [
      { rank: 'K', suit: 'c' },
      { rank: 'K', suit: 's' },
      { rank: '5', suit: 'h' },
    ]
    const r = settleRound(p, d, 50)
    expect(r.reason).toBe('dealer_bust')
    expect(r.payout).toBe(100)
  })

  it('player bust loses', () => {
    const p: Card[] = [
      { rank: 'K', suit: 'h' },
      { rank: 'Q', suit: 'd' },
      { rank: '5', suit: 'c' },
    ]
    const d: Card[] = [
      { rank: '10', suit: 's' },
      { rank: '7', suit: 'h' },
    ]
    expect(settleRound(p, d, 40).payout).toBe(0)
    expect(settleRound(p, d, 40).reason).toBe('player_bust')
  })
})

describe('validateBlackjackBet', () => {
  it('accepts valid bet', () => {
    const v = validateBlackjackBet(100, 500, 1000)
    expect(v.ok).toBe(true)
    if (v.ok) expect(v.bet).toBe(100)
  })

  it('too low', () => {
    const v = validateBlackjackBet(BLACKJACK_MIN_BET - 1, 500, 1000)
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.code).toBe('BET_TOO_LOW')
  })
})

describe('playDealerHand', () => {
  it('draws until >= 17', () => {
    const dealer: Card[] = [
      { rank: '6', suit: 'h' },
      { rank: '5', suit: 'd' },
    ]
    // 11 + 4 = 15 -> hit; 15 + 5 = 20 -> stand
    const shoe: Card[] = [
      { rank: '4', suit: 'c' },
      { rank: '5', suit: 's' },
    ]
    playDealerHand(dealer, shoe)
    expect(dealer.length).toBe(4)
    expect(handValue(dealer).total).toBeGreaterThanOrEqual(17)
    expect(shoe.length).toBe(0)
  })

  it('drawCard throws on empty shoe', () => {
    expect(() => drawCard([])).toThrow('SHOE_EMPTY')
  })
})
