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

/** Diffusion admin : insertion par lots + push socket (sans id individuel côté client). */
export async function createAdminNotificationsBulk(
  userIds: string[],
  payload: Record<string, unknown>,
): Promise<number> {
  if (userIds.length === 0) return 0

  const io = notifyIo ?? getGameIo()
  const createdAt = new Date().toISOString()
  const CHUNK = 250

  for (let i = 0; i < userIds.length; i += CHUNK) {
    const chunk = userIds.slice(i, i + CHUNK)
    await prisma.userNotification.createMany({
      data: chunk.map((userId) => ({
        userId,
        type: 'ADMIN_MESSAGE',
        payload: payload as Prisma.InputJsonValue,
      })),
    })
    for (const userId of chunk) {
      io?.to(`user:${userId}`).emit('NOTIFICATION_NEW', {
        type: 'ADMIN_MESSAGE',
        payload,
        createdAt,
      })
    }
  }

  return userIds.length
}
