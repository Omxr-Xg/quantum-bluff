import express from 'express';
import { prisma } from '../config/database.js';
import { GameTable } from '../logic/GameTable.js';
import type { Player } from '../types/poker.js';
import { activeGames } from '../shared/activeGames.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// POST /api/game/start - Démarrer une partie depuis une salle d'attente
router.post('/start', async (req, res) => {
  try {
    const { roomId, hostId } = req.body;

    // Récupérer la salle d'attente
    const waitingRoom = await prisma.waitingRoom.findUnique({
      where: { id: roomId },
      include: {
        players: {
          include: {
            user: true
          }
        }
      }
    });

    if (!waitingRoom) {
      return res.status(404).json({ error: 'Salle introuvable' });
    }

    // Vérifier que c'est bien le host qui démarre
    if (waitingRoom.hostId !== hostId) {
      return res.status(403).json({ error: 'Seul le host peut démarrer la partie' });
    }

    // Vérifier qu'il y a assez de joueurs
    if (waitingRoom.players.length < 2) {
      return res.status(400).json({ error: 'Minimum 2 joueurs requis' });
    }

    // Convertir les utilisateurs en joueurs pour GameTable
    const players: Player[] = waitingRoom.players.map((rp, index) => ({
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

    // Créer une nouvelle partie
    const gameId = `game_${Date.now()}`;
    const gameTable = new GameTable(gameId, players);
    gameTable.startHand();

    // Sauvegarder la partie active
    await activeGames.set(gameId, gameTable);

    // Notifier via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('GAME_STARTED', { gameId });
    }

    // Mettre à jour le statut de la salle d'attente
    await prisma.waitingRoom.update({
      where: { id: roomId },
      data: { status: 'IN_GAME' }
    });

    // Sauvegarder l'historique
    await prisma.gameHistory.create({
      data: {
        id: gameId,
        tableId: roomId,
        gameId: gameId,
        board: [],
        pot: 0,
        winnerId: '',
      }
    });

    res.json({
      gameId,
      state: gameTable.getSanitizedState()
    });

  } catch (error) {
    console.error('Erreur démarrage partie:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/game/:gameId - Récupérer l'état d'une partie (?playerId= pour recevoir ses cartes)
router.get('/:gameId', async (req, res) => {
  const { gameId } = req.params;
  const playerId = typeof req.query.playerId === 'string' ? req.query.playerId : undefined;
  const game = await activeGames.get(gameId);
  console.log('🔍 Recherche de la partie:', gameId, 'Trouvée:', !!game);

  if (!game) {
    return res.status(404).json({ error: 'Partie introuvable' });
  }

  res.json(game.getSanitizedState(playerId));
});

// POST /api/game/:gameId/action - Effectuer une action
router.post('/:gameId/action', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId, action, amount } = req.body;

    const game = await activeGames.get(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Partie introuvable' });
    }

    game.handlePlayerAction(playerId, action, amount);
    
    res.json(game.getSanitizedState(playerId));

  } catch (error) {
    console.error('Erreur action:', error);
    res.status(400).json({ error: (error as Error).message });
  }
});

// GET /api/game/active - Liste des parties actives
router.get('/active/list', async (req, res) => {
  const allGames = await activeGames.getAll();
  const games = Array.from(allGames.entries()).map(([id, game]) => ({
    id,
    players: game.state.players.length,
    phase: game.state.phase
  }));
  res.json(games);
});

// POST /api/game/record-result - Enregistrer résultat d'une main (mode bot) et incrémenter les stats
router.post('/record-result', authMiddleware, async (req, res) => {
  try {
    const userId = (req as express.Request & { userId?: string }).userId;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { won, delta } = req.body as { won?: boolean; delta?: number };
    if (typeof won !== 'boolean') return res.status(400).json({ error: 'Body attendu: { won: boolean, delta?: number }' });

    const chipsDelta = typeof delta === 'number' && !Number.isNaN(delta) ? Math.trunc(delta) : 0;
    const chipsWon = chipsDelta > 0 ? chipsDelta : 0;
    const chipsLost = chipsDelta < 0 ? -chipsDelta : 0;

    await prisma.playerStats.upsert({
      where: { playerId: userId },
      create: {
        playerId: userId,
        totalGames: 1,
        totalWins: won ? 1 : 0,
        totalLosses: won ? 0 : 1,
        totalChipsWon: chipsWon,
        totalChipsLost: chipsLost,
      },
      update: {
        totalGames: { increment: 1 },
        ...(won ? { totalWins: { increment: 1 } } : { totalLosses: { increment: 1 } }),
        ...(chipsWon > 0 ? { totalChipsWon: { increment: chipsWon } } : {}),
        ...(chipsLost > 0 ? { totalChipsLost: { increment: chipsLost } } : {}),
      },
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Erreur record-result:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/game/history/:gameId - Récupérer l'historique d'une partie
router.get('/history/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;

    const actions = await prisma.gameAction.findMany({
      where: { gameId },
      orderBy: { timestamp: 'asc' },
      include: {
        player: {
          select: { username: true }
        }
      }
    });

    const result = await prisma.gameResult.findUnique({
      where: { gameId }
    });

    if (!actions.length && !result) {
      return res.status(404).json({ error: 'Historique introuvable' });
    }

    res.json({
      gameId,
      winner: result?.winnerId || null,
      date: result?.endedAt || null,
      actions: actions.map(a => ({
        action: a.action,
        amount: a.amount,
        timestamp: a.timestamp,
        player: a.player
      }))
    });

  } catch (error) {
    console.error('Erreur historique:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/game/stats/:playerId - Statistiques d'un joueur
router.get('/stats/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;

    const stats = await prisma.playerStats.findUnique({
      where: { playerId }
    });

    if (!stats) {
      return res.json({
        totalGames: 0,
        totalWins: 0,
        winRate: 0,
        biggestPot: 0
      });
    }

    res.json({
      ...stats,
      winRate: stats.totalGames > 0 ? (stats.totalWins / stats.totalGames) * 100 : 0
    });

  } catch (error) {
    console.error('Erreur stats:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;