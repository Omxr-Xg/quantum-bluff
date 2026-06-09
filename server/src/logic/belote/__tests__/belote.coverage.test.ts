import { BeloteTableController } from '../BeloteTableController.js'
import {
  applyContreeBidAction,
  biddingFinished,
  contractMultiplier,
  getHighestBid,
  isValidBidValue,
} from '../conteeBidding.js'
import { computeClassicDealScore } from '../classicScoring.js'
import { applyClassiqueBidAction } from '../classiqueBidding.js'
import {
  BELOTE_BUY_IN_DEFAULT,
  BELOTE_BUY_IN_MAX,
  BELOTE_BUY_IN_MIN,
  BeloteInsufficientChipsError,
  belotePotTotal,
  beloteWinnerPayout,
  normalizeBeloteBuyIn,
} from '../beloteBuyIn.js'
import {
  allowsSpecialTrumps,
  isValidTrumpChoice,
  normalizeBeloteVariant,
  usesAuctionBidding,
  usesContreeRound,
} from '../beloteVariants.js'
import { firstLegalCard, playableCards, trickWinnerPosition } from '../trickPlay.js'
import {
  cardPoints,
  isTrumpCard,
  resolveTrumpContext,
  trickCardStrength,
  trumpChoiceToMode,
  type TrumpContext,
} from '../trumpContext.js'
import type { BeloteCard, BeloteGameState, BeloteGameVariant, BeloteSuit } from '../types.js'

const PLAYERS = [
  { userId: 'u0', username: 'P0', position: 0 },
  { userId: 'u1', username: 'P1', position: 1 },
  { userId: 'u2', username: 'P2', position: 2 },
  { userId: 'u3', username: 'P3', position: 3 },
] as const

function makeTable(variant: BeloteGameVariant, targetScore = 5000, gameId?: string) {
  return new BeloteTableController({
    gameId: gameId ?? `game-${variant}-coverage`,
    roomId: 'room-1',
    targetScore,
    buyIn: 200,
    variant,
    players: [...PLAYERS],
  })
}

function turnPlayer(table: BeloteTableController) {
  const s = table.getState()
  const pos =
    s.phase === 'PLAYING' ? s.deal.currentPlayerPosition : s.biddingTurnPosition
  return s.players.find((p) => p.position === pos)!
}

function playUntilNotPlaying(table: BeloteTableController, max = 500) {
  let n = 0
  while (table.getState().phase === 'PLAYING' && n++ < max) {
    const s = table.getState()
    const p = s.players.find((x) => x.position === s.deal.currentPlayerPosition)!
    const ctx = resolveTrumpContext(s)
    if (ctx && p.hand.length > 0) {
      const legal = playableCards(p.hand, ctx, s.deal.currentTrick, p.position)
      if (legal.length > 0) {
        const r = table.applyAction(p.userId, { type: 'PLAY_CARD', card: legal[0] })
        if (r.ok) continue
      }
    }
    if (!table.applyTurnTimeout()) break
  }
}

function completeContreeRound(table: BeloteTableController): void {
  let guard = 0
  while (table.getState().phase === 'CONTREE_ROUND' && guard++ < 12) {
    const u = turnPlayer(table)
    const r = table.applyAction(u.userId, { type: 'PASS' })
    expect(r.ok).toBe(true)
  }
}

function completeAuction(table: BeloteTableController, bidderId = 'u0', trump: 'HEARTS' | 'ALL_TRUMP' | 'NO_TRUMP' = 'HEARTS') {
  let guard = 0
  while (guard++ < 100) {
    const s = table.getState()
    if (s.phase === 'PLAYING' || s.phase === 'DEAL_END' || s.phase === 'GAME_END') return
    const u = turnPlayer(table)
    if (s.phase === 'BIDDING') {
      const hasBid = s.bids.some((b) => 'value' in b && b.action === 'BID')
      if (!hasBid && u.userId === bidderId) {
        const r = table.applyAction(u.userId, { type: 'BID', value: 80, trump })
        expect(r.ok).toBe(true)
      } else {
        const r = table.applyAction(u.userId, { type: 'PASS' })
        expect(r.ok).toBe(true)
      }
      continue
    }
    if (s.phase === 'CONTREE_ROUND') {
      completeContreeRound(table)
      return
    }
    break
  }
}

