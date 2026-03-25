import express from 'express'
import type { Server } from 'socket.io'
import { prisma } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { intChips } from '../utils/chips.js'
import {
  validateBlackjackBet,
  BLACKJACK_MAX_BET_CAP,
} from '../logic/blackjack.js'
import {
  BlackjackTableController,
  type BlackjackTablePublicState,
} from '../logic/BlackjackTableController.js'
import { activeBlackjackGames } from '../shared/activeBlackjackGames.js'
import {
  awardXpInTransaction,
  getEffectiveBlackjackMaxBet,
  levelFromExperience,
  XP_BLACKJACK_HAND,
  XP_BLACKJACK_WIN_BONUS,
} from '../logic/gamification.js'

const router = express.Router()

/** Révélation des cartes croupier + résultats (sync client animation). */
const ROUND_REVEAL_MS = 3000

type BjRoundSummaryRow = {
  userId: string
  username: string
  payout: number
  reason: string
}

function getIo(req: express.Request): Server | undefined {
  return req.app.get('io') as Server | undefined
}

function broadcastTable(
  gameId: string,
  table: BlackjackTableController,
  io?: Server,
  options?: { roundSummary?: BjRoundSummaryRow[] }
) {
  if (!io) return
  const state = table.toPublicState()
  const payload: {
    gameId: string
    state: BlackjackTablePublicState
    roundSummary?: BjRoundSummaryRow[]
  } = { gameId, state }
  if (options?.roundSummary?.length) {
    payload.roundSummary = options.roundSummary
  }
  io.to(gameId).emit('BLACKJACK_TABLE_UPDATE', payload)
}

async function payoutAndFinish(
  table: BlackjackTableController,
  io: Server | undefined
): Promise<{ settlements: unknown[]; roundSummary: BjRoundSummaryRow[] }> {
  const rows = table.computeSettlements()
  const settlements: unknown[] = []
  const roundSummary: BjRoundSummaryRow[] = rows.map((r) => ({
    userId: r.userId,
    username: r.username,
    payout: r.payout,
    reason: r.reason,
  }))

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const { userId, totalBet, payout, reason, username } = row
      const updated = await tx.user.update({
        where: { id: userId },
        data: { chips: { increment: payout } },
        select: { chips: true, experience: true },
      })

      const prevCasino = await tx.casinoStats.findUnique({ where: { userId } })
      if (!prevCasino) {
        await tx.casinoStats.create({
          data: {
            userId,
            blackjackHandsPlayed: 1,
            blackjackBiggestWin: payout,
          },
        })
      } else {
        await tx.casinoStats.update({
          where: { userId },
          data: {
            blackjackHandsPlayed: { increment: 1 },
            blackjackBiggestWin: Math.max(payout, prevCasino.blackjackBiggestWin),
          },
        })
      }

      const winBonus = payout > totalBet ? XP_BLACKJACK_WIN_BONUS : 0
      const gamification = await awardXpInTransaction(
        tx,
        userId,
        XP_BLACKJACK_HAND + winBonus
      )
      const lvl = levelFromExperience(updated.experience)
      settlements.push({
        userId,
        username,
        payout,
        reason,
        chips: intChips(updated.chips),
        experience: gamification.experience,
        level: gamification.level,
        xpToNext: gamification.xpToNext,
        newBadges: gamification.newBadges,
        maxBetBlackjack: getEffectiveBlackjackMaxBet(lvl),
      })
    }
  })

  const gameId = table.gameId
  broadcastTable(gameId, table, io, { roundSummary })

  setTimeout(() => {
    const t = activeBlackjackGames.get(gameId)
    if (!t || t.phase !== 'payout') return
    t.finishHandAfterPayout()
    broadcastTable(gameId, t, io)
  }, ROUND_REVEAL_MS)

  return { settlements, roundSummary }
}

async function maybeRunDealerAndPayout(
  table: BlackjackTableController,
  io: Server | undefined
): Promise<{ settlements: unknown[]; roundSummary: BjRoundSummaryRow[] } | null> {
  if (table.phase !== 'dealer') return null
  table.runDealerDraws()
  return payoutAndFinish(table, io)
}

