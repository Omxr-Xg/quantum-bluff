import express from 'express'
import type { Server } from 'socket.io'
import sanitizeHtml from 'sanitize-html'
import { prisma } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { getPresenceBatch, isUserOnline } from '../services/presence.service.js'
import {
  searchUserSchema,
  friendRequestSchema,
  updateRequestSchema
} from '../validation/friends.validation.js'
import rateLimit from 'express-rate-limit'
import {
  censorChatLinks,
  isChatContentEffectivelyEmpty,
} from '../utils/chatLinkCensor.js'
import { clientAvatarUrlFromUser } from '../utils/userAvatarPublic.js'
import { resolvePublicCosmetics } from '../shop/publicCosmetics.js'

const router = express.Router()

function normalizeFriendActivity(activity?: string | null): string | undefined {
  if (!activity) return undefined
  const value = activity.trim()
  if (!value || value === 'Lobby' || value === 'Salon' || value === 'Mini-jeux') {
    return undefined
  }
  return value
}

function orderedFriendshipIds(a: string, b: string): { user1Id: string; user2Id: string } {
  return a < b ? { user1Id: a, user2Id: b } : { user1Id: b, user2Id: a }
}

async function hasBlockBetween(userId: string, otherUserId: string): Promise<boolean> {
  const block = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: otherUserId },
        { blockerId: otherUserId, blockedId: userId },
      ],
    },
    select: { id: true },
  })
  return Boolean(block)
}

const friendSearchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
})

const friendRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de demandes d’amis. Réessaie plus tard.' }
})

const friendResponseLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
})

const friendSocialActionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
})

const friendMessageReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
})

const friendMessageSendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de messages envoyés. Réessaie plus tard.' }
})

router.use(authMiddleware)

/** Marque l’écran Amis comme consulté (compteurs / toasts basés sur la DB, pas localStorage). */
router.post('/inbox-seen', friendMessageReadLimiter, async (req, res) => {
  const userId = String(req.userId ?? '').trim()
  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { friendsInboxSeenAt: new Date() },
    })
    return res.json({ ok: true })
  } catch (error) {
    console.error('POST /api/friends/inbox-seen error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** Synthèse après reconnexion : nouveautés depuis friendsInboxSeenAt (ou createdAt du compte). */
router.get('/pending-social', friendMessageReadLimiter, async (req, res) => {
  const userId = String(req.userId ?? '').trim()
  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { friendsInboxSeenAt: true, createdAt: true },
    })
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' })
    }
    const since = user.friendsInboxSeenAt ?? user.createdAt

    const [newMessagesCount, newLoanRequestsAsLender, recentIncoming] = await Promise.all([
      prisma.friendMessage.count({
        where: { receiverId: userId, createdAt: { gt: since } },
      }),
      prisma.loanRequest.count({
        where: {
          lenderId: userId,
          status: 'PENDING',
          createdAt: { gt: since },
        },
      }),
      prisma.friendMessage.findMany({
        where: { receiverId: userId, createdAt: { gt: since } },
        orderBy: { createdAt: 'desc' },
        take: 40,
        select: {
          id: true,
          senderId: true,
          content: true,
          createdAt: true,
          sender: { select: { username: true } },
        },
      }),
    ])

    const seenSenders = new Set<string>()
    const missedMessages: {
      senderId: string
      senderUsername: string
      preview: string
      createdAt: string
    }[] = []

    for (const row of recentIncoming) {
      if (seenSenders.has(row.senderId)) continue
      seenSenders.add(row.senderId)
      const preview =
        row.content.length > 120
          ? `${row.content.slice(0, 120)}…`
          : row.content
      missedMessages.push({
        senderId: row.senderId,
        senderUsername: row.sender.username,
        preview,
        createdAt: row.createdAt.toISOString(),
      })
      if (missedMessages.length >= 8) break
    }

    const latestIncomingMessage = recentIncoming[0]
      ? {
          id: recentIncoming[0].id,
          senderId: recentIncoming[0].senderId,
          senderUsername: recentIncoming[0].sender.username,
          preview:
            recentIncoming[0].content.length > 120
              ? `${recentIncoming[0].content.slice(0, 120)}…`
              : recentIncoming[0].content,
          createdAt: recentIncoming[0].createdAt.toISOString(),
        }
      : null

    return res.json({
      newMessagesCount,
      newLoanRequestsAsLender,
      missedMessages,
      latestIncomingMessage,
    })
  } catch (error) {
    console.error('GET /api/friends/pending-social error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Messages: défini et monté EN PREMIER pour éviter que "messages" soit capté par /:userId
const messagesRouter = express.Router({ mergeParams: true })

messagesRouter.get('/', friendMessageReadLimiter, async (req, res) => {
  const userId = String(req.userId ?? '').trim()
  const { friendId } = req.query

  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  if (typeof friendId !== 'string') {
    return res.status(400).json({ error: 'friendId requis' })
  }

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
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }]
        },
        select: { user1Id: true, user2Id: true }
      })

      friendship =
        userFriendships.find(
          (f) =>
            (String(f.user1Id) === String(userId) &&
              String(f.user2Id) === String(friendIdStr)) ||
            (String(f.user2Id) === String(userId) &&
              String(f.user1Id) === String(friendIdStr))
        ) ?? null
    }

    if (!friendship) {
      console.warn('[GET /messages] Amitié non trouvée, retour []', {
        userId,
        friendId: friendIdStr
      })
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

    return res.json(messages)
  } catch (error) {
    console.error('GET /api/friends/messages error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return res.status(500).json({
      error: 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? msg : undefined
    })
  }
})

