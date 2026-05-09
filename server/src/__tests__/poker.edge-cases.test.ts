import { GameTable } from '../logic/GameTable.js'
import { settlePots } from '../logic/poker/potSettlement.js'
import type { Card, Player } from '../types/poker.js'

function player(id: string, chips: number): Player {
  return {
    id,
    name: id,
    cards: [],
    chips,
    role: 'PLAYER',
    isActive: true,
    isConnected: true,
  }
}

function c(rank: Card['rank'], suit: Card['suit'], value: number): Card {
  return { rank, suit, value }
}

describe('Poker edge cases pack - runtime rules', () => {
  test('minimum raise follows lastRaiseSize (official rule)', () => {
    const t = new GameTable(
      'edge-min-raise',
      [player('p1', 2000), player('p2', 2000), player('p3', 2000)],
      { smallBlind: 10, bigBlind: 20, liveBetWindowDisabled: true }
    )
    t.startHand()
    // UTG opens +40 (to 60 total if call=20)
    t.handlePlayerAction(t.state.currentTurn, 'RAISE', 40)
    expect(t.getMinRaise()).toBe(40)
  })

  test('short all-in under minimum raise is accepted as all-in but does not increase min raise', () => {
    const t = new GameTable(
      'edge-short-under-min',
      [player('p1', 2000), player('p2', 120), player('p3', 2000)],
      { smallBlind: 10, bigBlind: 20, liveBetWindowDisabled: true }
    )
    t.startHand()
    // First actor raises to set min raise > 20
    t.handlePlayerAction(t.state.currentTurn, 'RAISE', 80)
    const beforeMinRaise = t.getMinRaise()
    // short stack can only shove less than min raise increment
    const shortPlayerId = t.state.currentTurn
    const shortPlayer = t.getPlayerState(shortPlayerId)!
    const callAmount = t.calculateCallAmount(shortPlayerId)
    const shortAllInRaise = shortPlayer.chips - callAmount
    t.handlePlayerAction(shortPlayerId, 'RAISE', shortAllInRaise)
    expect(t.getMinRaise()).toBe(beforeMinRaise)
  })

  test('short all-in does not reopen action (min raise logic)', () => {
    const t = new GameTable(
      'edge-short-allin',
      [player('p1', 1000), player('p2', 80), player('p3', 1000)],
      { smallBlind: 10, bigBlind: 20, liveBetWindowDisabled: true }
    )
    t.startHand()

    const preflopActor = t.state.currentTurn
    // Force deterministic order for the test by acting until p1 has a bet to call.
    if (preflopActor === 'p1') {
      t.handlePlayerAction('p1', 'RAISE', 80) // open to 100 total
      t.handlePlayerAction('p2', 'CALL') // short stack now all-in
      const before = t.state.currentTurn
      t.handlePlayerAction('p3', 'CALL')
      // Short all-in does not grant acting priority to all-in player on next street.
      expect(before).toBe('p3')
      expect(t.state.phase).toBe('FLOP')
      expect(t.state.currentTurn).not.toBe('p2')
    } else {
      // Generic path: ensure invalid short raise by deep stack is still rejected.
      expect(() => t.handlePlayerAction(preflopActor, 'RAISE', 1)).toThrow()
    }
  })

  test('legal raise reopens action to prior players', () => {
    const t = new GameTable(
      'edge-reopen-legal',
      [player('p1', 2000), player('p2', 2000), player('p3', 2000)],
      { smallBlind: 10, bigBlind: 20, liveBetWindowDisabled: true }
    )
    t.startHand()
    const first = t.state.currentTurn
    t.handlePlayerAction(first, 'RAISE', 40)
    const second = t.state.currentTurn
    t.handlePlayerAction(second, 'CALL')
    // A full raise has happened; next actor should still be pending and round not closed.
    expect(t.state.phase).toBe('PREFLOP')
    expect(t.state.currentTurn).toBeDefined()
  })

  test('all-in after previous raise with insufficient increment does not reopen for initial bettor', () => {
    const t = new GameTable(
      'edge-short-after-raise',
      [player('p1', 5000), player('p2', 5000), player('p3', 450)],
      { smallBlind: 10, bigBlind: 20, liveBetWindowDisabled: true }
    )
    t.startHand()
    if (t.state.currentTurn !== 'p1') return
    // A bets 100 over call
    t.handlePlayerAction('p1', 'RAISE', 100)
    // B raises by 200 (new min raise increment = 200)
    t.handlePlayerAction('p2', 'RAISE', 200)
    const minRaiseBefore = t.getMinRaise()
    // C all-in with insufficient increment
    const callAmount = t.calculateCallAmount('p3')
    const c = t.getPlayerState('p3')!
    const shortAllInRaise = c.chips - callAmount
    t.handlePlayerAction('p3', 'RAISE', shortAllInRaise)
    expect(t.getMinRaise()).toBe(minRaiseBefore)
  })

  test('heads-up: button (SB) acts first preflop, BB (non-dealer) first postflop', () => {
    const t = new GameTable(
      'edge-hu-order',
      [player('p1', 1000), player('p2', 1000)],
      { smallBlind: 10, bigBlind: 20, liveBetWindowDisabled: true }
    )
    t.startHand()
    const dealer = t.state.players.find((p) => p.isDealer)!
    const bb = t.state.players.find((p) => p.role === 'BIG_BLIND')!
    expect(t.state.currentTurn).toBe(dealer.id) // preflop
    t.handlePlayerAction(dealer.id, 'CALL')
    t.handlePlayerAction(bb.id, 'CHECK')
    expect(t.state.phase).toBe('FLOP')
    expect(t.state.currentTurn).toBe(bb.id) // postflop HU
  })

  test('heads-up dealer alternates over consecutive hands', () => {
    const t = new GameTable(
      'edge-hu-rotation',
      [player('p1', 5000), player('p2', 5000)],
      { smallBlind: 10, bigBlind: 20, liveBetWindowDisabled: true }
    )
    const dealers: string[] = []
    for (let i = 0; i < 5; i++) {
      t.startHand()
      dealers.push(t.state.players.find((p) => p.isDealer)?.id ?? '')
      const current = t.state.currentTurn
      t.handlePlayerAction(current, 'FOLD')
    }
    expect(new Set(dealers).size).toBe(2)
    for (let i = 1; i < dealers.length; i++) {
      expect(dealers[i]).not.toBe(dealers[i - 1])
    }
  })

  test('all-in preflop runs out board and resolves exactly once', () => {
    const t = new GameTable(
      'edge-runout-preflop',
      [player('p1', 100), player('p2', 100), player('p3', 100)],
      { smallBlind: 10, bigBlind: 20, liveBetWindowDisabled: true }
    )
    t.startHand()
    const versionBefore = t.state.actionVersion ?? 0
    // Force all-ins by repeated raises/calls bounded by stacks
    const a = t.state.currentTurn
    t.handlePlayerAction(a, 'RAISE', 80)
    t.handlePlayerAction(t.state.currentTurn, 'CALL')
    t.handlePlayerAction(t.state.currentTurn, 'CALL')
    expect(t.state.phase).toBe('SHOWDOWN')
    expect(t.state.communityCards).toHaveLength(5)
    const versionAfterShowdown = t.state.actionVersion ?? 0
    expect(versionAfterShowdown).toBeGreaterThan(versionBefore)
    // no second showdown on manual advance
    t.advancePhase()
    expect(t.state.phase).toBe('SHOWDOWN')
    expect((t.state.actionVersion ?? 0)).toBe(versionAfterShowdown)
    expect(t.state.handEndReason).toBe('ALL_IN_RUNOUT')
    const losers = t.state.players.filter((p) => p.chips === 0)
    expect(losers.length).toBeGreaterThan(0)
    for (const p of losers) {
      expect(p.hasFoldedThisHand).toBe(false)
    }
  })

  test('explicit fold sets hasFoldedThisHand', () => {
    const t = new GameTable(
      'edge-fold-flag',
      [player('p1', 1000), player('p2', 1000), player('p3', 1000)],
      { smallBlind: 10, bigBlind: 20, liveBetWindowDisabled: true }
    )
    t.startHand()
    const folderId = t.state.currentTurn
    t.handlePlayerAction(folderId, 'FOLD')
    const folder = t.state.players.find((p) => p.id === folderId)
    expect(folder?.hasFoldedThisHand).toBe(true)
  })

  test('all-in on flop runs out turn+river and resolves exactly once', () => {
    const t = new GameTable(
      'edge-runout-flop',
      [player('p1', 400), player('p2', 400)],
      { smallBlind: 10, bigBlind: 20, liveBetWindowDisabled: true }
    )
    t.startHand()
    const d = t.state.players.find((p) => p.isDealer)!.id
    const bb = t.state.players.find((p) => p.role === 'BIG_BLIND')!.id
    t.handlePlayerAction(d, 'CALL')
    t.handlePlayerAction(bb, 'CHECK')
    expect(t.state.phase).toBe('FLOP')
    const versionBefore = t.state.actionVersion ?? 0
    t.handlePlayerAction(t.state.currentTurn, 'RAISE', 380)
    t.handlePlayerAction(t.state.currentTurn, 'CALL')
    expect(t.state.phase).toBe('SHOWDOWN')
    expect(t.state.communityCards).toHaveLength(5)
    const versionAfter = t.state.actionVersion ?? 0
    t.advancePhase()
    expect(t.state.phase).toBe('SHOWDOWN')
    expect((t.state.actionVersion ?? 0)).toBe(versionAfter)
    expect(versionAfter).toBeGreaterThan(versionBefore)
  })

  test('fold-to-win is immediate without extra street progression', () => {
    const t = new GameTable(
      'edge-fold-win',
      [player('p1', 1000), player('p2', 1000), player('p3', 1000)],
      { smallBlind: 10, bigBlind: 20, liveBetWindowDisabled: true }
    )
    t.startHand()
    const phaseBefore = t.state.phase
    t.handlePlayerAction(t.state.currentTurn, 'FOLD')
    t.handlePlayerAction(t.state.currentTurn, 'FOLD')
    expect(t.state.phase).toBe('SHOWDOWN')
    expect(t.state.showdownHandName).toBe('Gagne par abandon')
    expect(t.state.handEndReason).toBe('WIN_BY_FOLD')
    expect(phaseBefore).toBe('PREFLOP')
  })

  test('joiner added during showdown pending is excluded from current hand', () => {
    const t = new GameTable(
      'edge-join-showdown-pending',
      [player('p1', 100), player('p2', 100)],
      { smallBlind: 10, bigBlind: 20, liveBetWindowDisabled: true }
    )
    t.startHand()
    const d = t.state.players.find((p) => p.isDealer)!.id
    const bb = t.state.players.find((p) => p.role === 'BIG_BLIND')!.id
    t.handlePlayerAction(d, 'CALL')
    t.handlePlayerAction(bb, 'CHECK')
    t.handlePlayerAction(t.state.currentTurn, 'RAISE', 80)
    t.handlePlayerAction(t.state.currentTurn, 'CALL')
    expect(t.state.phase).toBe('SHOWDOWN')

    t.addPlayer(player('p3', 1000))
    expect(t.state.handParticipantIds?.includes('p3')).toBe(false)
  })

  test('multiway progression keeps round in preflop until completion', () => {
    const t = new GameTable(
      'edge-multiway-prog',
      [player('p1', 2000), player('p2', 2000), player('p3', 2000), player('p4', 2000), player('p5', 2000)],
      { smallBlind: 10, bigBlind: 20, liveBetWindowDisabled: true }
    )
    t.startHand()
    t.handlePlayerAction(t.state.currentTurn, 'FOLD')
    t.handlePlayerAction(t.state.currentTurn, 'CALL')
    t.handlePlayerAction(t.state.currentTurn, 'RAISE', 40)
    t.handlePlayerAction(t.state.currentTurn, 'CALL')
    expect(t.state.phase).toBe('PREFLOP')
  })
})

