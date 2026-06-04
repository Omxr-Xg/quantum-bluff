import { BeloteTableController } from '../BeloteTableController.js'
import { applyContreeBidAction, contractMultiplier, getHighestBid } from '../conteeBidding.js'
import { computeDealScore } from '../conteeScoring.js'
import { canPlayCard, trickWinnerPosition } from '../trickPlay.js'
import { trickCardStrength } from '../scoring.js'
import { cardPoints, sumTrickPoints } from '../scoring.js'
import type { BeloteCard, BeloteGameState } from '../types.js'

function makeTable() {
  return new BeloteTableController({
    gameId: 'test-game',
    roomId: 'test-room',
    targetScore: 500,
    buyIn: 100,
    players: [
      { userId: 'u0', username: 'P0', position: 0 },
      { userId: 'u1', username: 'P1', position: 1 },
      { userId: 'u2', username: 'P2', position: 2 },
      { userId: 'u3', username: 'P3', position: 3 },
    ],
  })
}

describe('belote scoring', () => {
  it('trump jack is worth 20', () => {
    expect(cardPoints({ suit: 'HEARTS', rank: 'J' }, 'HEARTS')).toBe(20)
  })

  it('non-trump jack is worth 2', () => {
    expect(cardPoints({ suit: 'HEARTS', rank: 'J' }, 'CLUBS')).toBe(2)
  })
})

describe('belote trick legality', () => {
  it('must follow suit when possible', () => {
    const hand: BeloteCard[] = [
      { suit: 'HEARTS', rank: '7' },
      { suit: 'CLUBS', rank: 'A' },
    ]
    const trick = [{ position: 0, card: { suit: 'HEARTS' as const, rank: 'K' as const } }]
    expect(canPlayCard(hand, { suit: 'CLUBS', rank: 'A' }, 'DIAMONDS', trick, 1)).toBe(false)
    expect(canPlayCard(hand, { suit: 'HEARTS', rank: '7' }, 'DIAMONDS', trick, 1)).toBe(true)
  })

  it('may play a weaker led card when a stronger one also beats', () => {
    const hand: BeloteCard[] = [
      { suit: 'HEARTS', rank: '10' },
      { suit: 'HEARTS', rank: 'A' },
    ]
    const trick = [{ position: 0, card: { suit: 'HEARTS' as const, rank: 'K' as const } }]
    expect(canPlayCard(hand, { suit: 'HEARTS', rank: 'A' }, 'SPADES', trick, 1)).toBe(true)
    expect(canPlayCard(hand, { suit: 'HEARTS', rank: '10' }, 'SPADES', trick, 1)).toBe(true)
  })

  it('must beat with a led card when possible, not only the strongest in hand', () => {
    const hand: BeloteCard[] = [
      { suit: 'HEARTS', rank: '8' },
      { suit: 'HEARTS', rank: 'A' },
    ]
    const trick = [{ position: 0, card: { suit: 'HEARTS' as const, rank: 'K' as const } }]
    expect(canPlayCard(hand, { suit: 'HEARTS', rank: '8' }, 'SPADES', trick, 1)).toBe(false)
    expect(canPlayCard(hand, { suit: 'HEARTS', rank: 'A' }, 'SPADES', trick, 1)).toBe(true)
  })

  it('may discard any card when partner is winning the trick', () => {
    const hand: BeloteCard[] = [
      { suit: 'CLUBS', rank: '7' },
      { suit: 'DIAMONDS', rank: 'A' },
    ]
    const trump = 'SPADES' as const
    const trick = [
      { position: 0, card: { suit: 'HEARTS' as const, rank: 'A' as const } },
      { position: 2, card: { suit: 'HEARTS' as const, rank: '8' as const } },
    ]
    expect(canPlayCard(hand, { suit: 'CLUBS', rank: '7' }, trump, trick, 2)).toBe(true)
    expect(canPlayCard(hand, { suit: 'DIAMONDS', rank: 'A' }, trump, trick, 2)).toBe(true)
  })
})

