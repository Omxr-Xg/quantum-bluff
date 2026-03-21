import express from 'express';
import { prisma } from '../config/database.js';
import { CashGameController } from '../logic/CashGameController.js';
import { activeGames } from '../shared/activeGames.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// POST /api/game/start - Démarrer une partie continue (cash game) depuis une salle d'attente
router.post('/start', async (req, res) => {
  try {
    const { roomId, hostId } = req.body;

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

    if (waitingRoom.hostId !== hostId) {
      return res.status(403).json({ error: 'Seul le host peut démarrer la partie' });
    }

    if (waitingRoom.players.length < 2) {
      return res.status(400).json({ error: 'Minimum 2 joueurs requis' });
    }

    const gameId = `game_${Date.now()}`;
    const cashGame = new CashGameController({
      id: gameId,
      roomId,
      maxSeats: 9,
      smallBlind: 1,
      bigBlind: 2,
      defaultBuyIn: 100
    });
    cashGame.initFromRoomPlayers(
      waitingRoom.players.map((rp) => ({
        userId: rp.user.id,
        username: rp.user.username,
        chips: Math.max(100, rp.user.chips ?? 1000)
      }))
    );
    cashGame.startHand();

    await activeGames.set(gameId, cashGame);

    const io = req.app.get('io') as import('socket.io').Server | undefined;
    if (io) {
      cashGame.setOnCountdownDone(async () => {
        cashGame.startHand();
        if (cashGame.isInHand()) {
          const socketsInRoom = await io.in(gameId).fetchSockets();
          for (const s of socketsInRoom) {
            const uid = (s as { userId?: string }).userId;
            s.emit('GAME_UPDATE', cashGame.getSanitizedState(uid));
          }
        } else {
          io.to(gameId).emit('CASH_WAITING_PLAYERS', cashGame.getSanitizedState());
        }
      });
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
      state: cashGame.getSanitizedState()
    });

  } catch (error) {
    console.error('Erreur démarrage partie:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/game/:gameId/room-info - Infos salle/host pour rematch (partie multi)
router.get('/:gameId/room-info', async (req, res) => {
  try {
    const { gameId } = req.params;
    const room = await prisma.waitingRoom.findFirst({
      where: { gameId },
      select: { id: true, hostId: true },
    });
    if (!room) return res.status(404).json({ error: 'Salle introuvable pour cette partie' });
    res.json({ roomId: room.id, hostId: room.hostId });
  } catch (error) {
    console.error('Erreur room-info:', error);
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

    // 1. Mise à jour des statistiques (Ton code d'origine)
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

    // 2. CORRECTION : Mise à jour du VRAI portefeuille du joueur ! 💰
    if (chipsDelta !== 0) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          chips: { increment: chipsDelta }
        }
      });
    }

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