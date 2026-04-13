import type { BlackjackRoomStatus } from '../../generated/prisma/index.js'
import type { BlackjackTableState } from '../domain/blackjackState.types.js'

export type BlackjackRuntimeReadStatus =
  | 'READY'
  | 'TABLE_RECOVERING'
  | 'TABLE_STATE_STALE'
  | 'TABLE_UNAVAILABLE'
  | 'TABLE_DB_RUNTIME_MISMATCH'
  | 'TABLE_NOT_LOADED_LOCALLY'

export interface BlackjackRuntimeReadAssessment {
  status: BlackjackRuntimeReadStatus
  canServeState: boolean
  canAcceptActions: boolean
  reason?: string
}

type SnapshotMeta = {
  exists: boolean
  updatedAt?: Date
  version?: number
}

export const BLACKJACK_RUNTIME_STALE_MS = 30 * 60 * 1000

export function assessBlackjackRuntimeReadiness(input: {
  requestedGameId: string
  room: { id: string; status: BlackjackRoomStatus; gameId: string | null } | null
  runtimeState: BlackjackTableState | null
  snapshot: SnapshotMeta
  nowMs?: number
}): BlackjackRuntimeReadAssessment {
  const nowMs = input.nowMs ?? Date.now()
  const { room, runtimeState, snapshot, requestedGameId } = input

  if (!room) {
    return {
      status: 'TABLE_UNAVAILABLE',
      canServeState: false,
      canAcceptActions: false,
      reason: 'Room not found for gameId',
    }
  }

  if (room.gameId !== requestedGameId) {
    return {
      status: 'TABLE_DB_RUNTIME_MISMATCH',
      canServeState: false,
      canAcceptActions: false,
      reason: 'Room gameId mismatch',
    }
  }

  if (runtimeState) {
    if (room.status !== 'PLAYING') {
      return {
        status: 'TABLE_DB_RUNTIME_MISMATCH',
        canServeState: false,
        canAcceptActions: false,
        reason: `Room status is ${room.status}, runtime exists`,
      }
    }

    const updatedMs = Date.parse(runtimeState.updatedAt)
    const stale =
      Number.isFinite(updatedMs) && nowMs - updatedMs > BLACKJACK_RUNTIME_STALE_MS
    if (stale) {
      return {
        status: 'TABLE_STATE_STALE',
        canServeState: false,
        canAcceptActions: false,
        reason: 'Runtime state is stale',
      }
    }

    return {
      status: 'READY',
      canServeState: true,
      canAcceptActions: true,
    }
  }

  if (room.status === 'PLAYING' && snapshot.exists) {
    return {
      status: 'TABLE_RECOVERING',
      canServeState: false,
      canAcceptActions: false,
      reason: 'Runtime missing but snapshot exists',
    }
  }

  if (room.status === 'PLAYING') {
    return {
      status: 'TABLE_UNAVAILABLE',
      canServeState: false,
      canAcceptActions: false,
      reason: 'Runtime missing and no snapshot',
    }
  }

  return {
    status: 'TABLE_UNAVAILABLE',
    canServeState: false,
    canAcceptActions: false,
    reason: 'Room not in PLAYING state and no runtime',
  }
}

export function runtimeReadinessToHttp(assessment: BlackjackRuntimeReadAssessment): {
  status: number
  body: { error: string; code: string; message: string }
} {
  switch (assessment.status) {
    case 'TABLE_RECOVERING':
      return {
        status: 409,
        body: {
          error: 'TABLE_RECOVERING',
          code: 'TABLE_RECOVERING',
          message: 'Table is recovering. Please retry shortly.',
        },
      }
    case 'TABLE_STATE_STALE':
      return {
        status: 409,
        body: {
          error: 'TABLE_STATE_STALE',
          code: 'TABLE_STATE_STALE',
          message: 'Blackjack table state is stale and temporarily unavailable.',
        },
      }
    case 'TABLE_DB_RUNTIME_MISMATCH':
      return {
        status: 409,
        body: {
          error: 'TABLE_DB_RUNTIME_MISMATCH',
          code: 'TABLE_DB_RUNTIME_MISMATCH',
          message: 'Table runtime does not match room state.',
        },
      }
    case 'TABLE_NOT_LOADED_LOCALLY':
      return {
        status: 409,
        body: {
          error: 'TABLE_NOT_LOADED_LOCALLY',
          code: 'TABLE_NOT_LOADED_LOCALLY',
          message: 'Table is not loaded on this node.',
        },
      }
    case 'TABLE_UNAVAILABLE':
    default:
      return {
        status: 503,
        body: {
          error: 'TABLE_UNAVAILABLE',
          code: 'TABLE_UNAVAILABLE',
          message: 'Table is unavailable.',
        },
      }
  }
}