describe('beloteVariants', () => {
  it('normalizes unknown variant to CONTEE', () => {
    expect(normalizeBeloteVariant('invalid')).toBe('CONTEE')
    expect(normalizeBeloteVariant('classique')).toBe('CLASSIQUE')
  })

  it('flags auction and contree per variant', () => {
    expect(usesAuctionBidding('CLASSIQUE')).toBe(false)
    expect(usesAuctionBidding('CONTEE')).toBe(true)
    expect(usesContreeRound('MODERNE')).toBe(true)
    expect(allowsSpecialTrumps('COINCHE')).toBe(true)
    expect(allowsSpecialTrumps('CONTEE')).toBe(false)
    expect(isValidTrumpChoice('ALL_TRUMP', 'COINCHE')).toBe(true)
    expect(isValidTrumpChoice('ALL_TRUMP', 'CONTEE')).toBe(false)
  })
})

describe('beloteBuyIn helpers', () => {
  it('clamps buy-in', () => {
    expect(normalizeBeloteBuyIn(undefined)).toBe(BELOTE_BUY_IN_DEFAULT)
    expect(normalizeBeloteBuyIn(BELOTE_BUY_IN_MIN - 1)).toBe(BELOTE_BUY_IN_MIN)
    expect(normalizeBeloteBuyIn(BELOTE_BUY_IN_MAX + 99)).toBe(BELOTE_BUY_IN_MAX)
  })

  it('computes pot and payout', () => {
    expect(belotePotTotal(100)).toBe(400)
    expect(beloteWinnerPayout(400, 2)).toBe(200)
    expect(beloteWinnerPayout(400, 0)).toBe(0)
  })

  it('insufficient chips error exposes usernames', () => {
    const err = new BeloteInsufficientChipsError(['a', 'b'])
    expect(err.code).toBe('INSUFFICIENT_CHIPS')
    expect(err.usernames).toEqual(['a', 'b'])
  })
})

describe('trumpContext', () => {
  const card: BeloteCard = { suit: 'HEARTS', rank: 'J' }

  it('maps trump choices to modes', () => {
    expect(trumpChoiceToMode('ALL_TRUMP')).toBe('ALL_TRUMP')
    expect(trumpChoiceToMode('NO_TRUMP')).toBe('NO_TRUMP')
    expect(trumpChoiceToMode('CLUBS')).toBe('SUIT')
  })

  it('scores ALL_TRUMP and NO_TRUMP', () => {
    const all: TrumpContext = { mode: 'ALL_TRUMP', suit: 'HEARTS' }
    const none: TrumpContext = { mode: 'NO_TRUMP', suit: 'SPADES' }
    expect(isTrumpCard(card, all)).toBe(true)
    expect(isTrumpCard(card, none)).toBe(false)
    expect(cardPoints(card, all)).toBeGreaterThan(0)
    expect(trickCardStrength(card, none, 'HEARTS')).toBeGreaterThan(-1)
    expect(trickCardStrength({ suit: 'CLUBS', rank: '7' }, none, 'HEARTS')).toBe(-1)
  })

  it('resolveTrumpContext reads deal', () => {
    const state = makeTable('CONTEE').getState()
    state.deal.trumpMode = 'SUIT'
    state.deal.trump = 'DIAMONDS'
    expect(resolveTrumpContext(state)?.suit).toBe('DIAMONDS')
  })
})

describe('classicScoring', () => {
  it('adds dix de der to last winner', () => {
    const state = makeTable('CLASSIQUE').getState()
    state.deal.dealPointsA = 30
    state.deal.dealPointsB = 40
    state.deal.contractTeam = 'A'
    const r = computeClassicDealScore(state, 'B')
    expect(r.scoreB).toBe(50)
    expect(r.scoreA).toBe(30)
    expect(r.made).toBe(true)
  })
})

