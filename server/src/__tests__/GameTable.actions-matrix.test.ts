/**
 * GameTable — actions répétées : fold, call, erreurs attendues.
 */
import { GameTable } from '../logic/GameTable.js'
import type { Player } from '../types/poker.js'

function p(id: string, chips: number): Player {
  return { id, name: id, cards: [], chips, role: 'PLAYER', isActive: true }
}

describe('GameTable — fold immédiat (HU)', () => {
  test.each(
    Array.from({ length: 15 }, (_, i) => [10 + i * 5, 20 + i * 10] as const)
  )('SB=%i BB=%i : fold P1 → P2 gagne le pot', (sb, bb) => {
    const t = new GameTable(`f-${sb}`, [p('p1', 5000), p('p2', 5000)], { smallBlind: sb, bigBlind: bb })
    t.startHand()
    t.handlePlayerAction('p1', 'FOLD')
    expect(['SHOWDOWN', 'ENDED_OPPONENT_LEFT', 'ENDED']).toContain(t.state.phase)
    const p2 = t.getPlayerState('p2')
    expect(p2!.chips).toBeGreaterThan(5000 - bb)
  })
})

describe('GameTable — call amount préflop (HU)', () => {
  test.each([
    [5, 10],
    [10, 20],
    [50, 100],
  ] as const)('SB=%i BB=%i', (sb, bb) => {
    const t = new GameTable('c', [p('p1', 5000), p('p2', 5000)], { smallBlind: sb, bigBlind: bb })
    t.startHand()
    expect(t.calculateCallAmount('p1')).toBe(bb - sb)
  })
})

describe('GameTable — erreurs', () => {
  test.each([
    ['p2', 'p1'],
    ['p1', 'p2'],
  ] as const)('mauvais joueur %s quand tour %s', (_wrong, _right) => {
    const t = new GameTable('e', [p('p1', 1000), p('p2', 1000)])
    t.startHand()
    const turn = t.state.currentTurn
    const wrong = turn === 'p1' ? 'p2' : 'p1'
    expect(() => t.handlePlayerAction(wrong, 'CHECK')).toThrow()
  })

  test('CHECK impossible avec mise à suivre', () => {
    const t = new GameTable('e2', [p('p1', 1000), p('p2', 1000)])
    t.startHand()
    expect(() => t.handlePlayerAction(t.state.currentTurn, 'CHECK')).toThrow()
  })
})
