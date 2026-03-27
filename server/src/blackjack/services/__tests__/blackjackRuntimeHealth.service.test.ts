import {
  assessBlackjackRuntimeReadiness,
  runtimeReadinessToHttp,
  BLACKJACK_RUNTIME_STALE_MS,
} from '../blackjackRuntimeHealth.service.js'

describe('blackjackRuntimeHealth.service', () => {
  const baseRoom = {
    id: 'room-1',
    status: 'PLAYING' as const,
    gameId: 'game-1',
  }

  const freshRuntime = {
    tableId: 'game-1',
    roomId: 'room-1',
    status: 'PLAYING' as const,
    runtime: {},
    version: 3,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:05:00.000Z',
  }

  it('returns READY for healthy runtime', () => {
    const result = assessBlackjackRuntimeReadiness({
      requestedGameId: 'game-1',
      room: baseRoom,
      runtimeState: freshRuntime,
      snapshot: { exists: false },
      nowMs: Date.parse('2026-01-01T00:06:00.000Z'),
    })
    expect(result.status).toBe('READY')
    expect(result.canServeState).toBe(true)
    expect(result.canAcceptActions).toBe(true)
  })

  it('returns TABLE_RECOVERING when snapshot exists but runtime missing', () => {
    const result = assessBlackjackRuntimeReadiness({
      requestedGameId: 'game-1',
      room: baseRoom,
      runtimeState: null,
      snapshot: { exists: true, updatedAt: new Date('2026-01-01T00:04:00.000Z') },
    })
    expect(result.status).toBe('TABLE_RECOVERING')
    expect(result.canServeState).toBe(false)
    expect(result.canAcceptActions).toBe(false)
  })

  it('returns TABLE_STATE_STALE when runtime is too old', () => {
    const staleMs = Date.parse(freshRuntime.updatedAt) + BLACKJACK_RUNTIME_STALE_MS + 1000
    const result = assessBlackjackRuntimeReadiness({
      requestedGameId: 'game-1',
      room: baseRoom,
      runtimeState: freshRuntime,
      snapshot: { exists: false },
      nowMs: staleMs,
    })
    expect(result.status).toBe('TABLE_STATE_STALE')
    expect(result.canServeState).toBe(false)
    expect(result.canAcceptActions).toBe(false)
  })

  it('returns TABLE_UNAVAILABLE when no room/runtime exists', () => {
    const result = assessBlackjackRuntimeReadiness({
      requestedGameId: 'game-1',
      room: null,
      runtimeState: null,
      snapshot: { exists: false },
    })
    expect(result.status).toBe('TABLE_UNAVAILABLE')
  })

  it('returns TABLE_DB_RUNTIME_MISMATCH when room gameId diverges', () => {
    const result = assessBlackjackRuntimeReadiness({
      requestedGameId: 'game-1',
      room: { ...baseRoom, gameId: 'game-xyz' },
      runtimeState: freshRuntime,
      snapshot: { exists: false },
    })
    expect(result.status).toBe('TABLE_DB_RUNTIME_MISMATCH')
  })

  it('maps TABLE_RECOVERING to stable http response', () => {
    const mapped = runtimeReadinessToHttp({
      status: 'TABLE_RECOVERING',
      canServeState: false,
      canAcceptActions: false,
    })
    expect(mapped.status).toBe(409)
    expect(mapped.body.code).toBe('TABLE_RECOVERING')
    expect(mapped.body.error).toBe('TABLE_RECOVERING')
  })

  it('maps TABLE_UNAVAILABLE to 503 response', () => {
    const mapped = runtimeReadinessToHttp({
      status: 'TABLE_UNAVAILABLE',
      canServeState: false,
      canAcceptActions: false,
    })
    expect(mapped.status).toBe(503)
    expect(mapped.body.code).toBe('TABLE_UNAVAILABLE')
  })
})

