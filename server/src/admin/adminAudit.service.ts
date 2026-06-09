import type { Request } from 'express'
import type { Prisma } from '../generated/prisma/index.js'
import { prisma } from '../config/database.js'
import { rootLogger } from '../observability/logger.js'

export async function logAdminAction(
  req: Request,
  entry: {
    action: string
    targetId?: string | null
    metadata?: Record<string, unknown> | null
  },
): Promise<void> {
  const adminId = req.userId
  if (!adminId) return

  const ip =
    (typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
      : null) ?? req.ip ?? null

  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: entry.action,
        targetId: entry.targetId ?? null,
        metadata: (entry.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ip,
      },
    })
  } catch (err) {
    rootLogger.warn({
      msg: 'admin_audit_log_failed',
      action: entry.action,
      adminId,
      detail: err instanceof Error ? err.message : String(err),
    })
  }
}

export async function listAdminAuditLogs(opts: {
  take?: number
  skip?: number
  action?: string
}) {
  const take = Math.min(200, Math.max(1, opts.take ?? 50))
  const skip = Math.max(0, opts.skip ?? 0)
  return prisma.adminAuditLog.findMany({
    where: opts.action ? { action: opts.action } : undefined,
    orderBy: { createdAt: 'desc' },
    take,
    skip,
  })
}
