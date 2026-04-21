import { randomInt } from 'node:crypto'
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import { env } from '../config/env.js'
import { adminConsoleAuthMiddleware } from '../middleware/adminConsole.middleware.js'
import { CashGameController } from '../logic/CashGameController.js'
import { GameTable } from '../logic/GameTable.js'
import { activeGames } from '../shared/activeGames.js'
import { activeBlackjackGames } from '../shared/activeBlackjackGames.js'
import type { ActiveGame } from '../shared/activeGames.js'

const router = Router()

router.use(adminConsoleAuthMiddleware)

const listQuery = z.object({
  take: z.coerce.number().int().min(1).max(200).optional().default(50),
  skip: z.coerce.number().int().min(0).optional().default(0),
  q: z.string().max(200).optional(),
})

function generateAdminTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 16; i++) out += chars[randomInt(chars.length)]
  return out
}

function summarizeActiveGame(gameId: string, game: ActiveGame): Record<string, unknown> {
  let phase: string | undefined
  let pot: number | undefined
  const players: Array<{
    id: string
    name: string
    chips: number
    isConnected?: boolean
    isActive?: boolean
  }> = []

  try {
    if (game instanceof CashGameController) {
      const st = game.getSanitizedState(undefined)
      phase = String(st.phase)
      pot = st.pot
      for (const p of st.players ?? []) {
        players.push({
          id: p.id,
          name: p.name,
          chips: p.chips,
          isConnected: p.isConnected,
          isActive: p.isActive,
        })
      }
      return {
        gameId,
        kind: 'cash',
        cashId: game.id,
        roomId: game.roomId,
        phase,
        pot,
        players,
        playerCount: players.length,
      }
    }
    if (game instanceof GameTable) {
      const st = game.getSanitizedState(undefined)
      phase = String(st.phase)
      pot = st.pot
      for (const p of st.players ?? []) {
        players.push({
          id: p.id,
          name: p.name,
          chips: p.chips,
          isConnected: p.isConnected,
          isActive: p.isActive,
        })
      }
      return {
        gameId,
        kind: 'table',
        tableId: game.id,
        phase,
        pot,
        players,
        playerCount: players.length,
      }
    }
  } catch {
    /* snapshot indisponible */
  }

  if (game instanceof CashGameController) {
    return { gameId, kind: 'cash', cashId: game.id, roomId: game.roomId, phase, pot, players, playerCount: players.length }
  }
  if (game instanceof GameTable) {
    return { gameId, kind: 'table', tableId: game.id, phase, pot, players, playerCount: players.length }
  }
  return { gameId, kind: 'unknown', players, playerCount: players.length }
}

router.get('/users', async (req, res) => {
  const parsed = listQuery.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Pagination invalide' })
  }
  const { take, skip, q: searchRaw } = parsed.data
  const search = searchRaw?.trim()
  const where =
    search && search.length > 0
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        chips: true,
        level: true,
        bannedUntil: true,
        antiCheatAlerts: true,
        lastIp: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ])
  return res.json({ items: rows, total, take, skip })
})

const patchUserSchema = z.object({
  action: z.enum(['suspend', 'ban', 'reactivate']),
  suspendDays: z.number().int().min(1).max(365).optional(),
})

router.patch('/users/:id', async (req, res) => {
  const id = req.params.id
  if (!id || id === env.adminConsoleJwtUserId) {
    return res.status(400).json({ error: 'Cible invalide' })
  }

  const parsed = patchUserSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides' })
  }

  const { action, suspendDays } = parsed.data
  const now = Date.now()
  const bannedUntil: Date | null =
    action === 'suspend'
      ? new Date(now + (suspendDays ?? 7) * 24 * 60 * 60 * 1000)
      : action === 'ban'
        ? new Date('2099-12-31T23:59:59.999Z')
        : null

  try {
    await prisma.user.update({
      where: { id },
      data: { bannedUntil },
    })
  } catch {
    return res.status(404).json({ error: 'Utilisateur introuvable' })
  }

  return res.json({ ok: true, bannedUntil })
})

const setUserPasswordBody = z.object({
  newPassword: z.string().min(8).max(100).optional(),
})

/** Définit un nouveau mot de passe joueur ; le clair est renvoyé une seule fois (l’ancien hash n’est pas réversible). */
router.post('/users/:id/password', async (req, res) => {
  const id = req.params.id
  if (!id || id === env.adminConsoleJwtUserId) {
    return res.status(400).json({ error: 'Cible invalide' })
  }

  const parsed = setUserPasswordBody.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Mot de passe invalide (8–100 caractères) ou corps invalide' })
  }

  const raw = parsed.data.newPassword?.trim()
  const plain = raw && raw.length > 0 ? raw : generateAdminTempPassword()

  try {
    const hashed = await bcrypt.hash(plain, 10)
    await prisma.user.update({
      where: { id },
      data: { password: hashed },
    })
  } catch {
    return res.status(404).json({ error: 'Utilisateur introuvable' })
  }

  return res.json({ ok: true, plainPassword: plain })
})

router.get('/games/history', async (req, res) => {
  const parsed = listQuery.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Pagination invalide' })
  }
  const { take, skip, q: searchRaw } = parsed.data
  const search = searchRaw?.trim()
  const where =
    search && search.length > 0
      ? {
          OR: [
            { gameId: { contains: search, mode: 'insensitive' as const } },
            { tableId: { contains: search, mode: 'insensitive' as const } },
            { winner: { username: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : undefined

  const [items, total] = await Promise.all([
    prisma.gameHistory.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: 'desc' },
      include: {
        winner: { select: { id: true, username: true } },
      },
    }),
    prisma.gameHistory.count({ where }),
  ])
  return res.json({ items, total, take, skip })
})

