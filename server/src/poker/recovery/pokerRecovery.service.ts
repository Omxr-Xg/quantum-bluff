import { prisma } from '../../config/database.js'
import { activeGames } from '../../shared/activeGames.js'
import { pokerStateStore } from '../../shared/pokerStateStore.js'
import { metrics as promMetrics } from '../../observability/metrics.js'
import { rootLogger } from '../../observability/logger.js'

type PokerRecoveryMetrics = {
  roomsScanned: number
  staleSnapshotsDeleted: number
  orphanSnapshotsDeleted: number
}

const metrics: PokerRecoveryMetrics = {
  roomsScanned: 0,
  staleSnapshotsDeleted: 0,
  orphanSnapshotsDeleted: 0,
}

export function getPokerRecoveryMetrics(): PokerRecoveryMetrics {
  return { ...metrics }
}

export async function recoverPokerRuntimeAtBoot(): Promise<void> {
  const rooms = await prisma.waitingRoom.findMany({
    where: { status: 'IN_GAME' },
    select: { gameId: true },
  })
  metrics.roomsScanned += rooms.length
  for (const room of rooms) {
    if (!room.gameId) continue
    const local = await activeGames.get(room.gameId)
    if (local) continue
    const snapshot = await pokerStateStore.get(room.gameId)
    if (!snapshot) continue
    // Current implementation stores snapshots for diagnostics/readiness only.
    // Runtime rehydration of CashGameController is intentionally conservative.
  }
  promMetrics.incRecoveryEvent('poker', 'boot_scan_complete')
  rootLogger.info({
    msg: 'recovery_boot_complete',
    game: 'poker',
    roomsScanned: metrics.roomsScanned,
    detail: 'scan IN_GAME sans réhydratation runtime (design conservateur)',
  })
}

export async function cleanupOrphanPokerRuntime(): Promise<void> {
  const ids = await pokerStateStore.listIds()
  if (ids.length === 0) return
  const linkedRooms = await prisma.waitingRoom.findMany({
    where: { gameId: { in: ids } },
    select: { gameId: true, updatedAt: true },
  })
  const linked = new Set(linkedRooms.map((r) => r.gameId).filter(Boolean) as string[])
  for (const gameId of ids) {
    if (linked.has(gameId)) continue
    await pokerStateStore.delete(gameId)
    metrics.orphanSnapshotsDeleted += 1
  }
}

