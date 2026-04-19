import { prisma } from '../../config/database.js'
import { blackjackStateStore } from '../../shared/blackjackStateStore.js'
import { activeBlackjackGames } from '../../shared/activeBlackjackGames.js'
import { blackjackSnapshotRepository } from './blackjackSnapshot.repository.js'
import type { BlackjackTableState } from '../domain/blackjackState.types.js'
import { metrics as promMetrics } from '../../observability/metrics.js'
import { rootLogger } from '../../observability/logger.js'

const ACTIVE_TTL_SEC = 60 * 60 * 6
const ORPHAN_RUNTIME_GRACE_MS = 30 * 60 * 1000
/** Runtime sans ligne `BlackjackRoom.gameId` correspondante : nettoyage rapide. */
const ORPHAN_RUNTIME_NO_ROOM_MS = 2 * 60 * 1000
const NON_PLAYING_RUNTIME_GRACE_MS = 10 * 60 * 1000
/** Salle d’attente sans activité (updatedAt) : suppression automatique. */
const WAITING_ROOM_IDLE_MS = 5 * 60 * 1000
const PLAYING_ROOM_STUCK_MAX_AGE_MS = 2 * 60 * 60 * 1000

type RecoveryMetrics = {
  bootRoomsScanned: number
  bootRuntimeAlreadyPresent: number
  bootRehydratedFromSnapshot: number
  bootResetToWaiting: number
  bootRecoveryFailures: number
  cleanupStoreScanned: number
  cleanupStoreDeleted: number
  cleanupSnapshotDeleted: number
  cleanupRoomDeleted: number
}

const metrics: RecoveryMetrics = {
  bootRoomsScanned: 0,
  bootRuntimeAlreadyPresent: 0,
  bootRehydratedFromSnapshot: 0,
  bootResetToWaiting: 0,
  bootRecoveryFailures: 0,
  cleanupStoreScanned: 0,
  cleanupStoreDeleted: 0,
  cleanupSnapshotDeleted: 0,
  cleanupRoomDeleted: 0,
}

function isValidStoredState(s: BlackjackTableState | null, roomId: string): s is BlackjackTableState {
  if (!s) return false
  return s.roomId === roomId && typeof s.tableId === 'string' && s.tableId.length > 0
}

function parseIsoMs(value: string | undefined): number | null {
  if (!value) return null
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : null
}

export function getBlackjackRecoveryMetrics(): RecoveryMetrics {
  return { ...metrics }
}

/**
 * Partie PLAYING abandonnée (runtime stale côté health, ou reset explicite) :
 * enlève le contrôleur local, le store, le snapshot DB et remet la salle en WAITING.
 */
export async function resetStaleBlackjackPlaySession(params: {
  roomId: string
  gameId: string
}): Promise<void> {
  const { roomId, gameId } = params
  activeBlackjackGames.delete(gameId)
  await blackjackSnapshotRepository.delete(roomId)
  await prisma.blackjackRoom.update({
    where: { id: roomId },
    data: { status: 'WAITING', gameId: null },
  })
  promMetrics.incRecoveryEvent('blackjack', 'stale_session_reset')
  rootLogger.info({
    msg: 'blackjack_stale_play_session_reset',
    roomId,
    gameId,
  })
}

