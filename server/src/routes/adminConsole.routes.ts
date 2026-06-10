import { randomInt } from 'node:crypto'
import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import { env } from '../config/env.js'
import { adminConsoleAuthMiddleware } from '../middleware/adminConsole.middleware.js'
import { CashGameController } from '../logic/CashGameController.js'
import { GameTable } from '../logic/GameTable.js'
import { activeGames } from '../shared/activeGames.js'
import { activeBlackjackGames } from '../shared/activeBlackjackGames.js'
import { activeBeloteGames } from '../shared/activeBeloteGames.js'
import { forceCloseBeloteGame } from '../sockets/belote.gateway.handlers.js'
import { getGameIo } from '../sockets/gameIo.registry.js'
import type { ActiveGame } from '../shared/activeGames.js'
import * as giftCodesService from '../giftCodes/giftCodes.service.js'
import { deleteUserAccount, UserDeletionError } from '../services/userDeletion.service.js'
import {
  AdminBroadcastError,
  countBroadcastRecipients,
  sendAdminBroadcast,
  type BroadcastAudience,
  type BroadcastSegment,
} from '../notifications/adminBroadcast.service.js'
import beloteAnalyticsRoutes from './admin.beloteAnalytics.routes.js'
import { listAdminAuditLogs, logAdminAction } from '../admin/adminAudit.service.js'
import {
  AdminPlayerError,
  adminCreateUniqueCosmetic,
  adminGrantChips,
  adminGrantCosmetic,
  adminRevokeCosmetic,
  getAdminPlayerDetail,
  listAdminCosmetics,
} from '../admin/adminPlayer.service.js'
import { CosmeticAssetError, saveCosmeticAssetFromDataUrl } from '../admin/cosmeticAsset.service.js'

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

/** Libellé clé pour l’admin : clarifie « WAITING » (entre mains) vs main réellement en cours. */
function pokerLifecycleKey(phase: string | undefined): string {
  if (!phase) return 'unknown'
  if (phase === 'ENDED_OPPONENT_LEFT') return 'hand_ended'
  if (phase === 'SHOWDOWN') return 'showdown'
  if (phase === 'WAITING') return 'between_hands'
  if (phase === 'PREFLOP' || phase === 'FLOP' || phase === 'TURN' || phase === 'RIVER') return 'street_live'
  return 'other'
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
        lifecycleKey: pokerLifecycleKey(phase),
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
        lifecycleKey: pokerLifecycleKey(phase),
        pot,
        players,
        playerCount: players.length,
      }
    }
  } catch {
    /* snapshot indisponible */
  }

  if (game instanceof CashGameController) {
    return {
      gameId,
      kind: 'cash',
      cashId: game.id,
      roomId: game.roomId,
      phase,
      lifecycleKey: pokerLifecycleKey(phase),
      pot,
      players,
      playerCount: players.length,
    }
  }
  if (game instanceof GameTable) {
    return {
      gameId,
      kind: 'table',
      tableId: game.id,
      phase,
      lifecycleKey: pokerLifecycleKey(phase),
      pot,
      players,
      playerCount: players.length,
    }
  }
  return { gameId, kind: 'unknown', players, playerCount: players.length, lifecycleKey: 'unknown' }
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

router.get('/users/:id/detail', async (req, res) => {
  const id = req.params.id
  if (!id) return res.status(400).json({ error: 'Identifiant invalide' })
  try {
    const detail = await getAdminPlayerDetail(id)
    return res.json(detail)
  } catch (e) {
    if (e instanceof AdminPlayerError) {
      return res.status(e.statusCode).json({ error: e.message })
    }
    console.error('[adminConsole] user detail', e)
    return res.status(500).json({ error: 'Lecture profil impossible' })
  }
})

router.post('/users/:id/chips', async (req, res) => {
  const id = req.params.id
  if (!id || id === env.adminConsoleJwtUserId) {
    return res.status(400).json({ error: 'Cible invalide' })
  }
  try {
    const result = await adminGrantChips(id, req.body)
    void logAdminAction(req, {
      action: 'user.grant_chips',
      targetId: id,
      metadata: { amount: result.delta },
    })
    return res.json(result)
  } catch (e) {
    if (e instanceof AdminPlayerError) {
      return res.status(e.statusCode).json({ error: e.message })
    }
    console.error('[adminConsole] grant chips', e)
    return res.status(500).json({ error: 'Crédit impossible' })
  }
})

