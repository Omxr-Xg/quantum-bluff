import express from 'express'
import { randomUUID } from 'node:crypto'
import type { Server } from 'socket.io'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import { activeGames } from '../shared/activeGames.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import rateLimit from 'express-rate-limit'
import { applyPokerAction } from '../poker/services/pokerActionOrchestrator.service.js'
import { GameTable } from '../logic/GameTable.js'
import type { Player } from '../types/poker.js'
import {
  PRACTICE_BOT_GAME_PREFIX,
  registerPracticeBotGame,
} from '../shared/practiceBotGames.js'
import { runPracticeBotTurnsChain } from '../poker/services/practiceBotTurns.service.js'
import type { BotDifficulty } from '../logic/botAI.js'

const router = express.Router()
const gameReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
})

const gameActionLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop d’actions API. Réessaie dans quelques secondes.' },
})

// Démarrage de partie cash : utiliser uniquement POST /api/waiting-room/:roomId/start
// (blinds / minBalance, tous prêts, gameId persisté — évite doublon et états incohérents)

const PRACTICE_SB = 50
const PRACTICE_BB = 100
const BOT_TABLE_NAMES = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'] as const

const startPracticeBotBodySchema = z.object({
  botCount: z.number().int().min(1).max(5),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
  botChips: z.array(z.number().int().min(100)).min(1).max(5),
  humanChips: z.number().int().min(100).optional(),
})