export async function getBlackjackRoomRuntimeDiagnostic(roomId: string): Promise<{
  roomId: string
  roomStatus: string | null
  gameId: string | null
  runtimePresent: boolean
  runtimeVersion: number | null
  runtimeUpdatedAt: string | null
  snapshotPresent: boolean
  snapshotVersion: number | null
  snapshotUpdatedAt: string | null
  verdict:
    | 'healthy'
    | 'rehydrated'
    | 'missing_runtime'
    | 'stale_runtime'
    | 'snapshot_only'
    | 'db_runtime_mismatch'
    | 'room_not_found'
}> {
  const room = await prisma.blackjackRoom.findUnique({
    where: { id: roomId },
    select: { id: true, status: true, gameId: true },
  })
  if (!room) {
    return {
      roomId,
      roomStatus: null,
      gameId: null,
      runtimePresent: false,
      runtimeVersion: null,
      runtimeUpdatedAt: null,
      snapshotPresent: false,
      snapshotVersion: null,
      snapshotUpdatedAt: null,
      verdict: 'room_not_found',
    }
  }

  const tableId = room.gameId
  const runtime = tableId ? await blackjackStateStore.getTable(tableId) : null
  const snapshotDelegate = (
    prisma as unknown as {
      blackjackRoomSnapshot?: {
        findUnique: (args: unknown) => Promise<{ version: number; updatedAt: Date } | null>
        deleteMany: (args: unknown) => Promise<{ count: number }>
      }
    }
  ).blackjackRoomSnapshot
  const snapshot = await snapshotDelegate?.findUnique?.({
    where: { roomId },
    select: { version: true, updatedAt: true },
  })

  const runtimeUpdatedMs = parseIsoMs(runtime?.updatedAt)
  const runtimeStale =
    runtimeUpdatedMs !== null && Date.now() - runtimeUpdatedMs > ORPHAN_RUNTIME_GRACE_MS

  let verdict:
    | 'healthy'
    | 'rehydrated'
    | 'missing_runtime'
    | 'stale_runtime'
    | 'snapshot_only'
    | 'db_runtime_mismatch'
    | 'room_not_found' = 'healthy'

  if (room.status === 'PLAYING' && !runtime && snapshot) verdict = 'snapshot_only'
  else if (room.status === 'PLAYING' && !runtime && !snapshot) verdict = 'missing_runtime'
  else if (runtime && room.status !== 'PLAYING') verdict = 'db_runtime_mismatch'
  else if (runtime && runtimeStale) verdict = 'stale_runtime'
  else if (runtime && snapshot && snapshot.updatedAt > new Date(runtime.updatedAt)) verdict = 'rehydrated'

  return {
    roomId,
    roomStatus: room.status,
    gameId: room.gameId ?? null,
    runtimePresent: Boolean(runtime),
    runtimeVersion: runtime?.version ?? null,
    runtimeUpdatedAt: runtime?.updatedAt ?? null,
    snapshotPresent: Boolean(snapshot),
    snapshotVersion: snapshot?.version ?? null,
    snapshotUpdatedAt: snapshot?.updatedAt?.toISOString() ?? null,
    verdict,
  }
}

export async function recoverBlackjackRuntimeAtBoot(): Promise<void> {
  const playingRooms = await prisma.blackjackRoom.findMany({
    where: { status: 'PLAYING' },
    select: { id: true, gameId: true },
  })
  metrics.bootRoomsScanned += playingRooms.length

  for (const room of playingRooms) {
    try {
      const tableId = room.gameId
      if (!tableId) {
        await prisma.blackjackRoom.update({
          where: { id: room.id },
          data: { status: 'WAITING' },
        })
        metrics.bootResetToWaiting += 1
        promMetrics.incRecoveryEvent('blackjack', 'boot_reset_missing_game_id')
        rootLogger.info({
          msg: 'recovery_boot_room_reset',
          game: 'blackjack',
          reason: 'missing_game_id',
          roomId: room.id,
        })
        continue
      }

      const existsInStore = await blackjackStateStore.exists(tableId)
      if (existsInStore) {
        metrics.bootRuntimeAlreadyPresent += 1
        continue
      }

      const snapshot = await blackjackSnapshotRepository.get(room.id)
      if (isValidStoredState(snapshot, room.id)) {
        await blackjackStateStore.setTable(tableId, snapshot, { ttlSec: ACTIVE_TTL_SEC })
        metrics.bootRehydratedFromSnapshot += 1
        promMetrics.incRecoveryEvent('blackjack', 'boot_rehydrated')
        rootLogger.info({
          msg: 'recovery_boot_rehydrated',
          game: 'blackjack',
          roomId: room.id,
          tableId,
          version: snapshot.version,
        })
        continue
      }

      await prisma.blackjackRoom.update({
        where: { id: room.id },
        data: { status: 'WAITING', gameId: null },
      })
      metrics.bootResetToWaiting += 1
      promMetrics.incRecoveryEvent('blackjack', 'boot_reset_no_snapshot')
      rootLogger.info({
        msg: 'recovery_boot_room_reset',
        game: 'blackjack',
        reason: 'no_runtime_snapshot',
        roomId: room.id,
        tableId,
      })
    } catch (err) {
      metrics.bootRecoveryFailures += 1
      promMetrics.incRecoveryEvent('blackjack', 'boot_failure')
      rootLogger.error({
        msg: 'recovery_boot_failure',
        game: 'blackjack',
        roomId: room.id,
        detail: err instanceof Error ? err.message : String(err),
      })
    }
  }
}