const grantCosmeticBody = z.object({
  cosmeticId: z.string().min(1).max(64),
})

router.post('/users/:id/cosmetics/grant', async (req, res) => {
  const id = req.params.id
  if (!id || id === env.adminConsoleJwtUserId) {
    return res.status(400).json({ error: 'Cible invalide' })
  }
  const parsed = grantCosmeticBody.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Cosmétique invalide' })
  }
  try {
    const result = await adminGrantCosmetic(id, parsed.data.cosmeticId)
    void logAdminAction(req, {
      action: 'user.grant_cosmetic',
      targetId: id,
      metadata: { cosmeticId: parsed.data.cosmeticId },
    })
    return res.json(result)
  } catch (e) {
    if (e instanceof AdminPlayerError) {
      return res.status(e.statusCode).json({ error: e.message })
    }
    console.error('[adminConsole] grant cosmetic', e)
    return res.status(500).json({ error: 'Attribution impossible' })
  }
})

router.delete('/users/:id/cosmetics/:cosmeticId', async (req, res) => {
  const id = req.params.id
  const cosmeticId = req.params.cosmeticId
  if (!id || !cosmeticId) {
    return res.status(400).json({ error: 'Cible invalide' })
  }
  try {
    const result = await adminRevokeCosmetic(id, cosmeticId)
    void logAdminAction(req, {
      action: 'user.revoke_cosmetic',
      targetId: id,
      metadata: { cosmeticId },
    })
    return res.json(result)
  } catch (e) {
    if (e instanceof AdminPlayerError) {
      return res.status(e.statusCode).json({ error: e.message })
    }
    console.error('[adminConsole] revoke cosmetic', e)
    return res.status(500).json({ error: 'Révocation impossible' })
  }
})

router.get('/cosmetics', async (_req, res) => {
  try {
    const items = await listAdminCosmetics()
    return res.json({ items })
  } catch (e) {
    console.error('[adminConsole] cosmetics list', e)
    return res.status(500).json({ error: 'Liste cosmétiques impossible' })
  }
})

router.post('/cosmetics', async (req, res) => {
  try {
    const result = await adminCreateUniqueCosmetic(req.body)
    void logAdminAction(req, {
      action: 'cosmetic.create_unique',
      targetId: result.cosmetic.id,
      metadata: { type: result.cosmetic.type, granted: result.granted },
    })
    return res.status(201).json(result)
  } catch (e) {
    if (e instanceof AdminPlayerError) {
      return res.status(e.statusCode).json({ error: e.message })
    }
    console.error('[adminConsole] create cosmetic', e)
    return res.status(500).json({ error: 'Création impossible' })
  }
})

const uploadAssetBody = z.object({
  dataUrl: z.string().min(32).max(1_200_000),
})

router.post('/cosmetics/upload-asset', async (req, res) => {
  const parsed = uploadAssetBody.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Image invalide' })
  }
  try {
    const saved = await saveCosmeticAssetFromDataUrl(parsed.data.dataUrl)
    void logAdminAction(req, {
      action: 'cosmetic.upload_asset',
      metadata: { filename: saved.filename },
    })
    return res.status(201).json(saved)
  } catch (e) {
    if (e instanceof CosmeticAssetError) {
      return res.status(e.statusCode).json({ error: e.message })
    }
    console.error('[adminConsole] upload cosmetic asset', e)
    return res.status(500).json({ error: 'Import impossible' })
  }
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
      data: {
        bannedUntil,
        ...(action === 'reactivate' ? { antiCheatAlerts: 0 } : {}),
      },
      select: { id: true },
    })
  } catch {
    return res.status(404).json({ error: 'Utilisateur introuvable' })
  }

  return res.json({ ok: true, bannedUntil })
})

