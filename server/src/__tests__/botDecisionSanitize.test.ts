import { sanitizeBotDecision } from '../logic/botDecisionSanitize.js'
import type { BotActionRequest } from '../logic/botAI.js'

const baseReq = (): BotActionRequest => ({
  playerCards: [],
  communityCards: [],
  difficulty: 'medium',
  currentBet: 100,
  playerChips: 40,
  callAmount: 80,
  minRaise: 20,
  potSize: 200,
  position: 0,
  playersCount: 2,
})

describe('sanitizeBotDecision — short stack', () => {
  test('CALL impossible à couvrir → all-in partiel (jetons restants)', () => {
    const req = baseReq()
    const d = sanitizeBotDecision({ action: 'CALL', amount: 80, reasoning: 'ai' }, req)
    expect(d.action).toBe('CALL')
    expect(d.amount).toBe(40)
  })

  test('CHECK invalide avec mise → all-in partiel', () => {
    const req = baseReq()
    const d = sanitizeBotDecision({ action: 'CHECK', reasoning: 'ai' }, req)
    expect(d.action).toBe('CALL')
    expect(d.amount).toBe(40)
  })

  test('RAISE alors que call > jetons → all-in call', () => {
    const req = baseReq()
    const d = sanitizeBotDecision({ action: 'RAISE', amount: 500, reasoning: 'ai' }, req)
    expect(d.action).toBe('CALL')
    expect(d.amount).toBe(40)
  })
})
