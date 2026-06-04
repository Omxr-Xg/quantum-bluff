import { teamForPosition } from '../bidding.js'
import { BeloteTableController } from '../BeloteTableController.js'
import { applyContreeBidAction, contractMultiplier, getHighestBid } from '../conteeBidding.js'
import { computeDealScore } from '../conteeScoring.js'
import { canPlayCard, playableCards, trickWinnerPosition } from '../trickPlay.js'
import { trickCardStrength } from '../scoring.js'
import type { TrumpContext } from '../trumpContext.js'
import { cardPoints, sumTrickPoints } from '../scoring.js'
import type { BeloteCard, BeloteGameState } from '../types.js'

function makeTable() {
  return new BeloteTableController({
    gameId: 'test-game',
    roomId: 'test-room',
    targetScore: 500,
    buyIn: 100,
    variant: 'CONTEE' as const,
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

function suitCtx(suit: BeloteCard['suit']): TrumpContext {
  return { mode: 'SUIT', suit }
}

describe('belote trick legality', () => {
  it('must follow suit when possible', () => {
    const hand: BeloteCard[] = [
      { suit: 'HEARTS', rank: '7' },
      { suit: 'CLUBS', rank: 'A' },
    ]
    const trick = [{ position: 0, card: { suit: 'HEARTS' as const, rank: 'K' as const } }]
    expect(canPlayCard(hand, { suit: 'CLUBS', rank: 'A' }, suitCtx('DIAMONDS'), trick, 1)).toBe(false)
    expect(canPlayCard(hand, { suit: 'HEARTS', rank: '7' }, suitCtx('DIAMONDS'), trick, 1)).toBe(true)
  })

  it('may play a weaker led card when a stronger one also beats', () => {
    const hand: BeloteCard[] = [
      { suit: 'HEARTS', rank: '10' },
      { suit: 'HEARTS', rank: 'A' },
    ]
    const trick = [{ position: 0, card: { suit: 'HEARTS' as const, rank: 'K' as const } }]
    expect(canPlayCard(hand, { suit: 'HEARTS', rank: 'A' }, suitCtx('SPADES'), trick, 1)).toBe(true)
    expect(canPlayCard(hand, { suit: 'HEARTS', rank: '10' }, suitCtx('SPADES'), trick, 1)).toBe(true)
  })

  it('must beat with a led card when possible, not only the strongest in hand', () => {
    const hand: BeloteCard[] = [
      { suit: 'HEARTS', rank: '8' },
      { suit: 'HEARTS', rank: 'A' },
    ]
    const trick = [{ position: 0, card: { suit: 'HEARTS' as const, rank: 'K' as const } }]
    expect(canPlayCard(hand, { suit: 'HEARTS', rank: '8' }, suitCtx('SPADES'), trick, 1)).toBe(false)
    expect(canPlayCard(hand, { suit: 'HEARTS', rank: 'A' }, suitCtx('SPADES'), trick, 1)).toBe(true)
  })

  it('must play led suit when holding it even if trump is winning', () => {
    const hand: BeloteCard[] = [
      { suit: 'DIAMONDS', rank: '10' },
      { suit: 'HEARTS', rank: 'K' },
      { suit: 'CLUBS', rank: 'A' },
    ]
    const ctx = suitCtx('HEARTS')
    const trick = [
      { position: 1, card: { suit: 'DIAMONDS' as const, rank: 'K' as const } },
      { position: 2, card: { suit: 'HEARTS' as const, rank: '9' as const } },
      { position: 3, card: { suit: 'HEARTS' as const, rank: '8' as const } },
    ]
    expect(canPlayCard(hand, { suit: 'DIAMONDS', rank: '10' }, ctx, trick, 0)).toBe(
      true,
    )
    expect(canPlayCard(hand, { suit: 'HEARTS', rank: 'K' }, ctx, trick, 0)).toBe(
      false,
    )
    expect(playableCards(hand, ctx, trick, 0).length).toBeGreaterThan(0)
  })

  it('may discard any card when partner is winning the trick', () => {
    const hand: BeloteCard[] = [
      { suit: 'CLUBS', rank: '7' },
      { suit: 'DIAMONDS', rank: 'A' },
    ]
    const ctx = suitCtx('SPADES')
    const trick = [
      { position: 0, card: { suit: 'HEARTS' as const, rank: 'A' as const } },
      { position: 2, card: { suit: 'HEARTS' as const, rank: '8' as const } },
    ]
    expect(canPlayCard(hand, { suit: 'CLUBS', rank: '7' }, ctx, trick, 2)).toBe(true)
    expect(canPlayCard(hand, { suit: 'DIAMONDS', rank: 'A' }, ctx, trick, 2)).toBe(true)
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

  it('contree round: defenders then attackers can pass in turn', () => {
    const state = auctionState()
    const opener = state.biddingTurnPosition
    applyContreeBidAction(state, opener, { type: 'BID', value: 80, trump: 'HEARTS' })
    for (let i = 0; i < 3; i++) {
      applyContreeBidAction(state, state.biddingTurnPosition, { type: 'PASS' })
    }
    expect(state.phase).toBe('CONTREE_ROUND')
    expect(state.contreePhase).toBe('DEFENSE')

    const contractTeam = state.deal.contractTeam!
    const defenseTeam: 'A' | 'B' = contractTeam === 'A' ? 'B' : 'A'

    const d1 = state.biddingTurnPosition
    expect(teamForPosition(d1)).toBe(defenseTeam)
    expect(applyContreeBidAction(state, d1, { type: 'PASS' }).ok).toBe(true)

    const d2 = state.biddingTurnPosition
    expect(teamForPosition(d2)).toBe(defenseTeam)
    expect(d2).not.toBe(d1)
    expect(applyContreeBidAction(state, d2, { type: 'PASS' }).ok).toBe(true)
    expect(state.contreePhase).toBe('ATTACK')

    const a1 = state.biddingTurnPosition
    expect(teamForPosition(a1)).toBe(contractTeam)
    expect(applyContreeBidAction(state, a1, { type: 'PASS' }).ok).toBe(true)

    const a2 = state.biddingTurnPosition
    expect(teamForPosition(a2)).toBe(contractTeam)
    expect(a2).not.toBe(a1)
    const end = applyContreeBidAction(state, a2, { type: 'PASS' })
    expect(end.ok).toBe(true)
    if (end.ok) expect(end.startPlay).toBe(true)
  })
})

describe('BeloteTableController contree integration', () => {
  it('plays after auction without skipping contree round', () => {
    const table = makeTable()
    const s0 = table.getState()
    const opener = s0.players.find((p) => p.position === s0.biddingTurnPosition)!
    table.applyAction(opener.userId, { type: 'BID', value: 80, trump: 'HEARTS' })
    for (let i = 0; i < 3; i++) {
      const u = table.getState().players.find(
        (p) => p.position === table.getState().biddingTurnPosition,
      )!
      table.applyAction(u.userId, { type: 'PASS' })
    }
    expect(table.getState().phase).toBe('CONTREE_ROUND')
    for (let i = 0; i < 8 && table.getState().phase === 'CONTREE_ROUND'; i++) {
      const u = table.getState().players.find(
        (p) => p.position === table.getState().biddingTurnPosition,
      )!
      const r = table.applyAction(u.userId, { type: 'PASS' })
      expect(r.ok).toBe(true)
    }
    expect(table.getState().phase).toBe('PLAYING')
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
  const ctx = suitCtx(trump)

  it('Ace beats King in led side suit', () => {
    const trick = [
      { position: 0, card: { suit: led, rank: 'K' as const } },
      { position: 1, card: { suit: led, rank: 'A' as const } },
    ]
    expect(trickWinnerPosition(trick, ctx)).toBe(1)
    expect(trickCardStrength({ suit: led, rank: 'A' }, trump, led)).toBeGreaterThan(
      trickCardStrength({ suit: led, rank: 'K' }, trump, led),
    )
  })

  it('Ace beats Ten in led side suit', () => {
    const trick = [
      { position: 0, card: { suit: led, rank: '10' as const } },
      { position: 1, card: { suit: led, rank: 'A' as const } },
    ]
    expect(trickWinnerPosition(trick, ctx)).toBe(1)
  })

  it('trump Jack beats Ace of led suit', () => {
    const trick = [
      { position: 0, card: { suit: led, rank: 'A' as const } },
      { position: 1, card: { suit: trump, rank: 'J' as const } },
    ]
    expect(trickWinnerPosition(trick, ctx)).toBe(1)
  })

  it('when trump is led, Jack beats Ace of trump', () => {
    const trick = [
      { position: 0, card: { suit: trump, rank: 'A' as const } },
      { position: 1, card: { suit: trump, rank: 'J' as const } },
    ]
    expect(trickWinnerPosition(trick, ctx)).toBe(1)
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