/** Supprime définitivement un compte joueur et toutes ses données. */
router.delete('/users/:id', async (req, res) => {
  const id = req.params.id
  if (!id || id === env.adminConsoleJwtUserId) {
    return res.status(400).json({ error: 'Cible invalide' })
  }
  try {
    await deleteUserAccount(id)
    void logAdminAction(req, { action: 'user.delete', targetId: id })
    return res.json({ ok: true })
  } catch (e) {
    if (e instanceof UserDeletionError) {
      return res.status(e.statusCode).json({ error: e.message })
    }
    console.error('[adminConsole] delete user', e)
    return res.status(500).json({ error: 'Suppression impossible' })
  }
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
      select: { id: true },
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

  const [rows, total] = await Promise.all([
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
  const items = rows.map((room) => {
    const seats = room.seats ?? []
    const gid = room.gameId?.trim() ?? ''
    const runtimeAlive = gid.length > 0 ? Boolean(activeBlackjackGames.getSync(gid)) : false
    const adminStatusKey =
      gid.length > 0 && !runtimeAlive ? 'BJ_ENDED_NO_RUNTIME' : room.status
    return {
      ...room,
      seats,
      runtimeAlive,
      adminStatusKey,
    }
  })
  return res.json({ items, total, take, skip })
})

router.get('/tournaments', async (req, res) => {
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
  try {
    const [items, total] = await Promise.all([
      prisma.tournament.findMany({
        where,
        take,
        skip,
        orderBy: { startAt: 'desc' },
        include: {
          host: { select: { id: true, username: true } },
          _count: { select: { players: true } },
        },
      }),
      prisma.tournament.count({ where }),
    ])
    return res.json({ items, total, take, skip })
  } catch (e) {
    console.error('[adminConsole] tournaments list', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
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

router.get('/games/belote-rooms', async (req, res) => {
  const parsed = listQuery.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Pagination invalide' })
  }
  const { take, skip } = parsed.data
  const [rows, total] = await Promise.all([
    prisma.beloteRoom.findMany({
      take,
      skip,
      orderBy: { updatedAt: 'desc' },
      include: {
        host: { select: { id: true, username: true } },
        seats: { include: { user: { select: { id: true, username: true } } } },
      },
    }),
    prisma.beloteRoom.count(),
  ])
  const items = rows.map((room) => {
    const gid = room.gameId?.trim() ?? ''
    const runtimeAlive = gid.length > 0 ? Boolean(activeBeloteGames.getSync(gid)) : false
    return { ...room, runtimeAlive }
  })
  return res.json({ items, total, take, skip })
})

router.post('/belote/force-close/:gameId', async (req, res) => {
  const gameId = req.params.gameId
  if (!gameId) return res.status(400).json({ error: 'gameId requis' })
  try {
    const ok = await forceCloseBeloteGame(gameId, getGameIo())
    if (!ok) return res.status(404).json({ error: 'Partie introuvable' })
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({
      error: e instanceof Error ? e.message : 'Fermeture impossible',
    })
  }
})

/** Supprime une salle belote (runtime + ligne BDD). */
router.delete('/games/belote-rooms/:roomId', async (req, res) => {
  const roomId = req.params.roomId
  if (!roomId || roomId.length > 256) {
    return res.status(400).json({ error: 'Identifiant de salle invalide' })
  }
  const room = await prisma.beloteRoom.findUnique({ where: { id: roomId } })
  if (!room) {
    return res.status(404).json({ error: 'Salle introuvable' })
  }
  try {
    const gameId = room.gameId?.trim() ?? ''
    if (gameId.length > 0) {
      activeBeloteGames.delete(gameId)
      const { stopBeloteTimersForGame } = await import(
        '../belote/services/beloteTurnTimer.service.js'
      )
      stopBeloteTimersForGame(gameId)
      void import('../belote/services/beloteBotTurns.service.js').then(({ clearBeloteBotSession }) =>
        clearBeloteBotSession(gameId),
      )
    }
    await prisma.beloteGameSnapshot.deleteMany({ where: { roomId } }).catch(() => {})
    await prisma.beloteRoom.delete({ where: { id: room.id } })
    const io = getGameIo()
    io?.to(`belote-room:${roomId}`).emit('BELOTE_ROOM_UPDATED', null)
    if (gameId.length > 0) {
      io?.to(`belote-game:${gameId}`).emit('ERROR', {
        code: 'GAME_CLOSED',
        message: 'Partie fermée par un administrateur',
      })
    }
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

async function listWaitingRoomsAdmin(req: Request, res: Response): Promise<void> {
  const parsed = listQuery.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'Pagination invalide' })
    return
  }
  const { take, skip, q: searchRaw } = parsed.data
  const search = searchRaw?.trim()
  const where =
    search && search.length > 0
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { id: { contains: search, mode: 'insensitive' as const } },
            { hostId: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined
  try {
    const [items, total] = await Promise.all([
      prisma.waitingRoom.findMany({
        where,
        take,
        skip,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          hostId: true,
          status: true,
          gameId: true,
          maxPlayers: true,
          visibility: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.waitingRoom.count({ where }),
    ])
    res.json({ items, total, take, skip })
  } catch (e) {
    console.error('[adminConsole] waiting-rooms list', e)
    res.status(500).json({ error: 'Erreur serveur' })
  }
}

router.get('/waiting-rooms', listWaitingRoomsAdmin)
router.get('/games/waiting-rooms', listWaitingRoomsAdmin)

async function deleteWaitingRoomAdmin(req: Request, res: Response): Promise<void> {
  const id = req.params.id
  if (!id || id.length > 64) {
    res.status(400).json({ error: 'Identifiant invalide' })
    return
  }
  try {
    const room = await prisma.waitingRoom.findUnique({
      where: { id },
      select: { id: true, gameId: true },
    })
    if (!room) {
      res.status(404).json({ error: 'Salle introuvable' })
      return
    }
    if (room.gameId) {
      try {
        await activeGames.delete(room.gameId)
      } catch {
        void 0
      }
    }
    await prisma.waitingRoom.delete({ where: { id } })
    void logAdminAction(req, { action: 'waiting_room.delete', targetId: id })
    res.json({ ok: true })
  } catch (e) {
    console.error('[adminConsole] waiting-room delete', e)
    res.status(500).json({
      error: e instanceof Error ? e.message : 'Suppression impossible',
    })
  }
}

router.delete('/waiting-rooms/:id', deleteWaitingRoomAdmin)
router.delete('/games/waiting-rooms/:id', deleteWaitingRoomAdmin)

/** Codes cadeaux admin (même JWT console ; évite /api/gift-codes sur d’anciennes images VM). */
router.get('/gift-codes', async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 100)
    const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0)
    const result = await giftCodesService.getAllGiftCodes(limit, offset)
    return res.json(result)
  } catch (e) {
    console.error('[adminConsole] gift-codes list', e)
    return res.status(500).json({ error: 'Impossible de charger les codes cadeaux' })
  }
})

const giftCodeCreateSchema = z.object({
  code: z.string().min(1).max(64),
  amount: z.number().int().min(1),
  usageType: z.enum(['TOKENS', 'FIXED_DISCOUNT', 'PERCENTAGE_DISCOUNT']),
  type: z.enum(['ACHIEVEMENT', 'EVENT', 'SEASONAL', 'SPECIAL']),
  description: z.string().max(500).nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  maxUses: z.number().int().optional(),
})

router.post('/gift-codes', async (req, res) => {
  const parsed = giftCodeCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides' })
  }
  const { code, amount, usageType, type, description, expiresAt, maxUses } = parsed.data
  try {
    const giftCode = await giftCodesService.createGiftCode({
      code: code.trim(),
      amount,
      usageType,
      type,
      description: description ?? null,
      expiresAt: expiresAt ?? null,
      maxUses: maxUses ?? -1,
    })
    void logAdminAction(req, {
      action: 'gift_code.create',
      targetId: giftCode.id,
      metadata: { code: giftCode.code, amount, usageType, type },
    })
    return res.status(201).json(giftCode)
  } catch (e) {
    console.error('[adminConsole] gift-codes create', e)
    return res.status(400).json({
      error: e instanceof Error ? e.message : 'Création impossible',
    })
  }
})

const broadcastSegmentSchema = z.enum([
  'new_7d',
  'new_30d',
  'active_7d',
  'low_chips',
  'high_chips',
  'level_beginner',
  'level_advanced',
  'custom',
])

const broadcastFiltersSchema = z.object({
  minLevel: z.number().int().min(1).max(100).optional(),
  maxLevel: z.number().int().min(1).max(100).optional(),
  minChips: z.number().int().min(0).optional(),
  maxChips: z.number().int().min(0).optional(),
  registeredWithinDays: z.number().int().min(1).max(365).optional(),
})

const broadcastBodySchema = z.object({
  title: z.string().max(120).optional(),
  body: z.string().min(1).max(2000),
  audience: z.enum(['all', 'users', 'segment']),
  usernames: z.array(z.string().max(200)).optional(),
  usernamesText: z.string().max(5000).optional(),
  segment: broadcastSegmentSchema.optional(),
  filters: broadcastFiltersSchema.optional(),
})

function parseBroadcastAudience(body: z.infer<typeof broadcastBodySchema>): BroadcastAudience | null {
  if (body.audience === 'all') return { kind: 'all' }

  if (body.audience === 'users') {
    const fromList = body.usernames ?? []
    const fromText =
      body.usernamesText
        ?.split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean) ?? []
    return { kind: 'users', usernames: [...fromList, ...fromText] }
  }

  if (!body.segment) return null
  return {
    kind: 'segment',
    segment: body.segment as BroadcastSegment,
    filters: body.filters,
  }
}

async function handleBroadcastPreview(req: Request, res: Response) {
  const parsed = broadcastBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides' })
  }
  const audience = parseBroadcastAudience(parsed.data)
  if (!audience) {
    return res.status(400).json({ error: 'Segment requis pour une diffusion ciblée.' })
  }
  try {
    const recipientCount = await countBroadcastRecipients(audience)
    return res.json({ recipientCount })
  } catch (e) {
    console.error('[adminConsole] broadcast preview', e)
    return res.status(500).json({ error: 'Prévisualisation impossible' })
  }
}

async function handleBroadcastSend(req: Request, res: Response) {
  const parsed = broadcastBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides' })
  }
  const audience = parseBroadcastAudience(parsed.data)
  if (!audience) {
    return res.status(400).json({ error: 'Segment requis pour une diffusion ciblée.' })
  }
  try {
    const result = await sendAdminBroadcast({
      title: parsed.data.title,
      body: parsed.data.body,
      audience,
    })
    void logAdminAction(req, {
      action: 'broadcast.send',
      metadata: {
        audience: parsed.data.audience,
        segment: parsed.data.segment ?? null,
        sentCount: result.sentCount,
      },
    })
    return res.json(result)
  } catch (e) {
    if (e instanceof AdminBroadcastError) {
      return res.status(e.statusCode).json({ error: e.message, code: e.code })
    }
    console.error('[adminConsole] broadcast send', e)
    return res.status(500).json({ error: 'Envoi impossible' })
  }
}

