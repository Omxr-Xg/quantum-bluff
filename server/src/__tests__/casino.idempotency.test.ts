import {
  buildIdempotencyKey,
  getIdempotentResult,
  saveIdempotentResult,
  tryBeginIdempotentAction,
} from '../casino/services/idempotency.service.js'

describe('casino idempotency', () => {
  it('rejects duplicate action key and replays stored result', () => {
    const key = buildIdempotencyKey({
      userId: 'u1',
      gameType: 'roulette',
      actionId: 'a1',
    })
    const first = tryBeginIdempotentAction(key)
    expect(first.accepted).toBe(true)
    saveIdempotentResult(key, { ok: true, value: 42 })
    const duplicate = tryBeginIdempotentAction(key)
    expect(duplicate.accepted).toBe(false)
    expect(getIdempotentResult(key)).toMatchObject({ ok: true, value: 42 })
  })
})