export async function cleanupOrphanBlackjackRuntime(): Promise<void> {
  const snapshotDelegate = (
    prisma as unknown as {
      blackjackRoomSnapshot?: {
        deleteMany?: (args: {
          where: { room: { status: { not: string } } }
        }) => Promise<{ count: number }>
      }
    }
  ).blackjackRoomSnapshot

  const activeTableIds = await blackjackStateStore.listActiveTableIds()
  metrics.cleanupStoreScanned += activeTableIds.length
  if (activeTableIds.length === 0) return

  const linkedRooms = await prisma.blackjackRoom.findMany({
    where: { gameId: { in: activeTableIds } },
    select: { gameId: true, status: true, updatedAt: true },
  })
  const linkedByGameId = new Map(
    linkedRooms
      .filter((r) => r.gameId)
      .map((r) => [r.gameId as string, r])
  )

  for (const tableId of activeTableIds) {
    const linked = linkedByGameId.get(tableId)
    const runtime = await blackjackStateStore.getTable(tableId)
    const runtimeUpdatedMs = parseIsoMs(runtime?.updatedAt)
    const runtimeAgeMs = runtimeUpdatedMs === null ? Number.POSITIVE_INFINITY : Date.now() - runtimeUpdatedMs

    // Conservative cleanup policy:
    // - orphan runtime: delete only if old enough
    // - room not PLAYING: allow short grace period before delete
    let shouldDelete = false
    if (!linked) {
      shouldDelete = runtimeAgeMs > ORPHAN_RUNTIME_NO_ROOM_MS
    } else if (linked.status !== 'PLAYING') {
      shouldDelete = runtimeAgeMs > NON_PLAYING_RUNTIME_GRACE_MS
    }

    if (shouldDelete) {
      await blackjackStateStore.deleteTable(tableId)
      metrics.cleanupStoreDeleted += 1
      promMetrics.incRecoveryEvent('blackjack', 'cleanup_orphan_deleted')
      rootLogger.warn({
        msg: 'recovery_cleanup_orphan_deleted',
        game: 'blackjack',
        tableId,
        roomStatus: linked?.status ?? null,
        runtimeAgeMs: Number.isFinite(runtimeAgeMs) ? runtimeAgeMs : null,
      })
    }
  }

  // Snapshot cleanup: remove snapshots for rooms no longer playing.
  if (snapshotDelegate?.deleteMany) {
    const deletedSnapshots = await snapshotDelegate.deleteMany({
      where: {
        room: {
          status: { not: 'PLAYING' },
        },
      },
    })
    metrics.cleanupSnapshotDeleted += deletedSnapshots.count
  }
}

export async function cleanupStaleBlackjackRooms(): Promise<void> {
  const rooms = await prisma.blackjackRoom.findMany({
    select: {
      id: true,
      status: true,
      gameId: true,
      updatedAt: true,
      createdAt: true,
    },
  })
  if (rooms.length === 0) return

  const nowMs = Date.now()
  const snapshotDelegate = (
    prisma as unknown as {
      blackjackRoomSnapshot?: {
        findUnique: (args: unknown) => Promise<{ roomId: string } | null>
      }
    }
  ).blackjackRoomSnapshot

  for (const room of rooms) {
    const lastActivityMs = room.updatedAt?.getTime?.() ?? room.createdAt.getTime()
    const ageMs = nowMs - lastActivityMs

    if (room.status === 'WAITING') {
      if (ageMs <= WAITING_ROOM_IDLE_MS) continue
      await prisma.blackjackRoom.delete({ where: { id: room.id } })
      metrics.cleanupRoomDeleted += 1
      continue
    }

    if (room.status !== 'PLAYING') continue
    if (ageMs <= PLAYING_ROOM_STUCK_MAX_AGE_MS) continue

    const tableId = room.gameId
    if (!tableId) {
      await prisma.blackjackRoom.delete({ where: { id: room.id } })
      metrics.cleanupRoomDeleted += 1
      continue
    }

    const runtimeExists = await blackjackStateStore.exists(tableId)
    if (runtimeExists) continue

    const snapshotExists = Boolean(
      await snapshotDelegate?.findUnique?.({
        where: { roomId: room.id },
        select: { roomId: true },
      })
    )
    if (snapshotExists) continue

    await prisma.blackjackRoom.delete({ where: { id: room.id } })
    metrics.cleanupRoomDeleted += 1
  }
}

