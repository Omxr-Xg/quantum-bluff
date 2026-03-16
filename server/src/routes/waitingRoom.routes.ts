import express from 'express';
import { prisma } from '../config/database.js';
import { GameTable } from '../logic/GameTable.js';
import type { Player } from '../types/poker.js';
import { activeGames } from '../shared/activeGames.js';
import sanitizeHtml from 'sanitize-html';


const router = express.Router();

// Fonction utilitaire pour nettoyer le nom de la salle
//const sanitizeRoomName = (roomName: string) => sanitizeHtml(roomName);

// GET /api/waiting-room - Liste toutes les salles disponibles
router.get('/', async (req, res) => {
  try {
    const rooms = await prisma.waitingRoom.findMany({
      where: { status: 'WAITING' },
      include: {
        players: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                level: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedRooms = rooms.map(room => ({
      id: room.id,
      name: room.name,
      hostId: room.hostId,
      maxPlayers: room.maxPlayers,
      visibility: room.visibility,
      status: room.status,
      players: room.players.map(p => ({
        id: p.user.id,
        username: p.user.username,
        level: p.user.level,
        isReady: p.isReady,
        position: p.position
      })),
      playerCount: room.players.length
    }));

    res.json(formattedRooms);
  } catch (error) {
    console.error('Erreur liste salles:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/waiting-room/active/games - Liste des parties actives (doit être avant /:roomId)
router.get('/active/games', async (req, res) => {
  const allGames = await activeGames.getAll();
  const games = Array.from(allGames.entries()).map(([id, game]) => ({
    id,
    players: game.state.players.length,
    phase: game.state.phase
  }));
  res.json(games);
});

// POST /api/waiting-room/create - Créer une nouvelle salle
router.post('/create', async (req, res) => {
  try {
    const { hostId, roomName, maxPlayers = 5, visibility = 'PUBLIC' } = req.body;

    const clampedMaxPlayers = Math.min(5, Math.max(2, Number(maxPlayers) || 5));
    const roomVisibility = visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';

    const user = await prisma.user.findUnique({
      where: { id: hostId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const room = await prisma.waitingRoom.create({
      data: {
        name: roomName ? sanitizeHtml(roomName) : `Salle de ${user.username}`,
        hostId,
        maxPlayers: clampedMaxPlayers,
        visibility: roomVisibility,
        players: {
          create: {
            userId: hostId,
            isReady: false,
            position: 0
          }
        }
      },
      include: {
        players: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                level: true
              }
            }
          }
        }
      }
    });

    res.json({
      id: room.id,
      name: room.name,
      hostId: room.hostId,
      maxPlayers: room.maxPlayers,
      visibility: room.visibility,
      status: room.status,
      players: room.players.map(p => ({
        id: p.user.id,
        username: p.user.username,
        level: p.user.level,
        isReady: p.isReady,
        position: p.position
      }))
    });
  } catch (error) {
    console.error('Erreur création salle:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/waiting-room/:roomId - Détails d'une salle
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await prisma.waitingRoom.findUnique({
      where: { id: roomId },
      include: {
        players: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                level: true
              }
            }
          }
        }
      }
    });

    if (!room) {
      return res.status(404).json({ error: 'Salle non trouvée' });
    }

    res.json({
      id: room.id,
      name: room.name,
      hostId: room.hostId,
      maxPlayers: room.maxPlayers,
      visibility: room.visibility,
      status: room.status,
      players: room.players.map(p => ({
        id: p.user.id,
        username: p.user.username,
        level: p.user.level,
        isReady: p.isReady,
        position: p.position
      }))
    });
  } catch (error) {
    console.error('Erreur récupération salle:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/waiting-room/:roomId/join - Rejoindre une salle
router.post('/:roomId/join', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    // Vérifier que la salle existe et est en WAITING
    const room = await prisma.waitingRoom.findUnique({
      where: { id: roomId },
      include: { players: true }
    });

    if (!room) {
      return res.status(404).json({ error: 'Salle non trouvée' });
    }

    if (room.status !== 'WAITING') {
      return res.status(400).json({ error: 'La partie a déjà commencé' });
    }

    if (room.players.length >= room.maxPlayers) {
      return res.status(400).json({ error: 'Salle pleine' });
    }

    const alreadyInRoom = room.players.some(p => p.userId === userId);
    if (alreadyInRoom) {
      return res.status(400).json({ error: 'Déjà dans la salle' });
    }

    if (room.visibility === 'PRIVATE' && room.hostId !== userId) {
      const approved = await prisma.joinRequest.findFirst({
        where: { roomId, userId, status: 'ACCEPTED' }
      });
      if (!approved) {
        return res.status(403).json({ error: 'Cette salle est privée. Envoyez une demande.' });
      }
    }

    const updatedRoom = await prisma.waitingRoom.update({
      where: { id: roomId },
      data: {
        players: {
          create: {
            userId,
            isReady: false,
            position: room.players.length
          }
        }
      },
      include: {
        players: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                level: true
              }
            }
          }
        }
      }
    });

    res.json({
      id: updatedRoom.id,
      name: updatedRoom.name,
      hostId: updatedRoom.hostId,
      maxPlayers: updatedRoom.maxPlayers,
      visibility: updatedRoom.visibility,
      status: updatedRoom.status,
      players: updatedRoom.players.map(p => ({
        id: p.user.id,
        username: p.user.username,
        level: p.user.level,
        isReady: p.isReady,
        position: p.position
      }))
    });
  } catch (error) {
    console.error('Erreur rejoindre salle:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/waiting-room/:roomId/leave - Quitter une salle
router.post('/:roomId/leave', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    // Supprimer le joueur de la salle
    await prisma.roomPlayer.deleteMany({
      where: {
        roomId,
        userId
      }
    });

    // Vérifier s'il reste des joueurs
    const room = await prisma.waitingRoom.findUnique({
      where: { id: roomId },
      include: { players: true }
    });

    // Si plus de joueurs, supprimer la salle
    if (room && room.players.length === 0) {
      await prisma.waitingRoom.delete({
        where: { id: roomId }
      });
      return res.json({ message: 'Salle supprimée', empty: true });
    }

    // Si l'hôte est parti, nommer un nouvel hôte
    if (room && room.hostId === userId && room.players.length > 0) {
      await prisma.waitingRoom.update({
        where: { id: roomId },
        data: { hostId: room.players[0].userId }
      });
    }

    res.json({ message: 'Joueur retiré' });
  } catch (error) {
    console.error('Erreur quitter salle:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/waiting-room/:roomId/ready - Changer statut prêt
router.put('/:roomId/ready', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, isReady } = req.body;

    const player = await prisma.roomPlayer.update({
      where: {
        roomId_userId: {
          roomId,
          userId
        }
      },
      data: { isReady }
    });

    res.json({ isReady: player.isReady });
  } catch (error) {
    console.error('Erreur changement statut:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/waiting-room/:roomId/start - Démarrer la partie
// POST /api/waiting-room/:roomId/start - Démarrer la partie
router.post('/:roomId/start', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    const room = await prisma.waitingRoom.findUnique({
      where: { id: roomId },
      include: { 
        players: {
          include: {
            user: true
          }
        }
      }
    });

    if (!room) {
      return res.status(404).json({ error: 'Salle non trouvée' });
    }

    if (room.hostId !== userId) {
      return res.status(403).json({ error: 'Seul l\'hôte peut démarrer' });
    }

    if (room.players.length < 2) {
      return res.status(400).json({ error: 'Pas assez de joueurs' });
    }

    const allReady = room.players.every(p => p.isReady);
    if (!allReady) {
      const notReadyPlayers = room.players
        .filter(p => !p.isReady)
        .map(p => ({ id: p.user.id, name: p.user.username }));
      const io = req.app.get('io') as import('socket.io').Server | undefined;
      if (io) {
        io.to(roomId).emit('HOST_REQUESTED_START', {
          message: 'L\'hôte veut lancer la partie — mettez-vous prêt !',
          notReadyPlayers: notReadyPlayers.map(p => ({ id: p.id, name: p.name }))
        });
      }
      return res.status(400).json({
        error: 'Tous les joueurs ne sont pas prêts',
        notReadyPlayers: notReadyPlayers.map(p => p.name)
      });
    }

    // 🔥 CRÉATION DE LA PARTIE
    const gameId = `game_${Date.now()}`;

    // Convertir les joueurs pour GameTable (chips = balance de chaque utilisateur)
    const players: Player[] = room.players.map((rp, index) => ({
      id: rp.user.id,
      name: rp.user.username,
      cards: [],
      chips: Math.max(100, rp.user.chips ?? 1000),
      role: 'PLAYER',
      isActive: true,
      position: index,
      isDealer: false,
      isConnected: true
    }));

    // Créer et initialiser la partie
    const gameTable = new GameTable(gameId, players);
    gameTable.startHand();

    // Stocker dans le cache (Redis + local)
    await activeGames.set(gameId, gameTable);
    const size = activeGames.size();
    console.log(`✅ Partie ${gameId} créée et stockée. Taille du cache: ${size}`);

    // Mettre à jour la salle
    await prisma.waitingRoom.update({
      where: { id: roomId },
      data: {
        status: 'IN_GAME',
        gameId
      }
    });

    const playersForClient = room.players.map((rp) => ({
      id: rp.user.id,
      name: rp.user.username
    }));

    const io = req.app.get('io') as import('socket.io').Server | undefined;
    if (io) {
      io.to(roomId).emit('GAME_STARTED', { gameId, players: playersForClient });
    }

    res.json({ gameId, message: 'Partie démarrée', players: playersForClient });
  } catch (error) {
    console.error('Erreur démarrage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/waiting-room/:roomId/request-join - Demander à rejoindre une salle privée
router.post('/:roomId/request-join', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    const room = await prisma.waitingRoom.findUnique({
      where: { id: roomId },
      include: { players: true }
    });

    if (!room) {
      return res.status(404).json({ error: 'Salle non trouvée' });
    }

    if (room.status !== 'WAITING') {
      return res.status(400).json({ error: 'La partie a déjà commencé' });
    }

    if (room.players.length >= room.maxPlayers) {
      return res.status(400).json({ error: 'Salle pleine' });
    }

    if (room.players.some(p => p.userId === userId)) {
      return res.status(400).json({ error: 'Déjà dans la salle' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, level: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const joinRequest = await prisma.joinRequest.upsert({
      where: { roomId_userId: { roomId, userId } },
      create: { roomId, userId, status: 'PENDING' },
      update: { status: 'PENDING' }
    });

    const io = req.app.get('io') as import('socket.io').Server | undefined;
    if (io) {
      io.to(`user:${room.hostId}`).emit('JOIN_REQUEST_RECEIVED', {
        requestId: joinRequest.id,
        roomId,
        user: { id: user.id, username: user.username, level: user.level }
      });
    }

    res.json({ message: 'Demande envoyée', requestId: joinRequest.id });
  } catch (error) {
    console.error('Erreur demande rejoindre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/waiting-room/:roomId/join-requests - Liste des demandes (host only)
router.get('/:roomId/join-requests', async (req, res) => {
  try {
    const { roomId } = req.params;
    const hostId = req.query.hostId as string;

    const room = await prisma.waitingRoom.findUnique({ where: { id: roomId } });
    if (!room) {
      return res.status(404).json({ error: 'Salle non trouvée' });
    }

    if (room.hostId !== hostId) {
      return res.status(403).json({ error: 'Seul l\'hôte peut voir les demandes' });
    }

    const requests = await prisma.joinRequest.findMany({
      where: { roomId, status: 'PENDING' },
      include: {
        user: { select: { id: true, username: true, level: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(requests.map(r => ({
      id: r.id,
      userId: r.user.id,
      username: r.user.username,
      level: r.user.level,
      createdAt: r.createdAt
    })));
  } catch (error) {
    console.error('Erreur liste demandes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/waiting-room/:roomId/join-requests/:requestId/accept
router.post('/:roomId/join-requests/:requestId/accept', async (req, res) => {
  try {
    const { roomId, requestId } = req.params;
    const { hostId } = req.body;

    const room = await prisma.waitingRoom.findUnique({
      where: { id: roomId },
      include: { players: true }
    });

    if (!room) return res.status(404).json({ error: 'Salle non trouvée' });
    if (room.hostId !== hostId) return res.status(403).json({ error: 'Non autorisé' });
    if (room.players.length >= room.maxPlayers) return res.status(400).json({ error: 'Salle pleine' });

    const joinRequest = await prisma.joinRequest.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' },
      include: { user: { select: { id: true, username: true } } }
    });

    // Auto-join the player
    await prisma.waitingRoom.update({
      where: { id: roomId },
      data: {
        players: {
          create: {
            userId: joinRequest.userId,
            isReady: false,
            position: room.players.length
          }
        }
      }
    });

    const io = req.app.get('io') as import('socket.io').Server | undefined;
    if (io) {
      io.to(`user:${joinRequest.userId}`).emit('JOIN_REQUEST_ACCEPTED', {
        roomId,
        roomName: room.name
      });
    }

    res.json({ message: 'Demande acceptée', userId: joinRequest.userId });
  } catch (error) {
    console.error('Erreur acceptation demande:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/waiting-room/:roomId/join-requests/:requestId/reject
router.post('/:roomId/join-requests/:requestId/reject', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { hostId } = req.body;

    const joinRequest = await prisma.joinRequest.findUnique({
      where: { id: requestId },
      include: { room: true }
    });

    if (!joinRequest) return res.status(404).json({ error: 'Demande non trouvée' });
    if (joinRequest.room.hostId !== hostId) return res.status(403).json({ error: 'Non autorisé' });

    await prisma.joinRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' }
    });

    const io = req.app.get('io') as import('socket.io').Server | undefined;
    if (io) {
      io.to(`user:${joinRequest.userId}`).emit('JOIN_REQUEST_REJECTED', {
        roomId: joinRequest.roomId,
        roomName: joinRequest.room.name
      });
    }

    res.json({ message: 'Demande refusée' });
  } catch (error) {
    console.error('Erreur refus demande:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/waiting-room/:roomId - Suppression manuelle par l'hôte (nettoyage de salles inactives)
router.delete('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body as { userId?: string };

    if (!userId) {
      return res.status(400).json({ error: 'userId requis' });
    }

    const room = await prisma.waitingRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return res.status(404).json({ error: 'Salle non trouvée' });
    }

    if (room.hostId !== userId) {
      return res.status(403).json({ error: 'Seul l\'hôte peut supprimer la salle' });
    }

    // Nettoyer les joueurs de la salle puis supprimer la salle
    await prisma.roomPlayer.deleteMany({ where: { roomId } });
    await prisma.waitingRoom.delete({ where: { id: roomId } });

    return res.json({ message: 'Salle supprimée par l\'hôte' });
  } catch (error) {
    console.error('Erreur suppression salle par hôte:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
