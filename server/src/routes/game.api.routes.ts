import express from 'express';
import { prisma } from '../config/database.js';
import { activeGames } from '../shared/activeGames.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import rateLimit from 'express-rate-limit';
import { applyPokerAction } from '../poker/services/pokerActionOrchestrator.service.js';

const router = express.Router();
const gameReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

const gameActionLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop d’actions API. Réessaie dans quelques secondes.' }
});

// Démarrage de partie cash : utiliser uniquement POST /api/waiting-room/:roomId/start
// (blinds / minBalance, tous prêts, gameId persisté — évite doublon et états incohérents)

// GET /api/game/:gameId/room-info - Infos salle/host pour rematch (partie multi)
router.get('/:gameId/room-info', gameReadLimiter, async (req, res) => {
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
router.get('/:gameId', gameReadLimiter, async (req, res) => {
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
router.post('/:gameId/action', authMiddleware, gameActionLimiter, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId, action, amount, actionId, handId, expectedStreet } = req.body as {
      playerId?: string
      action?: 'FOLD' | 'CALL' | 'RAISE' | 'CHECK'
      amount?: number
      actionId?: string
      handId?: string
      expectedStreet?: string
    };
    const userId = (req as express.Request & { userId?: string }).userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié', code: 'UNAUTHORIZED' })
    if (String(userId) !== String(playerId)) {
      return res.status(403).json({ error: 'Action non autorisée', code: 'UNAUTHORIZED' })
    }

    const game = await activeGames.get(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Partie introuvable' });
    }

    await applyPokerAction({
      gameId,
      playerId,
      actionType: action,
      amount,
      actionId,
      handId,
      expectedStreet,
    });
    
    res.json(game.getSanitizedState(playerId));

  } catch (error) {
    const e = error as { code?: string; message?: string; httpStatus?: number }
    console.error('Erreur action:', error);
    res.status(e.httpStatus ?? 400).json({ error: e.message ?? (error as Error).message, code: e.code ?? 'ACTION_ERROR' });
  }
});

// GET /api/game/active - Liste des parties actives
router.get('/active/list', gameReadLimiter, async (req, res) => {
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

    const { won } = req.body as { won?: boolean };
    if (typeof won !== 'boolean') {
      return res.status(400).json({ error: 'Body attendu: { won: boolean }' });
    }

    // 1. Mise à jour des statistiques (Ton code d'origine)
    await prisma.playerStats.upsert({
      where: { playerId: userId },
      create: {
        playerId: userId,
        totalGames: 1,
        totalWins: won ? 1 : 0,
        totalLosses: won ? 0 : 1,
        totalChipsWon: 0,
        totalChipsLost: 0,
      },
      update: {
        totalGames: { increment: 1 },
        ...(won ? { totalWins: { increment: 1 } } : { totalLosses: { increment: 1 } }),
      },
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Erreur record-result:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/game/history/:gameId - Récupérer l'historique d'une partie
router.get('/history/:gameId', gameReadLimiter, async (req, res) => {
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
router.get('/stats/:playerId', gameReadLimiter, async (req, res) => {
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