describe('classiqueBidding', () => {
  it('TAKE completes deal', () => {
    const state = makeTable('CLASSIQUE').getState()
    const pos = state.biddingTurnPosition
    const r = applyClassiqueBidAction(state, pos, { type: 'TAKE' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.dealComplete).toBe(true)
  })

  it('four passes move to CHOOSE phase', () => {
    const state = makeTable('CLASSIQUE').getState()
    for (let i = 0; i < 4; i++) {
      const pos = state.biddingTurnPosition
      applyClassiqueBidAction(state, pos, { type: 'PASS' })
    }
    expect(state.phase).toBe('CLASSIQUE_CHOOSE')
  })

  it('CHOOSE_TRUMP rejects same suit as turned card', () => {
    const state = makeTable('CLASSIQUE').getState()
    const turned = state.deal.turnedCard!.suit
    for (let i = 0; i < 4; i++) {
      applyClassiqueBidAction(state, state.biddingTurnPosition, { type: 'PASS' })
    }
    const r = applyClassiqueBidAction(state, state.biddingTurnPosition, {
      type: 'CHOOSE_TRUMP',
      trump: turned,
    })
    expect(r.ok).toBe(false)
  })
})

describe('conteeBidding extended', () => {
  it('validates bid values', () => {
    expect(isValidBidValue(80)).toBe(true)
    expect(isValidBidValue(75)).toBe(false)
    expect(isValidBidValue(250)).toBe(true)
  })

  it('finishes bidding after three passes following a bid', () => {
    const state = makeTable('CONTEE').getState()
    const opener = state.biddingTurnPosition
    applyContreeBidAction(state, opener, { type: 'BID', value: 90, trump: 'SPADES' })
    for (let i = 0; i < 3; i++) {
      const pos = state.biddingTurnPosition
      applyContreeBidAction(state, pos, { type: 'PASS' })
    }
    expect(biddingFinished(state)).toBe(true)
    expect(getHighestBid(state.bids)?.value).toBe(90)
  })

  it('supports CONTREE and SURCONTREE', () => {
    const state = makeTable('CONTEE').getState()
    state.phase = 'CONTREE_ROUND'
    state.deal.contractTeam = 'A'
    state.contreePhase = 'DEFENSE'
    state.biddingTurnPosition = 1
    applyContreeBidAction(state, 1, { type: 'CONTREE' })
    expect(state.contreeLevel).toBe(1)
    state.contreePhase = 'ATTACK'
    state.biddingTurnPosition = 0
    const r = applyContreeBidAction(state, 0, { type: 'SURCONTREE' })
    expect(r.ok).toBe(true)
    expect(contractMultiplier(state.contreeLevel ?? 0)).toBe(4)
  })

  it('all pass from start triggers redeal', () => {
    const state = makeTable('CONTEE').getState()
    let redeal = false
    for (let i = 0; i < 4; i++) {
      const r = applyContreeBidAction(state, state.biddingTurnPosition, { type: 'PASS' })
      if (r.ok && r.redeal) redeal = true
    }
    expect(redeal).toBe(true)
  })
})

describe('trickPlay extended', () => {
  it('playableCards filters illegal plays', () => {
    const ctx: TrumpContext = { mode: 'SUIT', suit: 'HEARTS' }
    const hand: BeloteCard[] = [
      { suit: 'HEARTS', rank: '7' },
      { suit: 'CLUBS', rank: 'A' },
    ]
    const trick = [{ position: 0, card: { suit: 'HEARTS' as const, rank: 'K' as const } }]
    const legal = playableCards(hand, ctx, trick, 1)
    expect(legal.every((c) => c.suit === 'HEARTS')).toBe(true)
  })

  it('must trump when void in led suit and has trump', () => {
    const ctx: TrumpContext = { mode: 'SUIT', suit: 'DIAMONDS' }
    const hand: BeloteCard[] = [
      { suit: 'CLUBS', rank: '7' },
      { suit: 'DIAMONDS', rank: '9' },
    ]
    const trick = [{ position: 0, card: { suit: 'HEARTS' as const, rank: 'A' as const } }]
    expect(
      playableCards(hand, ctx, trick, 1).every((c) => c.suit === 'DIAMONDS'),
    ).toBe(true)
  })
})

describe('BeloteTableController flows', () => {
  it('CLASSIQUE: take turned card starts play with full hands', () => {
    const table = makeTable('CLASSIQUE', 5000, 'belote-classique-take-coverage')
    expect(table.getState().players[0].hand).toHaveLength(5)
    const taker = turnPlayer(table)
    expect(table.applyAction(taker.userId, { type: 'TAKE' }).ok).toBe(true)
    expect(table.getState().phase).toBe('PLAYING')
    expect(table.getState().players.every((p) => p.hand.length >= 8)).toBe(true)
  })

  it('CONTEE: all pass from start redeals and rotates dealer', () => {
    const table = makeTable('CONTEE', 5000, 'belote-contee-all-pass-redeal')
    const dealerBefore = table.getState().deal.dealerPosition
    const handsBefore = table.getState().players.map((p) => p.hand.map((c) => `${c.rank}${c.suit}`).join(','))
    for (let i = 0; i < 4; i++) {
      const u = turnPlayer(table)
      const r = table.applyAction(u.userId, { type: 'PASS' })
      expect(r.ok).toBe(true)
    }
    const after = table.getState()
    expect(after.phase).toBe('BIDDING')
    expect(after.deal.dealerPosition).toBe((dealerBefore + 1) % 4)
    expect(after.bids).toHaveLength(0)
    const handsAfter = after.players.map((p) => p.hand.map((c) => `${c.rank}${c.suit}`).join(','))
    expect(handsAfter.join('|')).not.toBe(handsBefore.join('|'))
  })

  it('CLASSIQUE: all pass twice redeals and rotates dealer', () => {
    const table = makeTable('CLASSIQUE', 5000, 'belote-classique-all-pass-redeal')
    const dealerBefore = table.getState().deal.dealerPosition
    for (let round = 0; round < 2; round++) {
      for (let i = 0; i < 4; i++) {
        const u = turnPlayer(table)
        const r = table.applyAction(u.userId, { type: 'PASS' })
        expect(r.ok).toBe(true)
      }
    }
    const after = table.getState()
    expect(after.phase).toBe('CLASSIQUE_TAKE')
    expect(after.deal.dealerPosition).toBe((dealerBefore + 1) % 4)
    expect(after.deal.turnedCard).toBeDefined()
  })

  it('CLASSIQUE: all pass then choose trump', () => {
    const table = makeTable('CLASSIQUE')
    for (let i = 0; i < 4; i++) {
      const u = turnPlayer(table)
      table.applyAction(u.userId, { type: 'PASS' })
    }
    expect(table.getState().phase).toBe('CLASSIQUE_CHOOSE')
    const u = turnPlayer(table)
    const turned = table.getState().deal.turnedCard!.suit
    const trump: BeloteSuit =
      turned === 'HEARTS' ? 'CLUBS' : 'HEARTS'
    expect(
      table.applyAction(u.userId, { type: 'CHOOSE_TRUMP', trump }).ok,
    ).toBe(true)
    expect(table.getState().phase).toBe('PLAYING')
  })

  it('CONTEE: defense contree then taker surcontree starts play', () => {
    const table = makeTable('CONTEE', 5000, 'belote-contee-surcontree-flow')
    const opener = turnPlayer(table)
    expect(table.applyAction(opener.userId, { type: 'BID', value: 80, trump: 'HEARTS' }).ok).toBe(true)
    for (let i = 0; i < 3; i++) {
      const u = turnPlayer(table)
      expect(table.applyAction(u.userId, { type: 'PASS' }).ok).toBe(true)
    }
    expect(table.getState().phase).toBe('CONTREE_ROUND')
    expect(table.getState().contreePhase).toBe('DEFENSE')

    const defender = turnPlayer(table)
    expect(table.applyAction(defender.userId, { type: 'CONTREE' }).ok).toBe(true)
    expect(table.getState().contreeLevel).toBe(1)
    expect(table.getState().contreePhase).toBe('ATTACK')

    const taker = turnPlayer(table)
    expect(taker.position).toBe(table.getState().deal.takerPosition)
    const r = table.applyAction(taker.userId, { type: 'SURCONTREE' })
    expect(r.ok).toBe(true)
    expect(table.getState().phase).toBe('PLAYING')
    expect(table.getState().contreeLevel).toBe(2)
  })

  it('CONTEE: surcontree rejected without prior contree', () => {
    const table = makeTable('CONTEE', 5000, 'belote-contee-no-surcontree')
    const opener = turnPlayer(table)
    table.applyAction(opener.userId, { type: 'BID', value: 80, trump: 'HEARTS' })
    for (let i = 0; i < 3; i++) {
      const u = turnPlayer(table)
      table.applyAction(u.userId, { type: 'PASS' })
    }
    for (let i = 0; i < 2; i++) {
      const u = turnPlayer(table)
      table.applyAction(u.userId, { type: 'PASS' })
    }
    expect(table.getState().contreePhase).toBe('ATTACK')
    expect(table.getState().contreeLevel).toBe(0)
    const taker = turnPlayer(table)
    const r = table.applyAction(taker.userId, { type: 'SURCONTREE' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('NO_CONTREE')
  })

  it('CONTEE: auction reaches playing with contract', () => {
    const table = makeTable('CONTEE', 5000, 'belote-contee-flow-coverage')
    completeAuction(table)
    expect(table.getState().phase).toBe('PLAYING')
    expect(table.getState().contractPoints).toBe(80)
    expect(table.getState().deal.trump).toBe('HEARTS')
  })

  it('CONTEE: plays full deal to DEAL_END', () => {
    const table = makeTable('CONTEE', 5000, 'belote-contee-full-deal')
    completeAuction(table)
    expect(table.getState().phase).toBe('PLAYING')
    playUntilNotPlaying(table)
    expect(['DEAL_END', 'GAME_END']).toContain(table.getState().phase)
    expect(
      table.getState().teamScoreA + table.getState().teamScoreB,
    ).toBeGreaterThan(0)
  })

  it('MODERNE: ALL_TRUMP bid and play', () => {
    const table = makeTable('MODERNE')
    completeAuction(table, 'u0', 'ALL_TRUMP')
    expect(table.getState().deal.trumpMode).toBe('ALL_TRUMP')
    playUntilNotPlaying(table)
    expect(['DEAL_END', 'GAME_END', 'PLAYING']).toContain(table.getState().phase)
  })

  it('COINCHE: NO_TRUMP bid', () => {
    const table = makeTable('COINCHE')
    completeAuction(table, 'u1', 'NO_TRUMP')
    expect(table.getState().deal.trumpMode).toBe('NO_TRUMP')
  })

  it('fromSnapshot migrates legacy phase and deals', () => {
    const base = makeTable('CONTEE').getState()
    base.phase = 'BIDDING_ROUND_1'
    const restored = BeloteTableController.fromSnapshot(base)
    expect(restored.getState().phase).toBe('BIDDING')
    restored.startNextDeal()
    expect(restored.getState().phase).toMatch(/BIDDING|CLASSIQUE/)
  })

  it('disconnect timeout replaces player with bot', () => {
    const table = makeTable('CONTEE', 5000)
    table.markDisconnected('u0')
    expect(table.processDisconnectTimeouts(Date.now() + 61_000).changed).toBe(true)
    const p = table.getState().players.find((x) => x.position === 0)!
    expect(p.isBot).toBe(true)
    expect(p.forfeited).toBe(false)
    expect(p.userId.startsWith('qb-belote-bot-')).toBe(true)
    table.markReconnected('u1')
  })

  it('applyTurnTimeout passes in bidding', () => {
    const table = makeTable('CONTEE')
    expect(table.applyTurnTimeout()).toBe(true)
  })

  it('sanitized state exposes legal plays when playing', () => {
    const table = makeTable('CONTEE')
    completeAuction(table)
    const uid = table.getState().players.find(
      (p) => p.position === table.getState().deal.currentPlayerPosition,
    )!.userId
    const view = table.getSanitizedState(uid)
    expect(view.myLegalPlays?.length).toBeGreaterThan(0)
  })

  it('spectator view hides all hands', () => {
    const table = makeTable('CONTEE')
    const view = table.getSanitizedState('u0', true)
    expect(view.players.every((p) => !('hand' in p && p.hand))).toBe(true)
  })

  it('rejects illegal card', () => {
    const table = makeTable('CONTEE')
    completeAuction(table)
    const s = table.getState()
    const p = s.players.find((x) => x.position === s.deal.currentPlayerPosition)!
    const bad = { suit: 'CLUBS' as BeloteSuit, rank: '7' as const }
    if (!p.hand.some((c) => c.suit === bad.suit && c.rank === bad.rank)) {
      const r = table.applyAction(p.userId, { type: 'PLAY_CARD', card: bad })
      expect(r.ok).toBe(false)
    }
  })

  it('startNextDeal after DEAL_END', () => {
    const table = makeTable('CONTEE', 5000, 'belote-next-deal-coverage')
    completeAuction(table)
    playUntilNotPlaying(table)
    expect(table.getState().phase).toBe('DEAL_END')
    table.startNextDeal()
    expect(table.getState().phase).toBe('BIDDING')
  })

  it('forceEnd and winningTeam', () => {
    const table = makeTable('CONTEE')
    table.forceEnd('A')
    expect(table.getState().phase).toBe('GAME_END')
    expect(table.winningTeam()).toBeTruthy()
  })
})

describe('trick winner with ALL_TRUMP', () => {
  it('higher trump rank wins', () => {
    const ctx: TrumpContext = { mode: 'ALL_TRUMP', suit: 'SPADES' }
    const trick = [
      { position: 0, card: { suit: 'HEARTS' as const, rank: '7' as const } },
      { position: 1, card: { suit: 'CLUBS' as const, rank: 'J' as const } },
    ]
    expect(trickWinnerPosition(trick, ctx)).toBe(1)
  })
})