describe('BeloteTableController', () => {
  it('deals 8 cards to each player', () => {
    const t = makeTable()
    const s = t.getSanitizedState('u0')
    expect(s.players.every((p) => p.handCount === 8)).toBe(true)
  })

  it('starts in contree bidding phase', () => {
    const t = makeTable()
    expect(t.getState().variant).toBe('CONTEE')
    expect(t.getState().phase).toBe('BIDDING')
  })

  it('rejects play before bidding completes', () => {
    const t = makeTable()
    const s = t.getState()
    const card = s.players[0].hand[0]
    const r = t.applyAction('u0', { type: 'PLAY_CARD', card })
    expect(r.ok).toBe(false)
  })

  it('sanitized state hides opponent hands', () => {
    const t = makeTable()
    const mine = t.getSanitizedState('u0')
    const opp = mine.players.find((p) => p.userId === 'u1')
    expect(opp?.hand).toBeUndefined()
    expect(opp?.handCount).toBe(8)
  })

  it('exposes legal bids on your auction turn', () => {
    const t = makeTable()
    const s = t.getState()
    const turnUser = s.players.find((p) => p.position === s.biddingTurnPosition)!.userId
    const view = t.getSanitizedState(turnUser)
    expect(view.myLegalBids?.length).toBeGreaterThan(0)
    expect(view.myLegalBids?.[0].value).toBe(80)
  })
})

describe('contree bidding', () => {
  function auctionState(): BeloteGameState {
    const t = makeTable()
    return t.getState()
  }

  it('accepts opening bid 80', () => {
    const state = auctionState()
    const pos = state.biddingTurnPosition
    const r = applyContreeBidAction(state, pos, {
      type: 'BID',
      value: 80,
      trump: 'HEARTS',
    })
    expect(r.ok).toBe(true)
    expect(getHighestBid(state.bids as never)?.value).toBe(80)
  })

  it('rejects bid lower than current highest', () => {
    const state = auctionState()
    const pos = state.biddingTurnPosition
    applyContreeBidAction(state, pos, { type: 'BID', value: 90, trump: 'SPADES' })
    const next = (pos + 1) % 4
    const r = applyContreeBidAction(state, next, { type: 'BID', value: 90, trump: 'HEARTS' })
    expect(r.ok).toBe(false)
  })
})

describe('contree scoring', () => {
  it('doubles contract with contree multiplier', () => {
    expect(contractMultiplier(1)).toBe(2)
    expect(contractMultiplier(2)).toBe(4)
  })

  it('awards defense when contract fails', () => {
    const state = makeTable().getState()
    state.phase = 'PLAYING'
    state.contractPoints = 100
    state.contreeLevel = 0
    state.deal.contractTeam = 'A'
    state.deal.dealPointsA = 40
    state.deal.dealPointsB = 122
    const summary = computeDealScore(state, 'B')
    expect(summary.made).toBe(false)
    expect(summary.scoreB).toBeGreaterThan(0)
    expect(summary.scoreA).toBe(0)
  })
})

describe('card strength (belote order)', () => {
  const trump = 'DIAMONDS' as const
  const led = 'HEARTS' as const

  it('Ace beats King in led side suit', () => {
    const trick = [
      { position: 0, card: { suit: led, rank: 'K' as const } },
      { position: 1, card: { suit: led, rank: 'A' as const } },
    ]
    expect(trickWinnerPosition(trick, trump)).toBe(1)
    expect(trickCardStrength({ suit: led, rank: 'A' }, trump, led)).toBeGreaterThan(
      trickCardStrength({ suit: led, rank: 'K' }, trump, led),
    )
  })

  it('Ace beats Ten in led side suit', () => {
    const trick = [
      { position: 0, card: { suit: led, rank: '10' as const } },
      { position: 1, card: { suit: led, rank: 'A' as const } },
    ]
    expect(trickWinnerPosition(trick, trump)).toBe(1)
  })

  it('trump Jack beats Ace of led suit', () => {
    const trick = [
      { position: 0, card: { suit: led, rank: 'A' as const } },
      { position: 1, card: { suit: trump, rank: 'J' as const } },
    ]
    expect(trickWinnerPosition(trick, trump)).toBe(1)
  })

  it('when trump is led, Jack beats Ace of trump', () => {
    const trick = [
      { position: 0, card: { suit: trump, rank: 'A' as const } },
      { position: 1, card: { suit: trump, rank: 'J' as const } },
    ]
    expect(trickWinnerPosition(trick, trump)).toBe(1)
    expect(trickCardStrength({ suit: trump, rank: 'J' }, trump, trump)).toBeGreaterThan(
      trickCardStrength({ suit: trump, rank: 'A' }, trump, trump),
    )
  })
})

describe('trick points', () => {
  it('sums card values', () => {
    const cards: BeloteCard[] = [
      { suit: 'HEARTS', rank: 'A' },
      { suit: 'HEARTS', rank: '10' },
    ]
    expect(sumTrickPoints(cards, 'HEARTS')).toBe(21)
  })
})
