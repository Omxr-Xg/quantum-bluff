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
import { activeBeloteGames, persistBeloteSnapshot } from '../shared/activeBeloteGames.js'
import { clientAvatarUrlFromUser } from '../utils/userAvatarPublic.js'
import { getGameIo } from '../sockets/gameIo.registry.js'
import { broadcastBeloteGame, syncBeloteAfterAction } from '../belote/services/beloteSettlement.service.js'

const router = express.Router()

function getIo(req: express.Request): Server | undefined {
  return (req.app.get('io') as Server | undefined) ?? getGameIo()
}

function makeJoinCode(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}

type RoomWithSeats = {
  id: string
  name: string
  hostId: string
  maxPlayers: number
  visibility: 'PUBLIC' | 'PRIVATE'
  status: string
  joinCode: string | null
  targetScore: number
  gameId: string | null
  seats: Array<{
    position: number
    isReady: boolean
    team: string | null
    avatarUrl: string | null
    user: { id: string; username: string; level: number; avatarUrl?: string | null; avatarHasBinary?: boolean }
  }>
}

function formatRoom(room: RoomWithSeats) {
  return {
    id: room.id,
    name: room.name,
    hostId: room.hostId,
    maxPlayers: room.maxPlayers,
    visibility: room.visibility,
    status: room.status,
    joinCode: room.visibility === 'PRIVATE' ? room.joinCode : undefined,
    targetScore: room.targetScore,
    gameId: room.gameId,
    players: room.seats.map((s) => ({
      id: s.user.id,
      username: s.user.username,
      level: s.user.level,
      position: s.position,
      isReady: s.isReady,
      team: s.team,
      avatarUrl: s.avatarUrl ?? clientAvatarUrlFromUser(s.user),
    })),
  }
}

async function loadRoom(roomId: string) {
  return prisma.beloteRoom.findUnique({
    where: { id: roomId },
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
  })
}

