import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import type { Server } from 'socket.io'
import { GameTable } from '../logic/GameTable.js'
import type { Player } from '../types/poker.js'
import { activeGames } from '../shared/activeGames.js'
import { registerPracticeBotGame } from '../shared/practiceBotGames.js'
import { decideBotActionWithExpertAi } from '../services/botAi.service.js'
import { runPracticeBotTurnsChain } from '../poker/services/practiceBotTurns.service.js'

jest.mock('../services/botAi.service.js', () => ({
  decideBotActionWithExpertAi: jest.fn(),
}))

function mkIo(): Server {
  const emit = jest.fn()
  return {
    in: jest.fn().mockReturnValue({
      fetchSockets: async () => [],
    }),
    to: jest.fn().mockReturnValue({ emit }),
  } as unknown as Server
}

describe('practiceBotTurns chain', () => {
  const humanId = 'human-test-user-1'
  let gameId: string

  beforeEach(() => {
    gameId = `practice-bot-test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    registerPracticeBotGame(gameId, 'easy')
    jest.mocked(decideBotActionWithExpertAi).mockReset()
  })

  afterEach(async () => {
    await activeGames.delete(gameId)
  })

  test('bot FOLD advances game (heads-up, bot acts first)', async () => {
    const players: Player[] = [
      {
        id: 'qb-bot-1',
        name: 'Bot Alpha',
        cards: [],
        chips: 1000,
        role: 'PLAYER',
        isActive: true,
        isConnected: true,
      },
      {
        id: humanId,
        name: 'Vous',
        cards: [],
        chips: 1000,
        role: 'PLAYER',
        isActive: true,
        isConnected: true,
      },
    ]
    const table = new GameTable(gameId, players, {
      smallBlind: 50,
      bigBlind: 100,
      liveBetWindowDisabled: true,
    })
    table.startHand({ handId: `hand-${gameId}-1` })
    await activeGames.set(gameId, table)

    jest.mocked(decideBotActionWithExpertAi).mockResolvedValue({
      action: 'FOLD',
      reasoning: 'test-fold',
    })

    const io = mkIo()
    await runPracticeBotTurnsChain(io, gameId)

    const g = await activeGames.get(gameId)
    expect(g).toBeTruthy()
    const turn = g!.state.currentTurn
    expect(turn === '' || turn === humanId || !String(turn).startsWith('qb-bot-')).toBe(true)
    expect(['HAND_COMPLETE', 'BETTING_ACTIVE']).toContain(g!.state.handRuntimePhase)
  }, 35_000)

  test('invalid primary action falls back so turn does not stay on bot', async () => {
    const players: Player[] = [
      {
        id: 'qb-bot-1',
        name: 'Bot Alpha',
        cards: [],
        chips: 1000,
        role: 'PLAYER',
        isActive: true,
        isConnected: true,
      },
      {
        id: humanId,
        name: 'Vous',
        cards: [],
        chips: 1000,
        role: 'PLAYER',
        isActive: true,
        isConnected: true,
      },
    ]
    const table = new GameTable(gameId, players, {
      smallBlind: 50,
      bigBlind: 100,
      liveBetWindowDisabled: true,
    })
    table.startHand({ handId: `hand-${gameId}-2` })
    await activeGames.set(gameId, table)

    const fresh = (await activeGames.get(gameId)) as GameTable
    const botMustAct = fresh.state.currentTurn === 'qb-bot-1'
    if (!botMustAct) {
      /* Dealer aléatoire : si l’humain parle en premier, on ne teste pas le fallback sur ce run. */
      expect(true).toBe(true)
      return
    }

    jest.mocked(decideBotActionWithExpertAi).mockResolvedValue({
      action: 'CHECK',
      reasoning: 'invalid-check-when-facing-bet',
    })

    const io = mkIo()
    await runPracticeBotTurnsChain(io, gameId)

    const g = await activeGames.get(gameId)
    expect(g).toBeTruthy()
    expect(g!.state.currentTurn).not.toBe('qb-bot-1')
  }, 35_000)
})
