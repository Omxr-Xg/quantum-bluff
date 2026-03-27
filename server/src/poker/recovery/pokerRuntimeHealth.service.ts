import { prisma } from '../../config/database.js'
import { pokerStateStore } from '../../shared/pokerStateStore.js'
import { activeGames } from '../../shared/activeGames.js'

export type PokerRuntimeStatus =
  | 'READY'
  | 'TABLE_RECOVERING'
  | 'TABLE_STATE_STALE'
  | 'TABLE_UNAVAILABLE'
  | 'TABLE_NOT_LOADED_LOCALLY'
  | 'TABLE_DB_RUNTIME_MISMATCH'

export interface PokerRuntimeAssessment {
  status: PokerRuntimeStatus
  canServeState: boolean
  canAcceptActions: boolean
}

const STALE_MS = 30 * 60 * 1000

export async function assessPokerRuntimeReadiness(gameId: string): Promise<PokerRuntimeAssessment> {
  const room = await prisma.waitingRoom.findFirst({
    where: { gameId },
    select: { id: true, status: true, gameId: true },
  })
  const local = await activeGames.get(gameId)
  const snapshot = await pokerStateStore.get(gameId)

  if (!room) return { status: 'TABLE_UNAVAILABLE', canServeState: false, canAcceptActions: false }
  if (!room.gameId || room.gameId !== gameId) {
    return { status: 'TABLE_DB_RUNTIME_MISMATCH', canServeState: false, canAcceptActions: false }
  }
  if (local) return { status: 'READY', canServeState: true, canAcceptActions: true }
  if (!snapshot) {
    return { status: 'TABLE_UNAVAILABLE', canServeState: false, canAcceptActions: false }
  }
  const ageMs = Date.now() - Date.parse(snapshot.updatedAt)
  if (Number.isFinite(ageMs) && ageMs > STALE_MS) {
    return { status: 'TABLE_STATE_STALE', canServeState: false, canAcceptActions: false }
  }
  return { status: 'TABLE_RECOVERING', canServeState: true, canAcceptActions: false }
}

