import { prisma } from '../../config/database.js'
import type { BlackjackTableState } from '../domain/blackjackState.types.js'

type SnapshotDelegate = {
  upsert: (args: unknown) => Promise<unknown>
  findUnique: (args: unknown) => Promise<{ snapshot?: unknown } | null>
  deleteMany: (args: unknown) => Promise<{ count: number }>
}

function getSnapshotDelegate(): SnapshotDelegate | null {
  const delegate = (prisma as unknown as { blackjackRoomSnapshot?: SnapshotDelegate })
    .blackjackRoomSnapshot
  return delegate ?? null
}

export const blackjackSnapshotRepository = {
  async save(roomId: string, snapshot: BlackjackTableState): Promise<void> {
    const snapshotDelegate = getSnapshotDelegate()
    if (!snapshotDelegate) return
    await snapshotDelegate.upsert({
      where: { roomId },
      create: {
        roomId,
        snapshot: snapshot as unknown as object,
        version: snapshot.version,
      },
      update: {
        snapshot: snapshot as unknown as object,
        version: snapshot.version,
      },
    })
  },

  async get(roomId: string): Promise<BlackjackTableState | null> {
    const snapshotDelegate = getSnapshotDelegate()
    if (!snapshotDelegate) return null
    const row = await snapshotDelegate.findUnique({
      where: { roomId },
    })
    return (row?.snapshot as unknown as BlackjackTableState) ?? null
  },

  async delete(roomId: string): Promise<void> {
    const snapshotDelegate = getSnapshotDelegate()
    if (!snapshotDelegate) return
    await snapshotDelegate.deleteMany({ where: { roomId } })
  },
}

