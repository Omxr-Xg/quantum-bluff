import { decideBotActionWithExpertAi } from '../services/botAi.service.js'
import { env } from '../config/env.js'
import type { Card } from '../types/poker.js'

const c = (rank: Card['rank'], suit: Card['suit'] = 'HEARTS', value?: number): Card => ({
  rank,
  suit,
  value: value ?? ({ '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14 }[rank] as number),
})

const baseReq = {
  playerCards: [c('A'), c('A', 'SPADES')],
  communityCards: [c('2'), c('7'), c('K')],
  difficulty: 'expert' as const,
  currentBet: 100,
  playerChips: 1000,
  callAmount: 100,
  minRaise: 100,
  potSize: 450,
  position: 1,
  playersCount: 2,
}

describe('botAi.service — expert Python integration', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    Object.assign(env as Record<string, unknown>, {
      aiServiceEnabled: true,
      aiServiceUrl: 'http://ai-service.test',
      aiServiceTimeoutMs: 25,
    })
  })

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  test('oracle trous : n’appelle pas Python même si le service est activé', async () => {
    const fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch

    const decision = await decideBotActionWithExpertAi(baseReq, {
      opponentHoleCards: [[c('2'), c('3')]],
      opponentStack: 800,
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(decision.reasoning ?? '').toContain('expert-oracle')
  })

  test('converts AI ALL_IN into an engine-compatible raise', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        action: 'ALL_IN',
        amount: 1000,
        confidence: 0.91,
        reason: 'premium value shove',
      }),
    }) as unknown as typeof fetch

    const decision = await decideBotActionWithExpertAi(baseReq, {
      gameId: 'game-1',
      botId: 'qb-bot-1',
      street: 'FLOP',
      opponentStack: 900,
    })

    expect(decision.action).toBe('RAISE')
    expect(decision.amount).toBe(1000)
    expect(decision.reasoning).toContain('python-expert')
  })

  test('falls back to heuristic expert when AI payload is invalid', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ action: 'NOPE' }),
    }) as unknown as typeof fetch

    const decision = await decideBotActionWithExpertAi(baseReq)

    expect(['FOLD', 'CALL', 'CHECK', 'RAISE']).toContain(decision.action)
    expect(decision.reasoning).toBe('fallback heuristic expert: AI unavailable or invalid')
  })

  test('falls back to heuristic expert on timeout or network failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('aborted')) as unknown as typeof fetch

    const decision = await decideBotActionWithExpertAi(baseReq)

    expect(['FOLD', 'CALL', 'CHECK', 'RAISE']).toContain(decision.action)
    expect(decision.reasoning).toBe('fallback heuristic expert: AI unavailable or invalid')
  })
})