messagesRouter.post('/', friendMessageSendLimiter, async (req, res) => {
  const senderId = String(req.userId ?? '').trim()
  const { receiverId, content } = req.body

  if (!senderId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  if (typeof receiverId !== 'string' || typeof content !== 'string') {
    return res.status(400).json({ error: 'receiverId et content requis' })
  }

  const receiverIdStr = String(receiverId).trim()
  const trimmed = content.trim()

  if (!trimmed || trimmed.length > 2000) {
    return res
      .status(400)
      .json({ error: 'Message vide ou trop long (max 2000 caractères)' })
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

    if (!friendship) {
      return res
        .status(403)
        .json({ error: 'Vous ne pouvez discuter qu\'avec vos amis' })
    }

    const safeContent = sanitizeHtml(trimmed, {
      allowedTags: [],
      allowedAttributes: {}
    })

    const censoredContent = censorChatLinks(safeContent)
    if (isChatContentEffectivelyEmpty(censoredContent)) {
      return res.status(400).json({ error: 'MESSAGE_LINKS_NOT_ALLOWED' })
    }

    const message = await prisma.friendMessage.create({
      data: {
        senderId,
        receiverId: receiverIdStr,
        content: censoredContent
      },
      include: {
        sender: { select: { id: true, username: true } },
        receiver: { select: { id: true, username: true } }
      }
    })

    const io = req.app.get('io') as Server | undefined
    if (io) {
      const payload = {
        id: message.id,
        senderId: message.senderId,
        receiverId: message.receiverId,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        sender: message.sender,
        receiver: message.receiver
      }
      /* Émettre uniquement au destinataire : l'expéditeur met à jour via la réponse REST. */
      io.to(`user:${receiverIdStr}`).emit('FRIEND_MESSAGE', payload)
    }

    return res.json(message)
  } catch (error) {
    console.error('POST /api/friends/messages error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return res.status(500).json({
      error: 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? msg : undefined
    })
  }
})

router.use('/messages', messagesRouter)

