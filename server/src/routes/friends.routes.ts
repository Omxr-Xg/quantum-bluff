import express from 'express'
import type { Server } from 'socket.io'
import sanitizeHtml from 'sanitize-html'
import { prisma } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { searchUserSchema, friendRequestSchema, updateRequestSchema } from '../validation/friends.validation.js'

const router = express.Router()

router.use(authMiddleware)

// Messages: défini et monté EN PREMIER pour éviter que "messages" soit capté par /:userId
const messagesRouter = express.Router({ mergeParams: true })
messagesRouter.get('/', async (req, res) => {
  const userId = String(req.userId ?? '').trim()
  const { friendId } = req.query
  if (!userId) return res.status(401).json({ error: 'Non authentifié' })
  if (typeof friendId !== 'string') return res.status(400).json({ error: 'friendId requis' })
  const friendIdStr = String(friendId).trim()
  try {
    type FriendshipMin = { user1Id: string; user2Id: string }
    let friendship: FriendshipMin | null = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: userId, user2Id: friendIdStr },
          { user1Id: friendIdStr, user2Id: userId }
        ]
      }
    })
    if (!friendship) {
      const userFriendships = await prisma.friendship.findMany({
        where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
        select: { user1Id: true, user2Id: true }
      })
      friendship = userFriendships.find(
        (f) =>
          (String(f.user1Id) === String(userId) && String(f.user2Id) === String(friendIdStr)) ||
          (String(f.user2Id) === String(userId) && String(f.user1Id) === String(friendIdStr))
      ) ?? null
    }
    if (!friendship) {
      // Temporaire: retourner [] au lieu de 403 pour déboguer
      console.warn('[GET /messages] Amitié non trouvée, retour []', { userId, friendId: friendIdStr })
      return res.json([])
    }
    const messages = await prisma.friendMessage.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: friendIdStr },
          { senderId: friendIdStr, receiverId: userId }
        ]
      },
      include: {
        sender: { select: { id: true, username: true } },
        receiver: { select: { id: true, username: true } }
      },
      orderBy: { createdAt: 'asc' },
      take: 200
    })
    res.json(messages)
  } catch (error) {
    console.error('GET /api/friends/messages error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})
messagesRouter.post('/', async (req, res) => {
  const senderId = String(req.userId!)
  const { receiverId, content } = req.body
  if (typeof receiverId !== 'string' || typeof content !== 'string') {
    return res.status(400).json({ error: 'receiverId et content requis' })
  }
  const receiverIdStr = String(receiverId)
  const trimmed = content.trim()
  if (!trimmed || trimmed.length > 2000) {
    return res.status(400).json({ error: 'Message vide ou trop long (max 2000 caractères)' })
  }
  try {
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: senderId, user2Id: receiverIdStr },
          { user1Id: receiverIdStr, user2Id: senderId }
        ]
      }
    })
    if (!friendship) return res.status(403).json({ error: 'Vous ne pouvez discuter qu\'avec vos amis' })
    const safeContent = sanitizeHtml(trimmed, { allowedTags: [], allowedAttributes: {} })
    const message = await prisma.friendMessage.create({
      data: { senderId, receiverId: receiverIdStr, content: safeContent },
      include: {
        sender: { select: { id: true, username: true } },
        receiver: { select: { id: true, username: true } }
      }
    })
    const io = req.app.get('io') as Server | undefined
    if (io) {
      io.to(`user:${receiverIdStr}`).emit('FRIEND_MESSAGE', {
        id: message.id,
        senderId: message.senderId,
        receiverId: message.receiverId,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        sender: message.sender,
        receiver: message.receiver
      })
    }
    res.json(message)
  } catch (error) {
    console.error('POST /api/friends/messages error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})
router.use('/messages', messagesRouter)

// Debug: GET /api/friends/debug/my-friendships - retourne les amitiés du user connecté
router.get('/debug/my-friendships', async (req, res) => {
  const userId = String(req.userId ?? '').trim()
  if (!userId) return res.status(401).json({ error: 'Non authentifié' })
  try {
    const friendships = await prisma.friendship.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      select: { user1Id: true, user2Id: true }
    })
    const friendIds = friendships.map((f) =>
      String(f.user1Id) === String(userId) ? f.user2Id : f.user1Id
    )
    return res.json({ userId, friendships, friendIds })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: String(e) })
  }
})

