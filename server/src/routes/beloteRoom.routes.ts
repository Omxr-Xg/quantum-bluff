import express from 'express'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import type { Server } from 'socket.io'
import { prisma } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import {
  BeloteTableController,
  newBeloteGameId,
} from '../logic/belote/BeloteTableController.js'
import { DEFAULT_CONTEE_TARGET_SCORE } from '../logic/belote/conteeConstants.js'
import {
  BeloteInsufficientChipsError,
  chargeBeloteBuyIns,
  normalizeBeloteBuyIn,
} from '../logic/belote/beloteBuyIn.js'
import { normalizeBeloteVariant } from '../logic/belote/beloteVariants.js'
import { intChips } from '../utils/chips.js'
import { activeBeloteGames, persistBeloteSnapshot } from '../shared/activeBeloteGames.js'
import {
  BELOTE_STUCK_MAX_MS,
  loadBeloteTable,
  pruneBeloteGameIfStale,
  pruneInactiveBeloteWaitingRooms,
  pruneStaleBeloteInGameRooms,
  touchBeloteRoomActivity,
} from '../belote/recovery/beloteRecovery.service.js'
import { clientAvatarUrlFromUser } from '../utils/userAvatarPublic.js'
import { getGameIo } from '../sockets/gameIo.registry.js'
import { broadcastBeloteGame, syncBeloteAfterAction } from '../belote/services/beloteSettlement.service.js'
import { getBeloteGamePresentUserIds } from '../belote/services/belotePresence.service.js'
import {
  emitBeloteRoomUpdated,
  loadBeloteRoomWithSeats,
} from '../belote/services/beloteRoomEvents.service.js'
import {
  formatBeloteRoom,
  type BeloteRoomRow,
  type BeloteRoomSeatRow,
} from '../belote/services/beloteRoomFormat.js'
import {
  addBeloteBotToRoom,
  fillBeloteRoomWithBots,
  removeBeloteBotFromRoom,
} from '../belote/services/beloteRoomBots.service.js'
import { rescheduleBeloteAutoFill } from '../belote/services/beloteRoomAutoFill.service.js'
import { scheduleBeloteBotTurns } from '../belote/services/beloteBotTurns.service.js'
import { isBeloteBotId, normalizeBeloteBotDifficulty } from '../shared/beloteBots.js'

const router = express.Router()

function getIo(req: express.Request): Server | undefined {
  return (req.app.get('io') as Server | undefined) ?? getGameIo()
}

function makeJoinCode(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}

function formatRoomResponse(room: BeloteRoomRow, hostUserId?: string) {
  return formatBeloteRoom(room, hostUserId ? { hostUserId } : undefined)
}

export { emitBeloteRoomUpdated }

