import express from 'express'
import sanitizeHtml from 'sanitize-html'
import { prisma } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { searchUserSchema, friendRequestSchema } from '../validation/friends.validation.js'

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

    console.error(error)
    res.status(500).json({ error: 'Erreur serveur' })

  }

})


// SEND FRIEND REQUEST
router.post('/request', async (req, res) => {

  const senderId = req.userId!

  const parsed = friendRequestSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors })
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

    const request = await prisma.friendRequest.create({
      data: {
        senderId,
        receiverId: receiver.id,
        status: 'PENDING'
      }
    })

    res.json(request)

  } catch (error) {

    console.error(error)
    res.status(500).json({ error: 'Erreur serveur' })

  }

})

export default router