import express from 'express'
import type { Server } from 'socket.io'
import { prisma } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import rateLimit from 'express-rate-limit'

const router = express.Router()

const invitationSendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop d’invitations envoyées. Réessaie plus tard.' }
})

const invitationReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
})

const invitationRespondLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
})

router.use(authMiddleware)

// POST /api/invitations/send - Envoyer une invitation
router.post('/send', invitationSendLimiter, async (req, res) => {
  const senderId = req.userId!
  const { roomId, receiverId } = req.body as { roomId?: string; receiverId?: string }

  if (!roomId || !receiverId) {
    return res.status(400).json({ error: 'roomId et receiverId requis' })
  }

  if (senderId === receiverId) {
    return res.status(400).json({ error: 'Impossible de s\'inviter soi-même' })
  }

  try {
    const room = await prisma.waitingRoom.findUnique({
      where: { id: roomId },
      include: { players: true },
    })

    if (!room) return res.status(404).json({ error: 'Salle introuvable' })
    if (room.status !== 'WAITING') return res.status(400).json({ error: 'La partie a déjà commencé' })
    if (room.hostId !== senderId) return res.status(403).json({ error: 'Seul l\'hôte peut inviter' })

    const alreadyInRoom = room.players.some((p) => p.userId === receiverId)
    if (alreadyInRoom) return res.status(400).json({ error: 'Le joueur est déjà dans la salle' })

    const invitation = await prisma.gameInvitation.upsert({
      where: { roomId_receiverId: { roomId, receiverId } },
      create: { roomId, senderId, receiverId, status: 'PENDING' },
      update: { status: 'PENDING', senderId },
      include: {
        sender: { select: { id: true, username: true } },
        room: { select: { id: true, name: true } },
      },
    })

    const io = req.app.get('io') as Server | undefined
    if (io) {
      io.to(`user:${receiverId}`).emit('GAME_INVITATION_RECEIVED', {
        invitationId: invitation.id,
        roomId: invitation.roomId,
        roomName: invitation.room.name,
        sender: invitation.sender,
      })
    }

    res.json(invitation)
  } catch (error) {
    console.error('POST /api/invitations/send error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/invitations/received - Invitations reçues (en attente)
router.get('/received', invitationReadLimiter, async (req, res) => {
  const userId = req.userId!

  try {
    const invitations = await prisma.gameInvitation.findMany({
      where: { receiverId: userId, status: 'PENDING' },
      include: {
        sender: { select: { id: true, username: true, level: true } },
        room: { select: { id: true, name: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const active = invitations.filter((inv) => inv.room.status === 'WAITING')
    res.json(active)
  } catch (error) {
    console.error('GET /api/invitations/received error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/invitations/:id/accept - Accepter une invitation
router.post('/:id/accept', invitationRespondLimiter, async (req, res) => {
  const userId = req.userId!
  const { id } = req.params

  try {
    const invitation = await prisma.gameInvitation.findUnique({
      where: { id },
      include: { room: { include: { players: true } } },
    })

    if (!invitation) return res.status(404).json({ error: 'Invitation introuvable' })
    if (invitation.receiverId !== userId) return res.status(403).json({ error: 'Pas votre invitation' })
    if (invitation.status !== 'PENDING') return res.status(400).json({ error: 'Invitation déjà traitée' })
    if (invitation.room.status !== 'WAITING') return res.status(400).json({ error: 'La partie a déjà commencé' })
    if (invitation.room.players.length >= invitation.room.maxPlayers) {
      return res.status(400).json({ error: 'Salle pleine' })
    }

    const alreadyIn = invitation.room.players.some((p) => p.userId === userId)
    if (!alreadyIn) {
      await prisma.roomPlayer.create({
        data: {
          roomId: invitation.roomId,
          userId,
          isReady: false,
          position: invitation.room.players.length,
        },
      })
    }

    await prisma.gameInvitation.update({
      where: { id },
      data: { status: 'ACCEPTED' },
    })

    const io = req.app.get('io') as Server | undefined
    if (io) {
      io.to(`user:${invitation.senderId}`).emit('INVITATION_ACCEPTED', {
        invitationId: id,
        userId,
      })
    }

    res.json({ roomId: invitation.roomId })
  } catch (error) {
    console.error('POST /api/invitations/:id/accept error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/invitations/:id/reject - Refuser une invitation
router.post('/:id/reject', invitationRespondLimiter, async (req, res) => {
  const userId = req.userId!
  const { id } = req.params

  try {
    const invitation = await prisma.gameInvitation.findUnique({ where: { id } })
    if (!invitation) return res.status(404).json({ error: 'Invitation introuvable' })
    if (invitation.receiverId !== userId) return res.status(403).json({ error: 'Pas votre invitation' })

    await prisma.gameInvitation.update({
      where: { id },
      data: { status: 'REJECTED' },
    })

    const io = req.app.get('io') as Server | undefined
    if (io) {
      io.to(`user:${invitation.senderId}`).emit('INVITATION_REJECTED', {
        invitationId: id,
        userId,
      })
    }

    res.json({ ok: true })
  } catch (error) {
    console.error('POST /api/invitations/:id/reject error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router