import {
  consumeChatMessageBudget,
  consumeSocketEventBudget,
  resetSocketRateLimitForTests,
} from '../socketRateLimit.js'

describe('socketRateLimit', () => {
  beforeEach(() => {
    resetSocketRateLimitForTests()
  })

  it('autorise jusqu à 20 événements par fenêtre de 10 s', () => {
    const uid = 'user-a'
    for (let i = 0; i < 20; i++) {
      expect(consumeSocketEventBudget(uid)).toBe(true)
    }
    expect(consumeSocketEventBudget(uid)).toBe(false)
  })

  it('throttle le chat à 1 message toutes les 2 s', () => {
    const uid = 'user-b'
    expect(consumeChatMessageBudget(uid)).toBe(true)
    expect(consumeChatMessageBudget(uid)).toBe(false)
  })
})