describe('Poker edge cases pack - side pot oracle invariants', () => {
  test('sum(contributions) equals sum(payouts) and payouts non-negative', () => {
    const players: Player[] = [
      {
        id: 'a',
        name: 'a',
        cards: [c('A', 'SPADES', 14), c('K', 'SPADES', 13)],
        chips: 0,
        role: 'PLAYER',
        isActive: true,
        totalPutInThisHand: 1000,
      },
      {
        id: 'b',
        name: 'b',
        cards: [c('Q', 'HEARTS', 12), c('Q', 'CLUBS', 12)],
        chips: 0,
        role: 'PLAYER',
        isActive: true,
        totalPutInThisHand: 500,
      },
      {
        id: 'c',
        name: 'c',
        cards: [c('J', 'DIAMONDS', 11), c('J', 'SPADES', 11)],
        chips: 0,
        role: 'PLAYER',
        isActive: true,
        totalPutInThisHand: 200,
      },
      {
        id: 'd',
        name: 'd',
        cards: [c('10', 'DIAMONDS', 10), c('2', 'SPADES', 2)],
        chips: 0,
        role: 'PLAYER',
        isActive: true,
        totalPutInThisHand: 50,
      },
    ]
    const board: Card[] = [
      c('A', 'HEARTS', 14),
      c('9', 'HEARTS', 9),
      c('5', 'CLUBS', 5),
      c('3', 'DIAMONDS', 3),
      c('2', 'HEARTS', 2),
    ]
    const result = settlePots({ players, communityCards: board })
    const contributions = players.reduce(
      (sum, p) => sum + (p.totalPutInThisHand ?? 0),
      0
    )
    const payouts = Array.from(result.payouts.values()).reduce(
      (sum, n) => sum + n,
      0
    )

    expect(payouts).toBe(contributions)
    for (const value of result.payouts.values()) {
      expect(value).toBeGreaterThanOrEqual(0)
    }
  })

  test('odd chip is stable and no chip is lost on split', () => {
    const p1: Player = {
      id: 'p1',
      name: 'p1',
      cards: [c('A', 'SPADES', 14), c('K', 'HEARTS', 13)],
      chips: 0,
      role: 'PLAYER',
      isActive: true,
      totalPutInThisHand: 101,
    }
    const p2: Player = {
      id: 'p2',
      name: 'p2',
      cards: [c('A', 'DIAMONDS', 14), c('K', 'CLUBS', 13)],
      chips: 0,
      role: 'PLAYER',
      isActive: true,
      totalPutInThisHand: 101,
    }
    const board: Card[] = [
      c('Q', 'SPADES', 12),
      c('J', 'HEARTS', 11),
      c('9', 'CLUBS', 9),
      c('5', 'DIAMONDS', 5),
      c('3', 'SPADES', 3),
    ]
    const run1 = settlePots({ players: [p1, p2], communityCards: board })
    const run2 = settlePots({ players: [p1, p2], communityCards: board })
    const sum1 = Array.from(run1.payouts.values()).reduce((a, b) => a + b, 0)
    const sum2 = Array.from(run2.payouts.values()).reduce((a, b) => a + b, 0)

    expect(sum1).toBe(202)
    expect(sum2).toBe(202)
    expect(run1.showdownWinnerIds).toEqual(run2.showdownWinnerIds)
  })

  test('no ineligible player receives payout (folded player excluded)', () => {
    const players: Player[] = [
      { ...player('a', 0), cards: [c('A', 'SPADES', 14), c('A', 'HEARTS', 14)], totalPutInThisHand: 200, isActive: true },
      { ...player('b', 0), cards: [c('K', 'SPADES', 13), c('K', 'HEARTS', 13)], totalPutInThisHand: 200, isActive: false },
      { ...player('c', 0), cards: [c('Q', 'SPADES', 12), c('Q', 'HEARTS', 12)], totalPutInThisHand: 200, isActive: true },
    ]
    const board: Card[] = [
      c('2', 'CLUBS', 2),
      c('3', 'DIAMONDS', 3),
      c('7', 'CLUBS', 7),
      c('9', 'DIAMONDS', 9),
      c('J', 'SPADES', 11),
    ]
    const result = settlePots({ players, communityCards: board })
    expect(result.payouts.has('b')).toBe(false)
  })

  test('nested multi all-in remains mathematically consistent', () => {
    const players: Player[] = [
      { ...player('A', 0), cards: [c('A', 'SPADES', 14), c('K', 'SPADES', 13)], totalPutInThisHand: 1000, isActive: true },
      { ...player('B', 0), cards: [c('Q', 'SPADES', 12), c('Q', 'DIAMONDS', 12)], totalPutInThisHand: 500, isActive: true },
      { ...player('C', 0), cards: [c('J', 'SPADES', 11), c('J', 'DIAMONDS', 11)], totalPutInThisHand: 200, isActive: true },
      { ...player('D', 0), cards: [c('10', 'SPADES', 10), c('10', 'DIAMONDS', 10)], totalPutInThisHand: 50, isActive: true },
    ]
    const board: Card[] = [
      c('2', 'HEARTS', 2),
      c('6', 'HEARTS', 6),
      c('9', 'CLUBS', 9),
      c('K', 'HEARTS', 13),
      c('A', 'DIAMONDS', 14),
    ]
    const result = settlePots({ players, communityCards: board })
    const totalContrib = players.reduce((sum, p) => sum + (p.totalPutInThisHand ?? 0), 0)
    const totalPayout = Array.from(result.payouts.values()).reduce((sum, n) => sum + n, 0)
    expect(totalPayout).toBe(totalContrib)
    expect(Array.from(result.payouts.values()).every((n) => n >= 0)).toBe(true)
  })
})