// POST /api/game/bot/start — Partie contre bots (moteur GameTable + IA serveur)
router.post('/bot/start', authMiddleware, gameActionLimiter, async (req, res) => {
  try {
    const userId = (req as express.Request & { userId?: string }).userId
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié', code: 'UNAUTHORIZED' })
    }

    const parsed = startPracticeBotBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues.map((i) => i.message).join(', '),
      })
    }

    const { botCount, difficulty, botChips } = parsed.data
    const chipsSlice = botChips.slice(0, botCount)
    if (chipsSlice.length < botCount) {
      return res.status(400).json({ error: 'botChips doit couvrir chaque bot' })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, chips: true },
    })
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' })
    }
    if (user.chips < PRACTICE_BB * 2) {
      return res.status(400).json({ error: 'Solde insuffisant pour cette table' })
    }

    const wantHuman =
      typeof parsed.data.humanChips === 'number'
        ? parsed.data.humanChips
        : user.chips
    const humanStack = Math.min(Math.max(wantHuman, 100), user.chips)

    const players: Player[] = []
    for (let i = 0; i < botCount; i++) {
      const stack = chipsSlice[i] ?? 1000
      players.push({
        id: `qb-bot-${i + 1}`,
        name: `Bot ${BOT_TABLE_NAMES[i] ?? `Bot${i + 1}`}`,
        cards: [],
        chips: stack,
        role: 'PLAYER',
        isActive: true,
        isConnected: true,
      })
    }
    players.push({
      id: userId,
      name: user.username ?? 'Vous',
      cards: [],
      chips: humanStack,
      role: 'PLAYER',
      isActive: true,
      isConnected: true,
    })

    const gameId = `${PRACTICE_BOT_GAME_PREFIX}${randomUUID()}`
    const table = new GameTable(gameId, players, {
      smallBlind: PRACTICE_SB,
      bigBlind: PRACTICE_BB,
      liveBetWindowDisabled: true,
    })
    table.startHand({ handId: randomUUID() })
    await activeGames.set(gameId, table)
    registerPracticeBotGame(gameId, difficulty as BotDifficulty)

    const io = req.app.get('io') as Server | undefined
    if (io) {
      setTimeout(() => {
        void runPracticeBotTurnsChain(io, gameId).catch((err) => {
          console.error('[practice-bot] start chain failed:', err)
        })
      }, 0)
    }

    res.json({
      gameId,
      difficulty,
      smallBlind: PRACTICE_SB,
      bigBlind: PRACTICE_BB,
    })
  } catch (error) {
    console.error('Erreur bot/start:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/game/:gameId/room-info - Infos salle/host pour rematch (partie multi)
router.get('/:gameId/room-info', gameReadLimiter, async (req, res) => {
  try {
    const { gameId } = req.params
    const room = await prisma.waitingRoom.findFirst({
      where: { gameId },
      select: { id: true, hostId: true },
    })
    if (!room) return res.status(404).json({ error: 'Salle introuvable pour cette partie' })
    res.json({ roomId: room.id, hostId: room.hostId })
  } catch (error) {
    console.error('Erreur room-info:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/game/:gameId - Récupérer l'état d'une partie (?playerId= pour recevoir ses cartes)
router.get('/:gameId', gameReadLimiter, async (req, res) => {
  const { gameId } = req.params
  const playerId = typeof req.query.playerId === 'string' ? req.query.playerId : undefined
  const game = await activeGames.get(gameId)
  console.log('🔍 Recherche de la partie:', gameId, 'Trouvée:', !!game)

  if (!game) {
    return res.status(404).json({ error: 'Partie introuvable' })
  }

  res.json(game.getSanitizedState(playerId))
})

// POST /api/game/sync-balance - Synchroniser le solde réel du joueur connecté (portefeuille DB)
router.post('/sync-balance', authMiddleware, async (req, res) => {
  try {
    const userId = (req as express.Request & { userId?: string }).userId
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' })
    }

    return res.json({
      chips: user.chips,
      balance: user.chips,
    })
  } catch (error) {
    console.error('Erreur sync-balance:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/game/:gameId/action - Effectuer une action
router.post('/:gameId/action', authMiddleware, gameActionLimiter, async (req, res) => {
  try {
    const { gameId } = req.params
    const { playerId, action, amount, actionId, handId, expectedStreet } = req.body as {
      playerId?: string
      action?: 'FOLD' | 'CALL' | 'RAISE' | 'CHECK'
      amount?: number
      actionId?: string
      handId?: string
      expectedStreet?: string
    }
    const userId = (req as express.Request & { userId?: string }).userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié', code: 'UNAUTHORIZED' })
    if (String(userId) !== String(playerId)) {
      return res.status(403).json({ error: 'Action non autorisée', code: 'UNAUTHORIZED' })
    }

    const game = await activeGames.get(gameId)
    if (!game) {
      return res.status(404).json({ error: 'Partie introuvable' })
    }

    await applyPokerAction({
      gameId,
      playerId,
      actionType: action,
      amount,
      actionId,
      handId,
      expectedStreet,
    })

    res.json(game.getSanitizedState(playerId))
  } catch (error) {
    const e = error as { code?: string; message?: string; httpStatus?: number }
    console.error('Erreur action:', error)
    res.status(e.httpStatus ?? 400).json({
      error: e.message ?? (error as Error).message,
      code: e.code ?? 'ACTION_ERROR',
    })
  }
})

// GET /api/game/active - Liste des parties actives
router.get('/active/list', gameReadLimiter, async (req, res) => {
  const allGames = await activeGames.getAll()
  const games = Array.from(allGames.entries()).map(([id, game]) => ({
    id,
    players: game.state.players.length,
    phase: game.state.phase,
  }))
  res.json(games)
})

// POST /api/game/record-result - Enregistrer résultat d'une main (mode bot) et incrémenter les stats
router.post('/record-result', authMiddleware, async (req, res) => {
  try {
    const userId = (req as express.Request & { userId?: string }).userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const { won, delta } = req.body as { won?: boolean; delta?: number }
    if (typeof won !== 'boolean') {
      return res
        .status(400)
        .json({ error: 'Body attendu: { won: boolean, delta?: number }' })
    }

    const chipsDelta =
      typeof delta === 'number' && !Number.isNaN(delta) ? Math.trunc(delta) : 0
    const chipsWon = chipsDelta > 0 ? chipsDelta : 0
    const chipsLost = chipsDelta < 0 ? -chipsDelta : 0

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
    })

    if (chipsDelta !== 0) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          chips: { increment: chipsDelta },
        },
      })
    }

    res.json({ ok: true })
  } catch (error) {
    console.error('Erreur record-result:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/game/history/:gameId - Récupérer l'historique d'une partie
router.get('/history/:gameId', gameReadLimiter, async (req, res) => {
  try {
    const { gameId } = req.params

    const actions = await prisma.gameAction.findMany({
      where: { gameId },
      orderBy: { timestamp: 'asc' },
      include: {
        player: {
          select: { username: true },
        },
      },
    })

    const result = await prisma.gameResult.findUnique({
      where: { gameId },
    })

    if (!actions.length && !result) {
      return res.status(404).json({ error: 'Historique introuvable' })
    }

    res.json({
      gameId,
      winner: result?.winnerId || null,
      date: result?.endedAt || null,
      actions: actions.map((a) => ({
        action: a.action,
        amount: a.amount,
        timestamp: a.timestamp,
        player: a.player,
      })),
    })
  } catch (error) {
    console.error('Erreur historique:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/game/stats/:playerId - Statistiques d'un joueur
router.get('/stats/:playerId', gameReadLimiter, async (req, res) => {
  try {
    const { playerId } = req.params

    const stats = await prisma.playerStats.findUnique({
      where: { playerId },
    })

    if (!stats) {
      return res.json({
        totalGames: 0,
        totalWins: 0,
        winRate: 0,
        biggestPot: 0,
      })
    }

    res.json({
      ...stats,
      winRate: stats.totalGames > 0 ? (stats.totalWins / stats.totalGames) * 100 : 0,
    })
  } catch (error) {
    console.error('Erreur stats:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
