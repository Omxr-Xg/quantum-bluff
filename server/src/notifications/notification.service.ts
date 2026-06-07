import type { NotificationType, Prisma } from '../generated/prisma/index.js'
import { prisma } from '../config/database.js'
import { getGameIo } from '../sockets/gameIo.registry.js'

let notifyIo: ReturnType<typeof getGameIo> | null = null

export function setNotificationIo(io: ReturnType<typeof getGameIo>): void {
  notifyIo = io
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  payload: Record<string, unknown>,
): Promise<void> {
  const row = await prisma.userNotification.create({
    data: { userId, type, payload: payload as Prisma.InputJsonValue },
  })
  const io = notifyIo ?? getGameIo()
  io?.to(`user:${userId}`).emit('NOTIFICATION_NEW', {
    id: row.id,
    type: row.type,
    payload: row.payload,
    createdAt: row.createdAt.toISOString(),
  })
}

export async function listNotifications(
  userId: string,
  opts?: { limit?: number; unreadOnly?: boolean },
) {
  const limit = Math.min(50, Math.max(1, opts?.limit ?? 30))
  const rows = await prisma.userNotification.findMany({
    where: {
      userId,
      ...(opts?.unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  const unreadCount = await prisma.userNotification.count({
    where: { userId, readAt: null },
  })
  return {
    items: rows.map((r) => ({
      id: r.id,
      type: r.type,
      payload: r.payload,
      readAt: r.readAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    unreadCount,
  }
}

export async function markNotificationRead(userId: string, id: string): Promise<boolean> {
  const result = await prisma.userNotification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  })
  return result.count > 0
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await prisma.userNotification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  })
  return result.count
}
