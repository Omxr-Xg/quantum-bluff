import {
  __resetIdempotencyMemoryStoreForTests,
  buildIdempotencyKey,
  fingerprintStableJson,
  getIdempotentResult,
  saveIdempotentResult,
  tryBeginIdempotentAction,
} from '../casino/services/idempotency.service.js'

jest.mock('../config/redis.config.js', () => ({
  __esModule: true,
  default: { set: jest.fn(), get: jest.fn(), del: jest.fn() },
  isRedisHealthy: jest.fn().mockResolvedValue(false),
}))

describe('casino idempotency', () => {
  beforeEach(() => {
    __resetIdempotencyMemoryStoreForTests()
  })

  it('rejects duplicate action key and replays stored result', async () => {
    const key = buildIdempotencyKey({
      userId: 'u1',
      gameType: 'roulette',
      actionId: 'a1',
    })
    const first = await tryBeginIdempotentAction(key)
    expect(first.accepted).toBe(true)
    await saveIdempotentResult(key, { ok: true, value: 42 })
    const duplicate = await tryBeginIdempotentAction(key)
    expect(duplicate.accepted).toBe(false)
    if (duplicate.accepted) throw new Error('expected duplicate')
    expect(duplicate.reason).toBe('DUPLICATE_ACTION')
    if (duplicate.reason !== 'DUPLICATE_ACTION') throw new Error('expected DUPLICATE_ACTION')
    expect(duplicate.storedResult).toMatchObject({ ok: true, value: 42 })
    await expect(getIdempotentResult(key)).resolves.toMatchObject({ ok: true, value: 42 })
  })

  it('rejects same actionId with different payload fingerprint', async () => {
    const key = buildIdempotencyKey({
      userId: 'u1',
      gameType: 'roulette',
      actionId: 'shared',
    })
    const fp1 = fingerprintStableJson([{ type: 'red', amount: 10 }])
    const fp2 = fingerprintStableJson([{ type: 'black', amount: 10 }])
    expect(fp1).not.toBe(fp2)

    const first = await tryBeginIdempotentAction(key, { payloadFingerprint: fp1 })
    expect(first.accepted).toBe(true)
    await saveIdempotentResult(key, { result: 7 })

    const dupSame = await tryBeginIdempotentAction(key, { payloadFingerprint: fp1 })
    expect(dupSame.accepted).toBe(false)
    if (dupSame.accepted) throw new Error('expected duplicate')
    expect(dupSame.reason).toBe('DUPLICATE_ACTION')
    if (dupSame.reason !== 'DUPLICATE_ACTION') throw new Error('expected DUPLICATE_ACTION')
    expect(dupSame.storedResult).toMatchObject({ result: 7 })

    const dupOtherBet = await tryBeginIdempotentAction(key, { payloadFingerprint: fp2 })
    expect(dupOtherBet.accepted).toBe(false)
    if (dupOtherBet.accepted) throw new Error('expected mismatch')
    expect(dupOtherBet.reason).toBe('PAYLOAD_MISMATCH')
  })

  it('stable fingerprint ignores object key order', () => {
    const a = fingerprintStableJson([{ type: 'straight', amount: 10, n: 1 }])
    const b = fingerprintStableJson([{ n: 1, type: 'straight', amount: 10 }])
    expect(a).toBe(b)
  })
})