// SEARCH USERS
router.get('/search', async (req, res) => {
  const parsed = searchUserSchema.safeParse(req.query)

  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid search query' })
  }

  let { query } = parsed.data
  query = sanitizeHtml(query)

  try {
    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: query,
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        username: true,
        level: true,
        playerStats: {
          select: {
            totalWins: true,
            totalGames: true
          }
        }
      },
      take: 10
    })

    res.json(users)
  } catch (error) {
    console.error('GET /api/friends/search error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// SEND FRIEND REQUEST
router.post('/request', async (req, res) => {
  const senderId = req.userId!

  const parsed = friendRequestSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues })
  }

  let { receiverUsername } = parsed.data
  receiverUsername = sanitizeHtml(receiverUsername)

  try {
    const receiver = await prisma.user.findUnique({
      where: { username: receiverUsername }
    })

    if (!receiver) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }

    if (receiver.id === senderId) {
      return res.status(400).json({ error: 'Impossible de s’ajouter soi-même' })
    }

    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: senderId, user2Id: receiver.id },
          { user1Id: receiver.id, user2Id: senderId }
        ]
      }
    })

    if (existingFriendship) {
      return res.status(400).json({ error: 'Déjà amis' })
    }

    const existingPendingEitherWay = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId: receiver.id, status: 'PENDING' },
          { senderId: receiver.id, receiverId: senderId, status: 'PENDING' }
        ]
      }
    })

    if (existingPendingEitherWay) {
      return res.status(400).json({ error: 'Une demande existe déjà' })
    }

    const existingSameDirection = await prisma.friendRequest.findFirst({
      where: {
        senderId,
        receiverId: receiver.id
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            level: true
          }
        }
      }
    })

    let request

    if (existingSameDirection) {
      request = await prisma.friendRequest.update({
        where: { id: existingSameDirection.id },
        data: {
          status: 'PENDING'
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              level: true
            }
          }
        }
      })
    } else {
      request = await prisma.friendRequest.create({
        data: {
          senderId,
          receiverId: receiver.id,
          status: 'PENDING'
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              level: true
            }
          }
        }
      })
    }

    try {
      const io = req.app.get('io') as Server | undefined

      if (io) {
        const roomName = `user:${receiver.id}`
        console.log(`📨 Emission FRIEND_REQUEST_RECEIVED vers ${roomName}`)
        console.log('👥 sockets in room =', io.sockets.adapter.rooms.get(roomName)?.size || 0)

        io.to(roomName).emit('FRIEND_REQUEST_RECEIVED', {
          requestId: request.id,
          sender: {
            id: request.sender.id,
            username: request.sender.username,
            level: request.sender.level
          }
        })
      }
    } catch (socketError) {
      console.error('Socket emit error in /friends/request:', socketError)
    }

    res.json(request)
  } catch (error: unknown) {
    console.error('POST /api/friends/request error:', error)
    res.status(500).json({
      error: 'Erreur serveur',
      details: error instanceof Error ? error.message : String(error)
    })
  }
})

// GET RECEIVED FRIEND REQUESTS
router.get('/requests/:userId', async (req, res) => {
  const { userId } = req.params

  if (String(req.userId) !== String(userId)) {
    return res.status(403).json({ error: 'Accès interdit' })
  }

  try {
    const requests = await prisma.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: 'PENDING'
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            level: true,
            playerStats: {
              select: {
                totalWins: true,
                totalGames: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    res.json(requests)
  } catch (error) {
    console.error('GET /api/friends/requests/:userId error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// RESPOND TO FRIEND REQUEST
router.put('/request/:requestId', async (req, res) => {
  const { requestId } = req.params

  const parsed = updateRequestSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues })
  }

  const { status } = parsed.data

  try {
    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId }
    })

    if (!request) {
      return res.status(404).json({ error: 'Demande introuvable' })
    }

    if (String(request.receiverId) !== String(req.userId)) {
      return res.status(403).json({ error: 'Accès interdit' })
    }

    const updatedRequest = await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status }
    })

    if (status === 'ACCEPTED') {
      const user1Id =
        request.senderId < request.receiverId ? request.senderId : request.receiverId
      const user2Id =
        request.senderId < request.receiverId ? request.receiverId : request.senderId

      const existingFriendship = await prisma.friendship.findFirst({
        where: {
          user1Id,
          user2Id
        }
      })

      if (!existingFriendship) {
        await prisma.friendship.create({
          data: {
            user1Id,
            user2Id
          }
        })
      }

      const io = req.app.get('io') as Server | undefined
      if (io) {
        const senderRoom = `user:${request.senderId}`
        const receiverRoom = `user:${request.receiverId}`

        const acceptedFriend = await prisma.user.findUnique({
          where: { id: request.receiverId },
          select: { username: true }
        })

        console.log(`✅ Emission FRIEND_REQUEST_ACCEPTED vers ${senderRoom}`)
        console.log(`👥 sender room sockets =`, io.sockets.adapter.rooms.get(senderRoom)?.size || 0)

        io.to(senderRoom).emit('FRIEND_REQUEST_ACCEPTED', {
          friendId: request.receiverId,
          username: acceptedFriend?.username
        })

        io.to(receiverRoom).emit('FRIEND_LIST_UPDATED', {
          friendId: request.senderId
        })

        io.to(senderRoom).emit('FRIEND_LIST_UPDATED', {
          friendId: request.receiverId
        })
      }
    }

    res.json(updatedRequest)
  } catch (error) {
    console.error('PUT /api/friends/request/:requestId error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET FRIENDS LIST
router.get('/:userId', async (req, res) => {
  const { userId } = req.params

  if (String(req.userId) !== String(userId)) {
    return res.status(403).json({ error: 'Accès interdit' })
  }

  try {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId }
        ]
      },
      include: {
        user1: {
          select: {
            id: true,
            username: true,
            level: true,
            playerStats: {
              select: {
                totalWins: true,
                totalGames: true
              }
            }
          }
        },
        user2: {
          select: {
            id: true,
            username: true,
            level: true,
            playerStats: {
              select: {
                totalWins: true,
                totalGames: true
              }
            }
          }
        }
      }
    })

    const userIdStr = String(userId)
    const friends = friendships
      .map((friendship) =>
        String(friendship.user1Id) === userIdStr ? friendship.user2 : friendship.user1
      )
      .filter((f) => String(f.id) !== userIdStr) // exclure soi-même (bug mapping)

    res.json(friends)
  } catch (error) {
    console.error('GET /api/friends/:userId error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router