router.post('/broadcast/preview', handleBroadcastPreview)
router.post('/broadcast', handleBroadcastSend)

router.get('/audit-logs', async (req, res) => {
  const take = Math.min(200, Math.max(1, parseInt(String(req.query.take ?? '50'), 10) || 50))
  const skip = Math.max(0, parseInt(String(req.query.skip ?? '0'), 10) || 0)
  const action = typeof req.query.action === 'string' ? req.query.action.trim() : undefined
  try {
    const logs = await listAdminAuditLogs({ take, skip, action: action || undefined })
    return res.json({ logs, take, skip })
  } catch (e) {
    console.error('[adminConsole] audit-logs', e)
    return res.status(500).json({ error: 'Lecture du journal impossible' })
  }
})

router.get('/bot-analytics', async (_req: Request, res: Response) => {
  try {
    const { getBotAnalyticsSummary } = await import(
      '../poker/simulation/massSim.job.js'
    )
    const summary = await getBotAnalyticsSummary(30)
    return res.json(summary)
  } catch (e) {
    console.error('[adminConsole] bot-analytics', e)
    return res.status(500).json({ error: 'Lecture analytics bots impossible' })
  }
})

router.use('/belote-analytics', beloteAnalyticsRoutes)

router.post('/bot-analytics/run', async (req: Request, res: Response) => {
  try {
    const tier = (req.body?.tier as string) ?? 'smoke'
    const valid = ['smoke', 'nightly', 'release'] as const
    const picked = valid.includes(tier as (typeof valid)[number])
      ? (tier as (typeof valid)[number])
      : 'smoke'
    const { runMassSimulationJob } = await import(
      '../poker/simulation/massSim.job.js'
    )
    const results = await runMassSimulationJob({ tier: picked, persist: true })
    return res.json({ ok: true, tier: picked, results })
  } catch (e) {
    console.error('[adminConsole] bot-analytics run', e)
    return res.status(500).json({ error: 'Simulation bots impossible' })
  }
})

export default router
