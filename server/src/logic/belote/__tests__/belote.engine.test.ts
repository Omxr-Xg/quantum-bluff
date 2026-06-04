import { BeloteTableController } from '../BeloteTableController.js'
import { canPlayCard } from '../trickPlay.js'
import { cardPoints, sumTrickPoints } from '../scoring.js'
import type { BeloteCard } from '../types.js'

function makeTable() {
  return new BeloteTableController({
    gameId: 'test-game',
    roomId: 'test-room',
    targetScore: 500,
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
    expect(canPlayCard(hand, { suit: 'CLUBS', rank: 'A' }, 'DIAMONDS', trick)).toBe(false)
    expect(canPlayCard(hand, { suit: 'HEARTS', rank: '7' }, 'DIAMONDS', trick)).toBe(true)
  })
})

describe('BeloteTableController', () => {
  it('deals 8 cards to each player', () => {
    const t = makeTable()
    const s = t.getSanitizedState('u0')
    expect(s.players.every((p) => p.handCount === 8)).toBe(true)
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
