import type { Prisma } from '../generated/prisma/index.js'
import { prisma } from '../config/database.js'
import { env } from '../config/env.js'
import { createAdminNotificationsBulk } from './notification.service.js'

export type BroadcastSegment =
  | 'new_7d'
  | 'new_30d'
  | 'active_7d'
  | 'low_chips'
  | 'high_chips'
  | 'level_beginner'
  | 'level_advanced'
  | 'custom'

export type BroadcastFilters = {
  minLevel?: number
  maxLevel?: number
  minChips?: number
  maxChips?: number
  registeredWithinDays?: number
}

export type BroadcastAudience =
  | { kind: 'all' }
  | { kind: 'users'; usernames: string[] }
  | { kind: 'segment'; segment: BroadcastSegment; filters?: BroadcastFilters }

export class AdminBroadcastError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'AdminBroadcastError'
  }
}

const MAX_RECIPIENTS = 25_000

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

function notBannedWhere(): Prisma.UserWhereInput {
  const now = new Date()
  return {
    AND: [
      { OR: [{ bannedUntil: null }, { bannedUntil: { lt: now } }] },
      { id: { not: env.adminConsoleJwtUserId } },
    ],
  }
}

function segmentToWhere(segment: BroadcastSegment, filters?: BroadcastFilters): Prisma.UserWhereInput {
  switch (segment) {
    case 'new_7d':
      return { createdAt: { gte: daysAgo(7) } }
    case 'new_30d':
      return { createdAt: { gte: daysAgo(30) } }
    case 'active_7d':
      return { updatedAt: { gte: daysAgo(7) } }
    case 'low_chips':
      return { chips: { lt: 1000 } }
    case 'high_chips':
      return { chips: { gte: 10_000 } }
    case 'level_beginner':
      return { level: { lte: 5 } }
    case 'level_advanced':
      return { level: { gte: 10 } }
    case 'custom': {
      const where: Prisma.UserWhereInput = {}
      const level: Prisma.IntFilter = {}
      if (filters?.minLevel != null) level.gte = filters.minLevel
      if (filters?.maxLevel != null) level.lte = filters.maxLevel
      if (Object.keys(level).length > 0) where.level = level

      const chips: Prisma.IntFilter = {}
      if (filters?.minChips != null) chips.gte = filters.minChips
      if (filters?.maxChips != null) chips.lte = filters.maxChips
      if (Object.keys(chips).length > 0) where.chips = chips

      if (filters?.registeredWithinDays != null) {
        where.createdAt = { gte: daysAgo(filters.registeredWithinDays) }
      }
      return where
    }
    default:
      return {}
  }
}

export async function resolveBroadcastUserIds(audience: BroadcastAudience): Promise<string[]> {
  const base = notBannedWhere()

  if (audience.kind === 'all') {
    const rows = await prisma.user.findMany({ where: base, select: { id: true } })
    return rows.map((r) => r.id)
  }

  if (audience.kind === 'users') {
    const names = audience.usernames.map((u) => u.trim()).filter(Boolean)
    if (names.length === 0) return []
    const rows = await prisma.user.findMany({
      where: {
        AND: [
          base,
          {
            OR: names.flatMap((name) => [
              { username: { equals: name, mode: 'insensitive' as const } },
              { id: name },
            ]),
          },
        ],
      },
      select: { id: true },
    })
    return [...new Set(rows.map((r) => r.id))]
  }

  const rows = await prisma.user.findMany({
    where: {
      AND: [base, segmentToWhere(audience.segment, audience.filters)],
    },
    select: { id: true },
  })
  return rows.map((r) => r.id)
}

export async function countBroadcastRecipients(audience: BroadcastAudience): Promise<number> {
  const ids = await resolveBroadcastUserIds(audience)
  return ids.length
}

export async function sendAdminBroadcast(params: {
  title?: string
  body: string
  audience: BroadcastAudience
}): Promise<{ sentCount: number }> {
  const body = params.body.trim()
  if (!body) {
    throw new AdminBroadcastError('EMPTY_BODY', 400, 'Le message ne peut pas être vide.')
  }

  const userIds = await resolveBroadcastUserIds(params.audience)
  if (userIds.length === 0) {
    throw new AdminBroadcastError('NO_RECIPIENTS', 400, 'Aucun destinataire pour cette cible.')
  }
  if (userIds.length > MAX_RECIPIENTS) {
    throw new AdminBroadcastError(
      'TOO_MANY',
      400,
      `Trop de destinataires (${userIds.length}). Maximum ${MAX_RECIPIENTS}.`,
    )
  }

  const payload = {
    title: params.title?.trim() || "Message de l'équipe",
    body,
    from: 'admin',
  }

  const sentCount = await createAdminNotificationsBulk(userIds, payload)
  return { sentCount }
}
