import express from 'express';
import { prisma } from '../config/database.js';
import { GameTable } from '../logic/GameTable.js';
import type { Player } from '../types/poker.js';
import { activeGames } from '../shared/activeGames.js';

const router = express.Router();

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

// POST /api/waiting-room/create - Créer une nouvelle salle
router.post('/create', async (req, res) => {
  try {
    const { hostId, roomName, maxPlayers = 9 } = req.body;

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: hostId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Créer la salle
    const room = await prisma.waitingRoom.create({
      data: {
        name: roomName || `Salle de ${user.username}`,
        hostId,
        maxPlayers,
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

    // Vérifier que l'utilisateur n'est pas déjà dans la salle
    const alreadyInRoom = room.players.some(p => p.userId === userId);
    if (alreadyInRoom) {
      return res.status(400).json({ error: 'Déjà dans la salle' });
    }

    // Ajouter le joueur
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
      return res.status(400).json({ error: 'Tous les joueurs ne sont pas prêts' });
    }

    // 🔥 CRÉATION DE LA PARTIE
    const gameId = `game_${Date.now()}`;

    // Convertir les joueurs pour GameTable
    const players: Player[] = room.players.map((rp, index) => ({
      id: rp.user.id,
      name: rp.user.username,
      cards: [],
      chips: 1000,
      role: 'PLAYER',
      isActive: true,
      position: index,
      isDealer: false,
      isConnected: true
    }));

    // Créer et initialiser la partie
    const gameTable = new GameTable(gameId, players);
    gameTable.startHand();

    // Stocker dans le Map
    activeGames.set(gameId, gameTable);
    console.log(`✅ Partie ${gameId} créée et stockée. Taille du Map: ${activeGames.size}`);

    // Mettre à jour la salle
    await prisma.waitingRoom.update({
      where: { id: roomId },
      data: {
        status: 'IN_GAME',
        gameId
      }
    });

    res.json({ gameId, message: 'Partie démarrée' });
  } catch (error) {
    console.error('Erreur démarrage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/waiting-room/active/games - Liste des parties actives
router.get('/active/games', (req, res) => {
  const games = Array.from(activeGames.entries()).map(([id, game]) => ({
    id,
    players: game.state.players.length,
    phase: game.state.phase
  }));
  res.json(games);
});

export default router;