/** POST / — créer une salle */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    if (!name || name.length > 80) {
      return res.status(400).json({ error: 'Nom invalide' })
    }

    let maxSeats = Number(req.body?.maxSeats)
    if (!Number.isFinite(maxSeats)) maxSeats = 5
    maxSeats = Math.floor(maxSeats)
    if (maxSeats < 2 || maxSeats > 7) {
      return res.status(400).json({ error: 'maxSeats doit être entre 2 et 7' })
    }

    const visibility =
      req.body?.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC'

    let minBet = Number(req.body?.minBet)
    if (!Number.isFinite(minBet)) minBet = 10
    minBet = Math.floor(minBet)
    if (minBet < 10) minBet = 10

    const room = await prisma.$transaction(async (tx) => {
      const r = await tx.blackjackRoom.create({
        data: {
          name,
          hostId: userId,
          maxSeats,
          visibility,
          minBet,
          status: 'WAITING',
        },
      })
      await tx.blackjackRoomSeat.create({
        data: { roomId: r.id, userId, position: 0, isReady: true },
      })
      return tx.blackjackRoom.findUniqueOrThrow({
        where: { id: r.id },
        include: {
          seats: { include: { user: { select: { id: true, username: true } } } },
        },
      })
    })

    return res.status(201).json({ room })
  } catch (e) {
    console.error('blackjackMulti POST /', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** GET / — liste des salles */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const rooms = await prisma.blackjackRoom.findMany({
      where: {
        OR: [
          { visibility: 'PUBLIC' },
          { hostId: userId },
          { seats: { some: { userId } } },
        ],
      },
      include: {
        seats: { include: { user: { select: { id: true, username: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return res.json({ rooms })
  } catch (e) {
    console.error('blackjackMulti GET /', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** POST /invitations/:invitationId/accept — invitation table blackjack */
router.post('/invitations/:invitationId/accept', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const { invitationId } = req.params

    const invitation = await prisma.blackjackRoomInvitation.findUnique({
      where: { id: invitationId },
      include: {
        room: { include: { seats: true } },
      },
    })
    if (!invitation) return res.status(404).json({ error: 'Invitation introuvable' })
    if (invitation.receiverId !== userId) {
      return res.status(403).json({ error: 'Pas votre invitation' })
    }
    if (invitation.status !== 'PENDING') {
      return res.status(400).json({ error: 'Invitation déjà traitée' })
    }

    const room = invitation.room
    if (room.status !== 'WAITING') {
      return res.status(400).json({ error: 'La partie a déjà commencé' })
    }
    if (room.seats.length >= room.maxSeats) {
      return res.status(400).json({ error: 'Table pleine' })
    }

    const existing = room.seats.find((s) => s.userId === userId)
    if (!existing) {
      const taken = new Set(room.seats.map((s) => s.position))
      let position = 0
      while (taken.has(position) && position < room.maxSeats) position++
      if (position >= room.maxSeats) {
        return res.status(400).json({ error: 'Table pleine' })
      }
      await prisma.blackjackRoomSeat.create({
        data: { roomId: room.id, userId, position },
      })
    }

    await prisma.blackjackRoomInvitation.update({
      where: { id: invitationId },
      data: { status: 'ACCEPTED' },
    })

    const io = getIo(req)
    if (io) {
      io.to(`user:${invitation.senderId}`).emit('BLACKJACK_INVITATION_ACCEPTED', {
        invitationId,
        userId,
        blackjackRoomId: room.id,
      })
    }

    return res.json({ roomId: room.id })
  } catch (e) {
    console.error('blackjackMulti invitations accept', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** POST /invitations/:invitationId/reject */
router.post('/invitations/:invitationId/reject', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const { invitationId } = req.params

    const invitation = await prisma.blackjackRoomInvitation.findUnique({
      where: { id: invitationId },
    })
    if (!invitation) return res.status(404).json({ error: 'Invitation introuvable' })
    if (invitation.receiverId !== userId) {
      return res.status(403).json({ error: 'Pas votre invitation' })
    }
    if (invitation.status === 'PENDING') {
      await prisma.blackjackRoomInvitation.update({
        where: { id: invitationId },
        data: { status: 'REJECTED' },
      })
    }
    return res.json({ ok: true })
  } catch (e) {
    console.error('blackjackMulti invitations reject', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** DELETE /:roomId — hôte : supprime la salle (attente ou partie en cours) */
router.delete('/:roomId', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const room = await prisma.blackjackRoom.findUnique({
      where: { id: req.params.roomId },
    })
    if (!room) return res.status(404).json({ error: 'Salle introuvable' })
    if (room.hostId !== userId) {
      return res.status(403).json({ error: 'Seul l’hôte peut supprimer la table' })
    }

    if (room.gameId) {
      activeBlackjackGames.delete(room.gameId)
    }
    await prisma.blackjackRoom.delete({ where: { id: room.id } })
    return res.json({ deleted: true })
  } catch (e) {
    console.error('blackjackMulti DELETE /:roomId', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** GET /:roomId */
router.get('/:roomId', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const room = await prisma.blackjackRoom.findUnique({
      where: { id: req.params.roomId },
      include: {
        seats: { include: { user: { select: { id: true, username: true } } } },
      },
    })
    if (!room) return res.status(404).json({ error: 'Salle introuvable' })

    if (room.visibility === 'PRIVATE' && room.hostId !== userId) {
      const seated = room.seats.some((s) => s.userId === userId)
      if (!seated) return res.status(403).json({ error: 'Salle privée' })
    }

    return res.json({ room })
  } catch (e) {
    console.error('blackjackMulti GET /:roomId', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** POST /:roomId/join — prendre un siège libre */
router.post('/:roomId/join', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const room = await prisma.blackjackRoom.findUnique({
      where: { id: req.params.roomId },
      include: { seats: true },
    })
    if (!room) return res.status(404).json({ error: 'Salle introuvable' })
    if (room.status !== 'WAITING') {
      return res.status(409).json({ error: 'La partie a déjà commencé' })
    }

    const existing = room.seats.find((s) => s.userId === userId)
    if (existing) {
      return res.json({ seat: existing, roomId: room.id })
    }

    if (room.seats.length >= room.maxSeats) {
      return res.status(409).json({ error: 'Table pleine' })
    }

    const taken = new Set(room.seats.map((s) => s.position))
    let position = 0
    while (taken.has(position) && position < room.maxSeats) position++
    if (position >= room.maxSeats) {
      return res.status(409).json({ error: 'Table pleine' })
    }

    const seat = await prisma.blackjackRoomSeat.create({
      data: { roomId: room.id, userId, position },
    })

    return res.status(201).json({ seat, roomId: room.id })
  } catch (e) {
    console.error('blackjackMulti join', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** POST /:roomId/leave */
router.post('/:roomId/leave', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const room = await prisma.blackjackRoom.findUnique({
      where: { id: req.params.roomId },
    })
    if (!room) return res.status(404).json({ error: 'Salle introuvable' })

    if (room.status === 'PLAYING' && room.gameId) {
      const table = activeBlackjackGames.get(room.gameId)
      if (table && table.phase !== 'betting') {
        return res.status(409).json({ error: 'Impossible de quitter pendant une main' })
      }
    }

    await prisma.blackjackRoomSeat.deleteMany({
      where: { roomId: room.id, userId },
    })

    const remainingSeats = await prisma.blackjackRoomSeat.count({
      where: { roomId: room.id },
    })
    if (remainingSeats === 0) {
      if (room.gameId) activeBlackjackGames.delete(room.gameId)
      await prisma.blackjackRoom.delete({ where: { id: room.id } })
      return res.json({ left: true, roomDeleted: true })
    }

    if (room.hostId === userId) {
      const nextHost = await prisma.blackjackRoomSeat.findFirst({
        where: { roomId: room.id },
        orderBy: { joinedAt: 'asc' },
      })
      if (nextHost) {
        await prisma.blackjackRoom.update({
          where: { id: room.id },
          data: { hostId: nextHost.userId },
        })
      }
    }

    return res.json({ left: true })
  } catch (e) {
    console.error('blackjackMulti leave', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** PATCH /:roomId/ready */
router.patch('/:roomId/ready', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const ready = Boolean(req.body?.ready)

    const seat = await prisma.blackjackRoomSeat.updateMany({
      where: { roomId: req.params.roomId, userId },
      data: { isReady: ready },
    })
    if (seat.count === 0) {
      return res.status(404).json({ error: 'Siège introuvable' })
    }

    return res.json({ ok: true, ready })
  } catch (e) {
    console.error('blackjackMulti ready', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** POST /:roomId/start — hôte : démarre la table (gameId + contrôleur mémoire) */
router.post('/:roomId/start', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const room = await prisma.blackjackRoom.findUnique({
      where: { id: req.params.roomId },
      include: {
        seats: { include: { user: { select: { id: true, username: true } } } },
      },
    })
    if (!room) return res.status(404).json({ error: 'Salle introuvable' })
    if (room.hostId !== userId) {
      return res.status(403).json({ error: 'Seul l’hôte peut démarrer' })
    }
    if (room.status !== 'WAITING') {
      return res.status(409).json({ error: 'Déjà démarré' })
    }
    if (room.seats.length < 1) {
      return res.status(400).json({ error: 'Au moins un joueur requis' })
    }

    if (room.seats.length > 1) {
      const allReady = room.seats.every((s) => s.isReady)
      if (!allReady) {
        return res.status(400).json({ error: 'Tous les joueurs doivent être prêts' })
      }
    }

    const gameId = `bj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`

    const members = room.seats.map((s) => ({
      userId: s.userId,
      username: s.user.username,
      position: s.position,
    }))

    const table = new BlackjackTableController({
      gameId,
      roomId: room.id,
      maxSeats: room.maxSeats,
      minBet: room.minBet,
      members,
    })

    activeBlackjackGames.set(gameId, table)

    await prisma.blackjackRoom.update({
      where: { id: room.id },
      data: { status: 'PLAYING', gameId },
    })

    const io = getIo(req)
    broadcastTable(gameId, table, io)

    return res.json({ gameId, roomId: room.id, state: table.toPublicState() })
  } catch (e) {
    console.error('blackjackMulti start', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** GET /game/:gameId/state */
router.get('/game/:gameId/state', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const table = activeBlackjackGames.get(req.params.gameId)
    if (!table) {
      return res.status(410).json({ error: 'Table inactive ou serveur redémarré' })
    }

    const room = await prisma.blackjackRoom.findFirst({
      where: { gameId: req.params.gameId },
    })
    if (!room) {
      return res.status(410).json({ error: 'Salle introuvable' })
    }

    if (room.visibility === 'PRIVATE' && room.hostId !== userId) {
      const seated = await prisma.blackjackRoomSeat.findFirst({
        where: { roomId: room.id, userId },
      })
      if (!seated) {
        return res.status(403).json({ error: 'Accès refusé' })
      }
    }

    return res.json({
      state: table.toPublicState(userId),
      hostId: room.hostId,
      roomId: room.id,
    })
  } catch (e) {
    console.error('blackjackMulti state', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** POST /game/:gameId/bet */
router.post('/game/:gameId/bet', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const table = activeBlackjackGames.get(req.params.gameId)
    if (!table) return res.status(410).json({ error: 'Table inactive' })

    if (table.phase !== 'betting') {
      return res.status(409).json({ error: 'Phase de mise terminée' })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { chips: true, experience: true },
    })
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

    const lvl = levelFromExperience(user.experience)
    const maxBetEffective = Math.min(
      BLACKJACK_MAX_BET_CAP,
      getEffectiveBlackjackMaxBet(lvl)
    )
    const chipsBefore = intChips(user.chips)

    const preview = validateBlackjackBet(
      req.body?.bet,
      chipsBefore,
      maxBetEffective
    )
    if (!preview.ok) {
      return res.status(400).json({ error: preview.code, code: preview.code })
    }
    if (preview.bet < table.minBet) {
      return res.status(400).json({ error: 'BET_TOO_LOW', code: 'BET_TOO_LOW' })
    }

    const seat = table.seats.find((s) => s.userId === userId)
    if (!seat || seat.playState !== 'no_bet') {
      return res.status(400).json({ error: 'Pas de mise possible pour ce siège' })
    }

    const upd = await prisma.user.updateMany({
      where: { id: userId, chips: { gte: preview.bet } },
      data: { chips: { decrement: preview.bet } },
    })
    if (upd.count === 0) {
      return res.status(409).json({ error: 'INSUFFICIENT_CHIPS', code: 'INSUFFICIENT_CHIPS' })
    }

    seat.bet = preview.bet
    seat.totalBet = preview.bet
    seat.playState = 'bet_placed'

    const io = getIo(req)
    broadcastTable(table.gameId, table, io)

    const fresh = await prisma.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })

    return res.json({
      ok: true,
      bet: preview.bet,
      chips: intChips(fresh?.chips ?? 0),
      state: table.toPublicState(userId),
    })
  } catch (e) {
    console.error('blackjackMulti bet', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** POST /game/:gameId/deal — hôte uniquement */
router.post('/game/:gameId/deal', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const table = activeBlackjackGames.get(req.params.gameId)
    if (!table) return res.status(410).json({ error: 'Table inactive' })

    const room = await prisma.blackjackRoom.findFirst({
      where: { gameId: table.gameId },
    })
    if (!room || room.hostId !== userId) {
      return res.status(403).json({ error: 'Seul l’hôte peut distribuer' })
    }

    const d = table.deal()
    if (!d.ok) {
      return res.status(400).json({ error: d.code, code: d.code })
    }

    const io = getIo(req)
    const extra = await maybeRunDealerAndPayout(table, io)
    if (!extra) {
      broadcastTable(table.gameId, table, io)
    }

    return res.json({
      ok: true,
      state: table.toPublicState(userId),
      settlements: extra?.settlements,
      roundSummary: extra?.roundSummary,
    })
  } catch (e) {
    console.error('blackjackMulti deal', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** POST /game/:gameId/action */
router.post('/game/:gameId/action', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const action = req.body?.action
    if (action !== 'hit' && action !== 'stand' && action !== 'double') {
      return res.status(400).json({ error: 'Action invalide' })
    }

    const table = activeBlackjackGames.get(req.params.gameId)
    if (!table) return res.status(410).json({ error: 'Table inactive' })

    let doubleExtraDebited = 0
    if (action === 'double') {
      const idx = table.currentSeatIndex
      const seat = table.seats[idx]
      if (!seat || seat.userId !== userId) {
        return res.status(400).json({ error: 'NOT_YOUR_TURN' })
      }
      if (seat.hand.length !== 2) {
        return res.status(400).json({ error: 'DOUBLE_NOT_ALLOWED' })
      }
      const extra = seat.bet
      const upd = await prisma.user.updateMany({
        where: { id: userId, chips: { gte: extra } },
        data: { chips: { decrement: extra } },
      })
      if (upd.count === 0) {
        return res.status(409).json({ error: 'INSUFFICIENT_CHIPS', code: 'INSUFFICIENT_CHIPS' })
      }
      doubleExtraDebited = extra
    }

    const r = table.playerAction(userId, action)
    if (!r.ok) {
      if (doubleExtraDebited > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: { chips: { increment: doubleExtraDebited } },
        })
      }
      return res.status(400).json({ error: r.code, code: r.code })
    }

    const io = getIo(req)
    const extra = await maybeRunDealerAndPayout(table, io)
    if (!extra) {
      broadcastTable(table.gameId, table, io)
    }

    const fresh = await prisma.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })

    return res.json({
      ok: true,
      chips: intChips(fresh?.chips ?? 0),
      state: table.toPublicState(userId),
      settlements: extra?.settlements,
      roundSummary: extra?.roundSummary,
    })
  } catch (e) {
    console.error('blackjackMulti action', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