// Debug: GET /api/friends/debug/my-friendships
router.get('/debug/my-friendships', async (req, res) => {
  const userId = String(req.userId ?? '').trim()

  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

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
router.get('/search', friendSearchLimiter, async (req, res) => {
  const parsed = searchUserSchema.safeParse(req.query)

  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid search query' })
  }

  let { query } = parsed.data
  query = sanitizeHtml(query)

  try {
    const requesterId = String(req.userId ?? '').trim()
    const blockRows = requesterId
      ? await prisma.userBlock.findMany({
          where: {
            OR: [{ blockerId: requesterId }, { blockedId: requesterId }],
          },
          select: { blockerId: true, blockedId: true },
        })
      : []
    const blockedIds = new Set(
      blockRows.map((row) =>
        row.blockerId === requesterId ? row.blockedId : row.blockerId,
      ),
    )
    const users = await prisma.user.findMany({
      where: {
        id: {
          notIn: [requesterId, ...blockedIds].filter(Boolean),
        },
        username: {
          contains: query,
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        username: true,
        level: true,
        avatarUrl: true,
        avatarHasBinary: true,
        playerStats: {
          select: {
            totalWins: true,
            totalGames: true
          }
        }
      },
      take: 10
    })

    return res.json(
      users.map((u) => ({
        ...u,
        avatarUrl: clientAvatarUrlFromUser(u),
      })),
    )
  } catch (error) {
    console.error('GET /api/friends/search error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

// SEND FRIEND REQUEST
router.post('/request', friendRequestLimiter, async (req, res) => {
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

    if (await hasBlockBetween(String(senderId), String(receiver.id))) {
      return res.status(403).json({ error: 'Impossible d’envoyer une demande à cet utilisateur' })
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
            level: true,
            avatarUrl: true,
            avatarHasBinary: true
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
              level: true,
              avatarUrl: true,
              avatarHasBinary: true
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
              level: true,
              avatarUrl: true,
              avatarHasBinary: true
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
        console.log(
          '👥 sockets in room =',
          io.sockets.adapter.rooms.get(roomName)?.size || 0
        )

        io.to(roomName).emit('FRIEND_REQUEST_RECEIVED', {
          requestId: request.id,
          sender: {
            id: request.sender.id,
            username: request.sender.username,
            level: request.sender.level,
            avatarUrl: clientAvatarUrlFromUser(request.sender)
          }
        })
      }
    } catch (socketError) {
      console.error('Socket emit error in /friends/request:', socketError)
    }

    return res.json(request)
  } catch (error: unknown) {
    console.error('POST /api/friends/request error:', error)
    return res.status(500).json({
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
            avatarUrl: true,
            avatarHasBinary: true,
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

    return res.json(
      requests.map((r) => ({
        ...r,
        sender: {
          ...r.sender,
          avatarUrl: clientAvatarUrlFromUser(r.sender),
        },
      })),
    )
  } catch (error) {
    console.error('GET /api/friends/requests/:userId error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return res.status(500).json({
      error: 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? msg : undefined
    })
  }
})

// RESPOND TO FRIEND REQUEST
router.put('/request/:requestId', friendResponseLimiter, async (req, res) => {
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

    if (
      status === 'ACCEPTED' &&
      (await hasBlockBetween(String(request.senderId), String(request.receiverId)))
    ) {
      return res.status(403).json({ error: 'Impossible d’accepter cette demande' })
    }

    const updatedRequest = await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status }
    })

    if (status === 'ACCEPTED') {
      const user1Id =
        request.senderId < request.receiverId
          ? request.senderId
          : request.receiverId
      const user2Id =
        request.senderId < request.receiverId
          ? request.receiverId
          : request.senderId

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
        const friendCountFor = async (uid: string) => {
          const n = await prisma.friendship.count({
            where: { OR: [{ user1Id: uid }, { user2Id: uid }] },
          })
          return n
        }
        void import('../achievements/achievement.service.js').then(async ({ checkAchievements }) => {
          const [senderCount, receiverCount] = await Promise.all([
            friendCountFor(request.senderId),
            friendCountFor(request.receiverId),
          ])
          await checkAchievements(request.senderId, { type: 'FRIEND_ADDED', friendsCount: senderCount })
          await checkAchievements(request.receiverId, { type: 'FRIEND_ADDED', friendsCount: receiverCount })
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
        console.log(
          '👥 sender room sockets =',
          io.sockets.adapter.rooms.get(senderRoom)?.size || 0
        )

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

    return res.json(updatedRequest)
  } catch (error) {
    console.error('PUT /api/friends/request/:requestId error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/friends/blocked - Liste des utilisateurs bloqués
router.get('/blocked', friendSocialActionLimiter, async (req, res) => {
  const userId = String(req.userId ?? '').trim()
  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  try {
    const rows = await prisma.userBlock.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            level: true,
            avatarUrl: true,
            avatarHasBinary: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return res.json(
      rows.map((row) => ({
        id: row.id,
        blockedAt: row.createdAt,
        user: {
          ...row.blocked,
          avatarUrl: clientAvatarUrlFromUser(row.blocked),
        },
      })),
    )
  } catch (error) {
    console.error('GET /api/friends/blocked error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

// DELETE /api/friends/:friendId - Retirer un ami sans le bloquer
router.delete('/:friendId', friendSocialActionLimiter, async (req, res) => {
  const userId = String(req.userId ?? '').trim()
  const friendId = String(req.params.friendId ?? '').trim()
  if (!userId) return res.status(401).json({ error: 'Non authentifié' })
  if (!friendId || friendId === userId) return res.status(400).json({ error: 'Ami invalide' })

  try {
    const { user1Id, user2Id } = orderedFriendshipIds(userId, friendId)
    await prisma.friendship.deleteMany({ where: { user1Id, user2Id } })
    const io = req.app.get('io') as Server | undefined
    io?.to(`user:${userId}`).emit('FRIEND_LIST_UPDATED', { friendId })
    io?.to(`user:${friendId}`).emit('FRIEND_LIST_UPDATED', { friendId: userId })
    return res.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/friends/:friendId error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/friends/block - Bloquer un utilisateur et supprimer les liens sociaux directs
router.post('/block', friendSocialActionLimiter, async (req, res) => {
  const blockerId = String(req.userId ?? '').trim()
  const blockedId = String(req.body?.blockedUserId ?? '').trim()
  if (!blockerId) return res.status(401).json({ error: 'Non authentifié' })
  if (!blockedId || blockedId === blockerId) {
    return res.status(400).json({ error: 'Utilisateur invalide' })
  }

  try {
    const blocked = await prisma.user.findUnique({
      where: { id: blockedId },
      select: { id: true },
    })
    if (!blocked) return res.status(404).json({ error: 'Utilisateur introuvable' })

    const { user1Id, user2Id } = orderedFriendshipIds(blockerId, blockedId)
    await prisma.$transaction([
      prisma.userBlock.upsert({
        where: { blockerId_blockedId: { blockerId, blockedId } },
        create: { blockerId, blockedId },
        update: {},
      }),
      prisma.friendship.deleteMany({ where: { user1Id, user2Id } }),
      prisma.friendRequest.deleteMany({
        where: {
          OR: [
            { senderId: blockerId, receiverId: blockedId },
            { senderId: blockedId, receiverId: blockerId },
          ],
        },
      }),
      prisma.gameInvitation.deleteMany({
        where: {
          OR: [
            { senderId: blockerId, receiverId: blockedId },
            { senderId: blockedId, receiverId: blockerId },
          ],
        },
      }),
      prisma.blackjackRoomInvitation.deleteMany({
        where: {
          OR: [
            { senderId: blockerId, receiverId: blockedId },
            { senderId: blockedId, receiverId: blockerId },
          ],
        },
      }),
    ])

    const io = req.app.get('io') as Server | undefined
    io?.to(`user:${blockerId}`).emit('FRIEND_LIST_UPDATED', { friendId: blockedId })
    io?.to(`user:${blockedId}`).emit('FRIEND_LIST_UPDATED', { friendId: blockerId })
    return res.json({ ok: true })
  } catch (error) {
    console.error('POST /api/friends/block error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

// DELETE /api/friends/block/:blockedUserId - Débloquer un utilisateur
router.delete('/block/:blockedUserId', friendSocialActionLimiter, async (req, res) => {
  const blockerId = String(req.userId ?? '').trim()
  const blockedId = String(req.params.blockedUserId ?? '').trim()
  if (!blockerId) return res.status(401).json({ error: 'Non authentifié' })
  if (!blockedId) return res.status(400).json({ error: 'Utilisateur invalide' })

  try {
    await prisma.userBlock.deleteMany({ where: { blockerId, blockedId } })
    return res.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/friends/block/:blockedUserId error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/friends/profile/:friendId — profil public d'un ami
router.get('/profile/:friendId', async (req, res) => {
  const viewerId = req.userId!
  const friendId = req.params.friendId

  if (viewerId === friendId) {
    return res.status(400).json({ error: 'Utilisez votre propre profil' })
  }

  try {
    if (await hasBlockBetween(viewerId, friendId)) {
      return res.status(403).json({ error: 'Profil indisponible' })
    }

    const ordered = orderedFriendshipIds(viewerId, friendId)
    const friendship = await prisma.friendship.findUnique({
      where: { user1Id_user2Id: ordered },
      select: { createdAt: true },
    })
    if (!friendship) {
      return res.status(403).json({ error: 'Cet utilisateur n’est pas dans votre liste d’amis' })
    }

    const friend = await prisma.user.findUnique({
      where: { id: friendId },
      select: {
        id: true,
        username: true,
        level: true,
        avatarUrl: true,
        avatarHasBinary: true,
        equippedBannerId: true,
        equippedFrameId: true,
        equippedTitleId: true,
        playerStats: {
          select: { totalWins: true, totalGames: true },
        },
      },
    })
    if (!friend) return res.status(404).json({ error: 'Utilisateur introuvable' })

    const totalGames = friend.playerStats?.totalGames ?? 0
    const totalWins = friend.playerStats?.totalWins ?? 0
    const winRatePercent =
      totalGames > 0 ? Math.round((totalWins / totalGames) * 1000) / 10 : 0

    return res.json({
      id: friend.id,
      username: friend.username,
      level: friend.level,
      avatarUrl: clientAvatarUrlFromUser(friend),
      cosmetics: resolvePublicCosmetics(friend),
      isOnline: await isUserOnline(friend.id),
      friendshipCreatedAt: friendship.createdAt,
      stats: {
        totalWins,
        totalGames,
        winRatePercent,
      },
    })
  } catch (error) {
    console.error('GET /api/friends/profile/:friendId error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
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
        OR: [{ user1Id: userId }, { user2Id: userId }]
      },
      include: {
        user1: {
          select: {
            id: true,
            username: true,
            level: true,
            avatarUrl: true,
            avatarHasBinary: true,
            equippedBannerId: true,
            equippedFrameId: true,
            equippedTitleId: true,
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
            avatarUrl: true,
            avatarHasBinary: true,
            equippedBannerId: true,
            equippedFrameId: true,
            equippedTitleId: true,
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
    const friendIds = friendships.map((friendship) =>
      String(friendship.user1Id) === userIdStr ? friendship.user2Id : friendship.user1Id,
    )
    const [pokerSeats, blackjackSeats] = await Promise.all([
      prisma.roomPlayer.findMany({
        where: { userId: { in: friendIds } },
        include: { room: { select: { name: true, status: true } } },
        orderBy: { joinedAt: 'desc' },
      }),
      prisma.blackjackRoomSeat.findMany({
        where: { userId: { in: friendIds } },
        include: { room: { select: { name: true, status: true } } },
        orderBy: { joinedAt: 'desc' },
      }),
    ])

    const activityByUserId = new Map<string, string>()
    for (const seat of pokerSeats) {
      if (activityByUserId.has(seat.userId)) continue
      activityByUserId.set(
        seat.userId,
        seat.room.status === 'IN_GAME' ? 'Poker' : 'Salon poker',
      )
    }
    for (const seat of blackjackSeats) {
      if (activityByUserId.has(seat.userId)) continue
      activityByUserId.set(
        seat.userId,
        seat.room.status === 'PLAYING' ? 'Blackjack' : 'Salon blackjack',
      )
    }
    const presenceByUserId = await getPresenceBatch(friendIds.map(String))

    const friends = friendships
      .map((friendship) => {
        const friend =
          String(friendship.user1Id) === userIdStr ? friendship.user2 : friendship.user1
        const fid = String(friend.id)
        const presence = presenceByUserId.get(fid)
        const liveActivity = presence?.activity ?? null
        return {
          ...friend,
          avatarUrl: clientAvatarUrlFromUser(friend),
          cosmetics: resolvePublicCosmetics(friend),
          friendshipCreatedAt: friendship.createdAt,
          isOnline: presence?.online ?? false,
          lastSeenAt:
            presence?.online || !presence?.lastSeenAt
              ? null
              : new Date(presence.lastSeenAt).toISOString(),
          currentActivity:
            normalizeFriendActivity(liveActivity) ||
            activityByUserId.get(fid) ||
            'Salon poker',
        }
      })
      .filter((f) => String(f.id) !== userIdStr)

    return res.json(friends)
  } catch (error) {
    console.error('GET /api/friends/:userId error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return res.status(500).json({
      error: 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? msg : undefined
    })
  }
})

export default router
