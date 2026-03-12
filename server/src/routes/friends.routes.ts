import express from 'express';
import { prisma } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// toutes les routes nécessitent un token
router.use(authMiddleware);

// Rechercher des utilisateurs par nom d'utilisateur
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter required' });
    }

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
    });

    res.json(users);

  } catch (error) {
    console.error('Erreur recherche:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Envoyer une demande d'ami
router.post('/request', async (req, res) => {
  try {

    const senderId = req.userId;
    const { receiverUsername } = req.body;

    const receiver = await prisma.user.findUnique({
      where: { username: receiverUsername }
    });

    if (!receiver) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    if (receiver.id === senderId) {
      return res.status(400).json({ error: 'Impossible de s’ajouter soi-même' });
    }

    // Vérifier si une demande existe déjà
    const existingRequest = await prisma.friendRequest.findUnique({
      where: {
        senderId_receiverId: {
          senderId,
          receiverId: receiver.id
        }
      }
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'Demande déjà envoyée' });
    }

    // Vérifier s'ils sont déjà amis
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: senderId, user2Id: receiver.id },
          { user1Id: receiver.id, user2Id: senderId }
        ]
      }
    });

    if (existingFriendship) {
      return res.status(400).json({ error: 'Déjà amis' });
    }

    const request = await prisma.friendRequest.create({
      data: {
        senderId,
        receiverId: receiver.id,
        status: 'PENDING'
      }
    });

    res.json(request);

  } catch (error) {
    console.error('Erreur envoi demande:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Liste des demandes reçues
router.get('/requests', async (req, res) => {
  try {

    const userId = req.userId;

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
            level: true
          }
        }
      }
    });

    res.json(requests);

  } catch (error) {
    console.error('Erreur récupération demandes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Accepter ou refuser une demande
router.put('/request/:requestId', async (req, res) => {
  try {

    const { requestId } = req.params;
    const { status } = req.body;

    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status invalide' });
    }

    const request = await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status }
    });

    if (status === 'ACCEPTED') {

      await prisma.friendship.create({
        data: {
          user1Id: request.senderId,
          user2Id: request.receiverId
        }
      });

    }

    res.json({ success: true });

  } catch (error) {
    console.error('Erreur mise à jour demande:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Liste des amis
router.get('/', async (req, res) => {
  try {

    const userId = req.userId;

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
    });

    const friends = friendships.map(f =>
      f.user1Id === userId ? f.user2 : f.user1
    );

    res.json(friends);

  } catch (error) {
    console.error('Erreur récupération amis:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;