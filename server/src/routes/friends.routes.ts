import express from 'express'
import type { Server } from 'socket.io'
import sanitizeHtml from 'sanitize-html'
import { prisma } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { searchUserSchema, friendRequestSchema, updateRequestSchema } from '../validation/friends.validation.js'

const router = express.Router()

router.use(authMiddleware)

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
        stats: {
          select: {
            wins: true,
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

  if (req.userId !== userId) {
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
            stats: {
              select: {
                wins: true,
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

    if (request.receiverId !== req.userId) {
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

  if (req.userId !== userId) {
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
            stats: {
              select: {
                wins: true,
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
            stats: {
              select: {
                wins: true,
                totalGames: true
              }
            }
          }
        }
      }
    })

    const friends = friendships.map((friendship) =>
      friendship.user1Id === userId ? friendship.user2 : friendship.user1
    )

    res.json(friends)
  } catch (error) {
    console.error('GET /api/friends/:userId error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router