export async function emitBeloteRoomUpdated(
  roomId: string,
  io?: Server,
): Promise<void> {
  const socketIo = io ?? getGameIo()
  if (!socketIo) return
  const room = await loadRoom(roomId)
  if (!room) {
    socketIo.to(`belote-room:${roomId}`).emit('BELOTE_ROOM_UPDATED', null)
    return
  }
  socketIo
    .to(`belote-room:${roomId}`)
    .emit('BELOTE_ROOM_UPDATED', formatRoom(room as RoomWithSeats))
}

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
    if (!Number.isFinite(targetScore)) targetScore = 1000
    targetScore = Math.min(2000, Math.max(500, Math.floor(targetScore)))

    let passwordHash: string | undefined
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    if (password.length > 0) {
      if (password.length < 4 || password.length > 32) {
        return res.status(400).json({ error: 'Mot de passe invalide' })
      }
      passwordHash = await bcrypt.hash(password, 10)
    }

    const joinCode = visibility === 'PRIVATE' ? makeJoinCode() : null

    const room = await prisma.$transaction(async (tx) => {
      const r = await tx.beloteRoom.create({
        data: {
          name,
          hostId: userId,
          visibility,
          passwordHash,
          joinCode,
          targetScore,
          status: 'WAITING',
        },
      })
      await tx.beloteRoomSeat.create({
        data: { roomId: r.id, userId, position: 0, isReady: false },
      })
      return loadRoom(r.id)
    })

    return res.status(201).json({ room: formatRoom(room! as RoomWithSeats) })
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
      rooms: rooms.map((r) => formatRoom(r as RoomWithSeats)),
    })
  } catch (e) {
    console.error('[belote-rooms] list', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

const BELOTE_GAME_MAX_DURATION_MS = 4 * 60 * 60 * 1000

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
    }> = []

    for (const room of rooms) {
      if (!room.gameId) continue

      const seatUserIds = room.seats.map((s) => s.userId)
      const userInGame = seatUserIds.includes(userId)
      const hasFriendInGame = seatUserIds.some((id) => myFriends.has(id))

      if (!userInGame && !hasFriendInGame) continue

      if (room.visibility === 'PRIVATE' && !userInGame) {
        if (room.hostId !== userId && !myFriends.has(room.hostId) && !hasFriendInGame) {
          continue
        }
      }

      const table = activeBeloteGames.getSync(room.gameId)
      const snap = table
        ? table.getState()
        : (
            await prisma.beloteGameSnapshot.findFirst({
              where: { gameId: room.gameId },
            })
          )?.snapshot as import('../logic/belote/types.js').BeloteGameState | undefined

      if (!table && !snap) continue

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

      result.push({
        roomId: room.id,
        roomName: room.name,
        gameId: room.gameId,
        playerCount,
        maxPlayers: room.maxPlayers,
        phase,
        canJoin,
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
    const room = await loadRoom(req.params.id)
    if (!room) return res.status(404).json({ error: 'Salle introuvable' })
    return res.json({ room: formatRoom(room as RoomWithSeats) })
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

    const room = await loadRoom(req.params.id)
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
      const taken = new Set(room.seats.map((s) => s.position))
      let position = 0
      while (taken.has(position) && position < room.maxPlayers) position++
      await prisma.beloteRoomSeat.create({
        data: { roomId: room.id, userId, position, isReady: false },
      })
    }

    const refreshed = await loadRoom(room.id)
    const io = getIo(req)
    await emitBeloteRoomUpdated(room.id, io)
    return res.json({ room: formatRoom(refreshed! as RoomWithSeats) })
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
        where: { roomId: room.id },
        orderBy: { position: 'asc' },
      })
      if (nextHost) {
        await prisma.beloteRoom.update({
          where: { id: room.id },
          data: { hostId: nextHost.userId },
        })
      }
    }

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
      where: { roomId: req.params.id, userId },
    })
    if (!seat) return res.status(404).json({ error: 'Pas dans la salle' })

    await prisma.beloteRoomSeat.update({
      where: { id: seat.id },
      data: { isReady: !seat.isReady },
    })

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

    const room = await loadRoom(req.params.id)
    if (!room) return res.status(404).json({ error: 'Salle introuvable' })
    if (room.hostId !== userId) {
      return res.status(403).json({ error: 'Seul l’hôte peut démarrer' })
    }
    if (room.status !== 'WAITING') {
      return res.status(409).json({ error: 'Déjà démarré' })
    }
    if (room.seats.length !== 4) {
      return res.status(400).json({ error: '4 joueurs requis' })
    }
    if (!room.seats.every((s) => s.isReady)) {
      return res.status(400).json({ error: 'Tous les joueurs doivent être prêts' })
    }

    const gameId = newBeloteGameId()
    const players = room.seats.map((s) => ({
      userId: s.user.id,
      username: s.user.username,
      position: s.position,
    }))

    const table = new BeloteTableController({
      gameId,
      roomId: room.id,
      targetScore: room.targetScore,
      players,
    })

    activeBeloteGames.set(gameId, table)
    await persistBeloteSnapshot(room.id, gameId, table.getState())

    for (const s of room.seats) {
      const team = s.position % 2 === 0 ? 'A' : 'B'
      await prisma.beloteRoomSeat.update({
        where: { roomId_userId: { roomId: room.id, userId: s.user.id } },
        data: { team },
      })
    }

    await prisma.beloteRoom.update({
      where: { id: room.id },
      data: { status: 'IN_GAME', gameId },
    })

    const io = getIo(req)
    broadcastBeloteGame(io, gameId)
    await emitBeloteRoomUpdated(room.id, io)

    return res.json({ gameId, roomId: room.id })
  } catch (e) {
    console.error('[belote-rooms] start', e)
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

/** GET /game/:gameId/state */
router.get('/game/:gameId/state', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const table = activeBeloteGames.getSync(req.params.gameId)
    if (table) {
      return res.json({
        gameId: req.params.gameId,
        state: table.getSanitizedState(userId),
      })
    }

    const snap = await prisma.beloteGameSnapshot.findFirst({
      where: { gameId: req.params.gameId },
    })
    if (!snap) {
      return res.status(404).json({ error: 'Partie introuvable' })
    }

    const raw = snap.snapshot as import('../logic/belote/types.js').BeloteGameState
    const ctrl = BeloteTableController.fromSnapshot(raw)
    activeBeloteGames.set(req.params.gameId, ctrl)
    return res.json({
      gameId: req.params.gameId,
      state: ctrl.getSanitizedState(userId),
    })
  } catch (e) {
    console.error('[belote-rooms] game state', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

export { syncBeloteAfterAction }

export default router