/** POST /create */
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    if (!name || name.length > 80) {
      return res.status(400).json({ error: 'Nom invalide' })
    }

    const visibility = req.body?.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC'
    let targetScore = Number(req.body?.targetScore)
    if (!Number.isFinite(targetScore)) targetScore = DEFAULT_CONTEE_TARGET_SCORE
    targetScore = Math.min(2000, Math.max(500, Math.floor(targetScore)))
    const buyIn = normalizeBeloteBuyIn(req.body?.buyIn)
    const variant = normalizeBeloteVariant(req.body?.variant)

    let passwordHash: string | undefined
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    if (password.length > 0) {
      if (password.length < 4 || password.length > 32) {
        return res.status(400).json({ error: 'Mot de passe invalide' })
      }
      passwordHash = await bcrypt.hash(password, 10)
    }

    const joinCode = visibility === 'PRIVATE' ? makeJoinCode() : null
    const autoFillBotsEnabled = req.body?.autoFillBotsEnabled === true
    const defaultBotDifficulty = normalizeBeloteBotDifficulty(req.body?.defaultBotDifficulty)

    const roomId = await prisma.$transaction(async (tx) => {
      const r = await tx.beloteRoom.create({
        data: {
          name,
          hostId: userId,
          visibility,
          passwordHash,
          joinCode,
          targetScore,
          buyIn,
          variant,
          status: 'WAITING',
          autoFillBotsEnabled,
          defaultBotDifficulty,
        },
      })
      await tx.beloteRoomSeat.create({
        data: { roomId: r.id, userId, position: 0, isReady: false },
      })
      return r.id
    })

    const room = await loadBeloteRoomWithSeats(roomId)
    if (!room) {
      return res.status(500).json({ error: 'Salle créée mais chargement impossible' })
    }

    const io = getIo(req)
    rescheduleBeloteAutoFill(roomId, io)
    return res.status(201).json({ room: formatRoomResponse(room as BeloteRoomRow, userId) })
  } catch (e) {
    console.error('[belote-rooms] create', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** GET / */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const io = getIo(req)
    await pruneInactiveBeloteWaitingRooms(io)

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const rooms = await prisma.beloteRoom.findMany({
      where: {
        status: 'WAITING',
        createdAt: { gte: oneHourAgo },
        OR: [
          { visibility: 'PUBLIC' },
          { hostId: userId },
          { seats: { some: { userId } } },
        ],
      },
      include: {
        seats: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                level: true,
                avatarUrl: true,
                avatarHasBinary: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    })

    return res.json({
      rooms: rooms.map((r) => formatRoomResponse(r as BeloteRoomRow)),
    })
  } catch (e) {
    console.error('[belote-rooms] list', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

const BELOTE_GAME_MAX_DURATION_MS = BELOTE_STUCK_MAX_MS

async function getBeloteFriendIds(userId: string): Promise<Set<string>> {
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
  })
  const set = new Set<string>()
  for (const f of friendships) {
    set.add(f.user1Id === userId ? f.user2Id : f.user1Id)
  }
  return set
}

/** GET /games-in-progress — parties Belote actives (ami dans la partie si salle privée) */
router.get('/games-in-progress', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const io = getIo(req)
    await pruneInactiveBeloteWaitingRooms(io)
    await pruneStaleBeloteInGameRooms(io)

    const myFriends = await getBeloteFriendIds(userId)
    const rooms = await prisma.beloteRoom.findMany({
      where: { status: 'IN_GAME', gameId: { not: null } },
      include: {
        seats: {
          include: {
            user: { select: { id: true, username: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 40,
    })

    const now = Date.now()
    const result: Array<{
      roomId: string
      roomName: string
      gameId: string
      playerCount: number
      maxPlayers: number
      phase: string
      canJoin: boolean
      canSpectate: boolean
    }> = []

    for (const room of rooms) {
      if (!room.gameId) continue

      await pruneBeloteGameIfStale(room.gameId, room.id, io)
      const fresh = await prisma.beloteRoom.findUnique({
        where: { id: room.id },
        select: { status: true, gameId: true },
      })
      if (!fresh?.gameId || fresh.status !== 'IN_GAME') continue

      const seatUserIds = room.seats
        .map((s) => s.userId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
      const userInGame = seatUserIds.includes(userId)
      const hasFriendInGame = seatUserIds.some((id) => myFriends.has(id))

      if (room.visibility === 'PRIVATE') {
        const canSeePrivate =
          userInGame ||
          room.hostId === userId ||
          myFriends.has(room.hostId) ||
          hasFriendInGame
        if (!canSeePrivate) continue
      }

      const table = await loadBeloteTable(room.gameId)
      const snap = table?.getState()

      if (!snap) continue

      const startedAt = snap?.startedAt
        ? Date.parse(snap.startedAt)
        : room.updatedAt.getTime()
      if (Number.isFinite(startedAt) && now - startedAt > BELOTE_GAME_MAX_DURATION_MS) {
        continue
      }

      const phase = snap?.phase ?? 'PLAYING'
      if (phase === 'GAME_END') continue

      const playerCount = room.seats.length
      if (playerCount === 0) continue

      const canJoin = userInGame
      const canSpectate = !userInGame

      result.push({
        roomId: room.id,
        roomName: room.name,
        gameId: room.gameId,
        playerCount,
        maxPlayers: room.maxPlayers,
        phase,
        canJoin,
        canSpectate,
      })
    }

    return res.json(result)
  } catch (e) {
    console.error('[belote-rooms] games-in-progress', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** GET /:id */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const room = await loadBeloteRoomWithSeats(req.params.id)
    if (!room) return res.status(404).json({ error: 'Salle introuvable' })
    return res.json({ room: formatRoomResponse(room as BeloteRoomRow, req.userId) })
  } catch (e) {
    console.error('[belote-rooms] get', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** POST /:id/join */
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const room = await loadBeloteRoomWithSeats(req.params.id)
    if (!room) return res.status(404).json({ error: 'Salle introuvable' })
    if (room.status !== 'WAITING') {
      return res.status(400).json({ error: 'Partie en cours' })
    }

    if (room.passwordHash) {
      const pwd = typeof req.body?.password === 'string' ? req.body.password : ''
      const ok = await bcrypt.compare(pwd, room.passwordHash)
      if (!ok) return res.status(403).json({ error: 'Mot de passe incorrect' })
    }

    if (room.visibility === 'PRIVATE') {
      const code = typeof req.body?.joinCode === 'string' ? req.body.joinCode.trim().toUpperCase() : ''
      if (room.joinCode && code !== room.joinCode && room.hostId !== userId) {
        const invited = await prisma.beloteRoomInvitation.findFirst({
          where: {
            roomId: room.id,
            receiverId: userId,
            status: 'ACCEPTED',
          },
        })
        const member = room.seats.some((s) => s.userId === userId)
        if (!invited && !member) {
          return res.status(403).json({ error: 'Code ou invitation requis' })
        }
      }
    }

    const existing = room.seats.find((s) => s.userId === userId)
    if (!existing) {
      if (room.seats.length >= room.maxPlayers) {
        return res.status(400).json({ error: 'Salle pleine' })
      }
      const me = await prisma.user.findUnique({
        where: { id: userId },
        select: { chips: true },
      })
      if (!me || intChips(me.chips) < room.buyIn) {
        return res.status(400).json({
          error: 'Solde insuffisant pour la mise d’entrée',
          code: 'INSUFFICIENT_CHIPS',
          buyIn: room.buyIn,
        })
      }
      const taken = new Set(room.seats.map((s) => s.position))
      let position = 0
      while (taken.has(position) && position < room.maxPlayers) position++
      await prisma.beloteRoomSeat.create({
        data: { roomId: room.id, userId, position, isReady: false },
      })
    }

    await touchBeloteRoomActivity(room.id)
    const refreshed = await loadBeloteRoomWithSeats(room.id)
    const io = getIo(req)
    rescheduleBeloteAutoFill(room.id, io)
    await emitBeloteRoomUpdated(room.id, io)
    return res.json({ room: formatRoomResponse(refreshed! as BeloteRoomRow, userId) })
  } catch (e) {
    console.error('[belote-rooms] join', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** POST /:id/leave */
router.post('/:id/leave', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const room = await prisma.beloteRoom.findUnique({
      where: { id: req.params.id },
      include: { seats: true },
    })
    if (!room) return res.status(404).json({ error: 'Salle introuvable' })

    await prisma.beloteRoomSeat.deleteMany({
      where: { roomId: room.id, userId },
    })

    const io = getIo(req)
    const remaining = await prisma.beloteRoomSeat.count({ where: { roomId: room.id } })
    if (remaining === 0 || (room.hostId === userId && remaining === 0)) {
      await prisma.beloteRoom.delete({ where: { id: room.id } })
      io?.to(`belote-room:${room.id}`).emit('BELOTE_ROOM_UPDATED', null)
      return res.json({ ok: true, deleted: true })
    }

    if (room.hostId === userId) {
      const nextHost = await prisma.beloteRoomSeat.findFirst({
        where: {
          roomId: room.id,
          participantType: 'HUMAN',
          userId: { not: null },
        },
        orderBy: { position: 'asc' },
      })
      if (nextHost?.userId) {
        await prisma.beloteRoom.update({
          where: { id: room.id },
          data: { hostId: nextHost.userId },
        })
      }
    }

    await touchBeloteRoomActivity(room.id)
    rescheduleBeloteAutoFill(room.id, io)
    await emitBeloteRoomUpdated(room.id, io)
    return res.json({ ok: true })
  } catch (e) {
    console.error('[belote-rooms] leave', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** POST /:id/ready */
router.post('/:id/ready', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const seat = await prisma.beloteRoomSeat.findFirst({
      where: { roomId: req.params.id, userId, participantType: 'HUMAN' },
    })
    if (!seat) return res.status(404).json({ error: 'Pas dans la salle' })

    await prisma.beloteRoomSeat.update({
      where: { id: seat.id },
      data: { isReady: !seat.isReady },
    })

    await touchBeloteRoomActivity(req.params.id)
    const io = getIo(req)
    await emitBeloteRoomUpdated(req.params.id, io)
    return res.json({ ok: true, isReady: !seat.isReady })
  } catch (e) {
    console.error('[belote-rooms] ready', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** POST /:id/start */
router.post('/:id/start', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const room = await loadBeloteRoomWithSeats(req.params.id)
    if (!room) return res.status(404).json({ error: 'Salle introuvable' })
    if (room.hostId !== userId) {
      return res.status(403).json({ error: 'Seul l’hôte peut démarrer' })
    }
    if (room.status !== 'WAITING') {
      return res.status(409).json({ error: 'Déjà démarré' })
    }
    const seats = room.seats as BeloteRoomSeatRow[]
    if (seats.length !== 4) {
      return res.status(400).json({ error: '4 joueurs requis' })
    }
    const humanSeats = seats.filter((s) => s.participantType === 'HUMAN')
    if (!humanSeats.every((s) => s.isReady)) {
      return res.status(400).json({ error: 'Tous les joueurs humains doivent être prêts' })
    }

    const gameId = newBeloteGameId()
    const players = seats.map((s) => {
      const isBot = s.participantType === 'BOT'
      const userId = isBot ? (s.botId ?? s.id) : (s.user?.id ?? s.userId ?? s.id)
      const username = isBot
        ? (s.displayName ?? 'QB Bot')
        : (s.user?.username ?? 'Joueur')
      return {
        userId,
        username,
        position: s.position,
        avatarUrl: isBot ? null : (s.avatarUrl ?? (s.user ? clientAvatarUrlFromUser(s.user) : null)),
        isBot,
      }
    })

    const humanBuyInSeats = players
      .filter((p) => !p.isBot && !isBeloteBotId(p.userId))
      .map((p) => ({ userId: p.userId, username: p.username }))

    try {
      await prisma.$transaction(async (tx) => {
        await chargeBeloteBuyIns(tx, gameId, room.id, humanBuyInSeats, room.buyIn)
        await tx.beloteRoom.update({
          where: { id: room.id },
          data: { status: 'IN_GAME', gameId },
        })
        for (const s of seats) {
          const team = s.position % 2 === 0 ? 'A' : 'B'
          await tx.beloteRoomSeat.update({
            where: { id: s.id },
            data: { team },
          })
        }
      })
    } catch (e) {
      if (e instanceof BeloteInsufficientChipsError) {
        return res.status(400).json({
          error: 'Un ou plusieurs joueurs n’ont pas assez de jetons',
          code: e.code,
          players: e.usernames,
          buyIn: room.buyIn,
        })
      }
      throw e
    }

    const table = new BeloteTableController({
      gameId,
      roomId: room.id,
      variant: room.variant,
      targetScore: room.targetScore,
      buyIn: room.buyIn,
      players,
    })

    activeBeloteGames.set(gameId, table)
    await persistBeloteSnapshot(room.id, gameId, table.getState())

    const io = getIo(req)
    await broadcastBeloteGame(io, gameId)
    await emitBeloteRoomUpdated(room.id, io)
    scheduleBeloteBotTurns(io, gameId)

    return res.json({ gameId, roomId: room.id, buyIn: room.buyIn, potTotal: table.getState().potTotal })
  } catch (e) {
    console.error('[belote-rooms] start', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** POST /:id/bots — ajouter une IA */
router.post('/:id/bots', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const result = await addBeloteBotToRoom(
      req.params.id,
      userId,
      req.body?.difficulty,
      getIo(req),
    )
    if (!result.ok) return res.status(result.status).json({ error: result.error })

    rescheduleBeloteAutoFill(req.params.id, getIo(req))
    const room = await loadBeloteRoomWithSeats(req.params.id)
    return res.json({ ok: true, room: room ? formatRoomResponse(room as BeloteRoomRow, userId) : null })
  } catch (e) {
    console.error('[belote-rooms] add-bot', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** POST /:id/bots/fill — compléter la table avec des IA */
router.post('/:id/bots/fill', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const result = await fillBeloteRoomWithBots(
      req.params.id,
      userId,
      req.body?.difficulty,
      getIo(req),
    )
    if (!result.ok) return res.status(result.status).json({ error: result.error })

    rescheduleBeloteAutoFill(req.params.id, getIo(req))
    const room = await loadBeloteRoomWithSeats(req.params.id)
    return res.json({
      ok: true,
      added: result.added,
      room: room ? formatRoomResponse(room as BeloteRoomRow, userId) : null,
    })
  } catch (e) {
    console.error('[belote-rooms] fill-bots', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** DELETE /:id/bots/:botId — retirer une IA */
router.delete('/:id/bots/:botId', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const result = await removeBeloteBotFromRoom(
      req.params.id,
      userId,
      req.params.botId,
      getIo(req),
    )
    if (!result.ok) return res.status(result.status).json({ error: result.error })

    rescheduleBeloteAutoFill(req.params.id, getIo(req))
    const room = await loadBeloteRoomWithSeats(req.params.id)
    return res.json({ ok: true, room: room ? formatRoomResponse(room as BeloteRoomRow, userId) : null })
  } catch (e) {
    console.error('[belote-rooms] remove-bot', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** POST /:id/request-join */
router.post('/:id/request-join', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const room = await prisma.beloteRoom.findUnique({ where: { id: req.params.id } })
    if (!room || room.visibility !== 'PRIVATE') {
      return res.status(400).json({ error: 'Salle non privée' })
    }

    await prisma.beloteJoinRequest.upsert({
      where: { roomId_userId: { roomId: room.id, userId } },
      create: { roomId: room.id, userId, status: 'PENDING' },
      update: { status: 'PENDING' },
    })

    const io = getIo(req)
    io?.to(`user:${room.hostId}`).emit('BELOTE_JOIN_REQUEST', { roomId: room.id, userId })

    return res.json({ ok: true })
  } catch (e) {
    console.error('[belote-rooms] request-join', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** POST /invitations */
router.post('/invitations', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const roomId = typeof req.body?.roomId === 'string' ? req.body.roomId : ''
    const receiverId = typeof req.body?.receiverId === 'string' ? req.body.receiverId : ''
    if (!roomId || !receiverId) {
      return res.status(400).json({ error: 'Paramètres invalides' })
    }

    const room = await prisma.beloteRoom.findUnique({ where: { id: roomId } })
    if (!room) return res.status(404).json({ error: 'Salle introuvable' })
    const inRoom = await prisma.beloteRoomSeat.findFirst({ where: { roomId, userId } })
    if (room.hostId !== userId && !inRoom) {
      return res.status(403).json({ error: 'Accès refusé' })
    }

    const inv = await prisma.beloteRoomInvitation.upsert({
      where: { roomId_receiverId: { roomId, receiverId } },
      create: { roomId, senderId: userId, receiverId, status: 'PENDING' },
      update: { status: 'PENDING', senderId: userId },
    })

    const io = getIo(req)
    io?.to(`user:${receiverId}`).emit('GAME_INVITATION', {
      id: inv.id,
      game: 'belote',
      roomId,
      senderId: userId,
      roomName: room.name,
    })

    return res.status(201).json({ invitationId: inv.id })
  } catch (e) {
    console.error('[belote-rooms] invite', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** POST /invitations/:invitationId/accept */
router.post('/invitations/:invitationId/accept', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const invitation = await prisma.beloteRoomInvitation.findUnique({
      where: { id: req.params.invitationId },
      include: { room: { include: { seats: true } } },
    })
    if (!invitation) return res.status(404).json({ error: 'Invitation introuvable' })
    if (invitation.receiverId !== userId) {
      return res.status(403).json({ error: 'Pas votre invitation' })
    }

    await prisma.beloteRoomInvitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' },
    })

    return res.json({ roomId: invitation.roomId })
  } catch (e) {
    console.error('[belote-rooms] accept invite', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** POST /invitations/:invitationId/reject */
router.post('/invitations/:invitationId/reject', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const invitation = await prisma.beloteRoomInvitation.findUnique({
      where: { id: req.params.invitationId },
    })
    if (!invitation) return res.status(404).json({ error: 'Invitation introuvable' })
    if (invitation.receiverId !== userId) {
      return res.status(403).json({ error: 'Pas votre invitation' })
    }

    await prisma.beloteRoomInvitation.update({
      where: { id: invitation.id },
      data: { status: 'REJECTED' },
    })

    return res.json({ ok: true })
  } catch (e) {
    console.error('[belote-rooms] reject invite', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** GET /game/:gameId/action-log — journal du pli en cours (rechargement page) */
router.get('/game/:gameId/action-log', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const table = await loadBeloteTable(req.params.gameId)
    if (!table) {
      return res.status(404).json({ error: 'Partie introuvable' })
    }

    const state = table.getState()
    const dealLogId = state.dealLogId ?? 'deal'
    const { getActionLog } = await import('../config/redis.config.js')
    const entries = await getActionLog(req.params.gameId, dealLogId)
    return res.json({ entries, dealLogId })
  } catch (e) {
    console.error('[belote-rooms] action-log', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** GET /game/:gameId/state */
router.get('/game/:gameId/state', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const io = getIo(req)
    const table = await loadBeloteTable(req.params.gameId)
    if (!table) {
      return res.status(404).json({ error: 'Partie introuvable' })
    }

    const isPlayer = table.getState().players.some((p) => p.userId === userId)
    if (isPlayer) {
      table.markReconnected(userId)
    }

    const presentUserIds = await getBeloteGamePresentUserIds(io, req.params.gameId)
    const ids = new Set(presentUserIds)
    ids.add(userId)
    return res.json({
      gameId: req.params.gameId,
      state: table.getSanitizedState(userId, !isPlayer),
      presentUserIds: [...ids],
      isSpectator: !isPlayer,
    })
  } catch (e) {
    console.error('[belote-rooms] game state', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

export { syncBeloteAfterAction }

export default router