const activePokerQuery = z.object({
  q: z.string().max(200).optional(),
})

router.get('/games/active-poker', async (req, res) => {
  const parsed = activePokerQuery.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Requête invalide' })
  }
  const filter = parsed.data.q?.trim().toLowerCase() ?? ''
  const map = await activeGames.getAll()
  const items: Record<string, unknown>[] = []
  for (const [gameId, game] of map.entries()) {
    const row = summarizeActiveGame(gameId, game)
    if (filter.length > 0) {
      const blob = JSON.stringify(row).toLowerCase()
      const gid = gameId.toLowerCase()
      if (!gid.includes(filter) && !blob.includes(filter)) {
        continue
      }
    }
    items.push(row)
  }
  return res.json({ items, count: items.length })
})

router.get('/games/blackjack-rooms', async (req, res) => {
  const parsed = listQuery.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Pagination invalide' })
  }
  const { take, skip, q: searchRaw } = parsed.data
  const search = searchRaw?.trim()
  const where =
    search && search.length > 0
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { id: { contains: search, mode: 'insensitive' as const } },
            { host: { username: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : undefined

  const [items, total] = await Promise.all([
    prisma.blackjackRoom.findMany({
      where,
      take,
      skip,
      orderBy: { updatedAt: 'desc' },
      include: {
        host: { select: { id: true, username: true } },
        seats: {
          include: { user: { select: { id: true, username: true } } },
        },
      },
    }),
    prisma.blackjackRoom.count({ where }),
  ])
  return res.json({ items, total, take, skip })
})

router.get('/ratings', async (req, res) => {
  const parsed = listQuery.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Pagination invalide' })
  }
  const { take, skip, q: searchRaw } = parsed.data
  const search = searchRaw?.trim()
  const where =
    search && search.length > 0
      ? {
          OR: [
            { message: { contains: search, mode: 'insensitive' as const } },
            { user: { username: { contains: search, mode: 'insensitive' as const } } },
            { user: { email: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : undefined

  const [items, total] = await Promise.all([
    prisma.gameRating.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
    }),
    prisma.gameRating.count({ where }),
  ])
  return res.json({ items, total, take, skip })
})

/** Ferme une partie poker en mémoire / Redis ; les clients reçoivent GAME_ENDED (table_deleted). */
router.delete('/games/active-poker/:gameId', async (req, res) => {
  const gameId = req.params.gameId
  if (!gameId || gameId.length > 256) {
    return res.status(400).json({ error: 'Identifiant de partie invalide' })
  }
  const game = await activeGames.get(gameId)
  if (!game) {
    return res.status(404).json({ error: 'Partie introuvable ou déjà terminée' })
  }
  try {
    if (game instanceof CashGameController) {
      await prisma.waitingRoom
        .updateMany({
          where: { id: game.roomId },
          data: { status: 'WAITING', gameId: null },
        })
        .catch(() => {
          /* CI / schéma partiel */
        })
    }
    await activeGames.delete(gameId)
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({
      error: e instanceof Error ? e.message : 'Fermeture impossible',
    })
  }
})

/** Supprime une salle blackjack (runtime + ligne BDD). */
router.delete('/games/blackjack-rooms/:roomId', async (req, res) => {
  const roomId = req.params.roomId
  if (!roomId || roomId.length > 256) {
    return res.status(400).json({ error: 'Identifiant de salle invalide' })
  }
  const room = await prisma.blackjackRoom.findUnique({ where: { id: roomId } })
  if (!room) {
    return res.status(404).json({ error: 'Salle introuvable' })
  }
  try {
    if (room.gameId) {
      activeBlackjackGames.delete(room.gameId)
    }
    await prisma.blackjackRoom.delete({ where: { id: room.id } })
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({
      error: e instanceof Error ? e.message : 'Suppression impossible',
    })
  }
})

router.get('/player-reports/unread-count', async (_req, res) => {
  try {
    const count = await prisma.playerReport.count({
      where: { reviewedAt: null },
    })
    return res.json({ count })
  } catch (e) {
    console.error('[adminConsole] player-reports unread', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.get('/player-reports', async (req, res) => {
  const parsed = listQuery.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Pagination invalide' })
  }
  const { take, skip, q: searchRaw } = parsed.data
  const search = searchRaw?.trim()
  const where =
    search && search.length > 0
      ? {
          OR: [
            { reporter: { username: { contains: search, mode: 'insensitive' as const } } },
            { reported: { username: { contains: search, mode: 'insensitive' as const } } },
            { gameId: { contains: search, mode: 'insensitive' as const } },
            { id: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined

  try {
    const [rows, total] = await Promise.all([
      prisma.playerReport.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, username: true, email: true } },
          reported: { select: { id: true, username: true, email: true } },
        },
      }),
      prisma.playerReport.count({ where }),
    ])
    const items = rows.map((row) => ({
      ...row,
      reporter:
        row.reporter ??
        ({
          id: row.reporterId,
          username: '(?)',
          email: '',
        } as const),
      reported:
        row.reported ??
        ({
          id: row.reportedUserId,
          username: '(?)',
          email: '',
        } as const),
    }))
    return res.json({ items, total, take, skip })
  } catch (e) {
    console.error('[adminConsole] player-reports list', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.patch('/player-reports/:id/read', async (req, res) => {
  const id = req.params.id
  if (!id || id.length > 64) {
    return res.status(400).json({ error: 'Identifiant invalide' })
  }
  try {
    await prisma.playerReport.update({
      where: { id },
      data: { reviewedAt: new Date() },
    })
    return res.json({ ok: true })
  } catch {
    return res.status(404).json({ error: 'Signalement introuvable' })
  }
})

export default router
