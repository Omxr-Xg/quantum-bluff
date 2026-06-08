import express from 'express';
import { prisma } from '../config/database.js';
import { CashGameController, TURBO_TURN_TIMEOUT_MS } from '../logic/CashGameController.js';
import { activeGames } from '../shared/activeGames.js';
import { intChips } from '../utils/chips.js';
import { appendWalletLedgerEntry } from '../casino/services/walletLedger.service.js';
import { createPokerCashLedgerContext } from '../poker/cash/pokerCashLedger.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { sanitizePublicAvatarUrl } from '../utils/avatarUrl.js';
import { resolvePublicCosmetics } from '../shop/publicCosmetics.js';
import { clientAvatarUrlFromUser } from '../utils/userAvatarPublic.js';
import sanitizeHtml from 'sanitize-html';
import rateLimit from 'express-rate-limit';
import { prismaKnownRequestCode } from '../utils/prismaKnownRequestCode.js';
import type { Server } from 'socket.io';
import { getGameIo } from '../sockets/gameIo.registry.js';
import { getWaitingRoomPresentUserIds } from '../services/waitingRoomPresence.service.js';

const router = express.Router();

/** évite une tempête de logs si la liste des salles est polluée très souvent */
let warnedMissingUserBlocksTable = false;

/** Partie poker encore présente dans le runtime (cache local). */
function isAttachedGameLive(gameId: string | null | undefined): boolean {
  if (!gameId) return false;
  return Boolean(activeGames.getSync(gameId));
}

type BlockedRoomPlayer = { id: string; username: string }

async function getBlockedPlayersForViewer(
  viewerId: string | undefined,
  players: Array<{ userId: string; user?: { username?: string } | null }>,
): Promise<BlockedRoomPlayer[]> {
  if (!viewerId) return []
  const playerIds = players.map((p) => p.userId).filter((id) => id && id !== viewerId)
  if (playerIds.length === 0) return []

  let blocks: { blockedId: string }[]
  try {
    blocks = await prisma.userBlock.findMany({
      where: {
        blockerId: viewerId,
        blockedId: { in: playerIds },
      },
      select: { blockedId: true },
    })
  } catch (e) {
    if (prismaKnownRequestCode(e) === 'P2021') {
      if (!warnedMissingUserBlocksTable) {
        warnedMissingUserBlocksTable = true;
        console.warn(
          '[waiting-room] Table `user_blocks` absente — exécutez `cd server && npx prisma migrate deploy`. ' +
          'Blocages utilisateur ignorés jusqu’à migration.',
        );
      }
      return []
    }
    throw e
  }
  const blockedIds = new Set(blocks.map((b) => b.blockedId))
  return players
    .filter((p) => blockedIds.has(p.userId))
    .map((p) => ({ id: p.userId, username: p.user?.username || 'Utilisateur bloqué' }))
}

async function getBlockedUserIds(viewerId: string | undefined): Promise<Set<string>> {
  if (!viewerId) return new Set()
  let blocks: { blockedId: string }[]
  try {
    blocks = await prisma.userBlock.findMany({
      where: { blockerId: viewerId },
      select: { blockedId: true },
    })
  } catch (e) {
    if (prismaKnownRequestCode(e) === 'P2021') {
      if (!warnedMissingUserBlocksTable) {
        warnedMissingUserBlocksTable = true;
        console.warn(
          '[waiting-room] Table `user_blocks` absente — exécutez `cd server && npx prisma migrate deploy`. ' +
          'Blocages utilisateur ignorés jusqu’à migration.',
        );
      }
      return new Set()
    }
    throw e
  }
  return new Set(blocks.map((block) => block.blockedId))
}

const waitingRoomListLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});

const waitingRoomCreateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de créations de salles. Réessaie plus tard.' }
});

const waitingRoomJoinLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false
});

const waitingRoomActionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});

const waitingRoomHostLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessaie dans quelques minutes.', code: 'RATE_LIMITED' },
});

const formatWaitingRoomPayload = (room: {
  id: string
  name: string
  hostId: string
  maxPlayers: number
  visibility: 'PUBLIC' | 'PRIVATE'
  status: 'WAITING' | 'IN_GAME'
  turbo?: boolean
  players: Array<{
    isReady: boolean
    position: number | null
    avatarUrl?: string | null
    user: {
      id: string
      username: string
      level: number
      avatarUrl?: string | null
      avatarHasBinary?: boolean
      equippedBannerId?: string | null
      equippedFrameId?: string | null
      equippedTitleId?: string | null
    }
  }>
}) => ({
  id: room.id,
  name: room.name,
  hostId: room.hostId,
  maxPlayers: room.maxPlayers,
  visibility: room.visibility,
  status: room.status,
  turbo: room.turbo ?? false,
  players: room.players.map((p) => mapWaitingRoomPlayer(p)),
})

function mapWaitingRoomPlayer(p: {
  isReady: boolean
  position: number | null
  avatarUrl?: string | null
  user: {
    id: string
    username: string
    level: number
    avatarUrl?: string | null
    avatarHasBinary?: boolean
    equippedBannerId?: string | null
    equippedFrameId?: string | null
    equippedTitleId?: string | null
  }
}) {
  return {
    id: p.user.id,
    username: p.user.username,
    level: p.user.level,
    isReady: p.isReady,
    position: p.position,
    avatarUrl: p.avatarUrl ?? clientAvatarUrlFromUser(p.user),
    cosmetics: resolvePublicCosmetics(p.user),
  }
}

const waitingRoomUserSelect = {
  id: true,
  username: true,
  level: true,
  avatarUrl: true,
  avatarHasBinary: true,
  equippedBannerId: true,
  equippedFrameId: true,
  equippedTitleId: true,
} as const

const waitingRoomPlayersInclude = {
  players: {
    include: {
      user: {
        select: waitingRoomUserSelect,
      },
    },
  },
} as const

function withWaitingRoomPresence<T extends { id: string }>(
  io: Server | undefined,
  payload: T,
): T & { presentUserIds: string[] } {
  return {
    ...payload,
    presentUserIds: getWaitingRoomPresentUserIds(io, payload.id),
  }
}

export async function emitWaitingRoomUpdated(
  roomId: string,
  io?: Server,
): Promise<void> {
  const socketIo = io ?? getGameIo()
  if (!socketIo) return
  const room = await prisma.waitingRoom.findUnique({
    where: { id: roomId },
    include: waitingRoomPlayersInclude,
  })
  if (!room) {
    socketIo.to(roomId).emit('WAITING_ROOM_UPDATED', null)
    return
  }
  const payload = withWaitingRoomPresence(
    socketIo,
    formatWaitingRoomPayload(room as never),
  )
  socketIo.to(roomId).emit('WAITING_ROOM_UPDATED', payload)
}

// Fonction utilitaire pour nettoyer le nom de la salle
//const sanitizeRoomName = (roomName: string) => sanitizeHtml(roomName);

function getAuthenticatedUserId(req: express.Request): string | null {
  return typeof req.userId === 'string' && req.userId.trim() ? req.userId : null
}

// GET /api/waiting-room - Liste toutes les salles disponibles
// Filtre : au moins 1 joueur actif, créées dans la dernière heure
// Salles PRIVATE : visibles uniquement par l'hôte et ses amis
router.get('/', waitingRoomListLimiter, authMiddleware, async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req) ?? undefined;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const rooms = await prisma.waitingRoom.findMany({
      where: {
        status: 'WAITING',
        createdAt: { gte: oneHourAgo }
      },
      include: {
        players: {
          include: {
            user: {
              select: waitingRoomUserSelect,
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const blockedUserIds = await getBlockedUserIds(userId);
    let filteredRooms = rooms.filter(room => room.players.length >= 1);
    if (userId) {
      filteredRooms = filteredRooms.filter((room) => !blockedUserIds.has(room.hostId));
    }
    if (userId) {
      const myFriends = new Set<string>();
      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }]
        }
      });
      for (const f of friendships) {
        myFriends.add(String(f.user1Id) === userId ? f.user2Id : f.user1Id);
      }
      /** Salles où l’utilisateur a une demande en cours ou refusée : il doit pouvoir renvoyer une demande. */
      const myJoinRequestRoomIds = new Set(
        (
          await prisma.joinRequest.findMany({
            where: {
              userId,
              status: { in: ['PENDING', 'REJECTED'] },
            },
            select: { roomId: true },
          })
        ).map((r) => r.roomId),
      );
      filteredRooms = filteredRooms.filter(room => {
        if (room.visibility === 'PUBLIC') return true;
        if (room.players.some((p) => p.userId === userId)) return true;
        if (myJoinRequestRoomIds.has(room.id)) return true;
        if (room.hostId === userId) return true;
        if (myFriends.has(room.hostId)) return true;
        const playerIds = room.players
          .map(p => p.userId)
          .filter((pid) => pid && !blockedUserIds.has(pid));
        const hasFriendInRoom = playerIds.some(pid => myFriends.has(pid));
        return hasFriendInRoom;
      });
    } else {
      filteredRooms = filteredRooms.filter(room => room.visibility === 'PUBLIC');
    }

    const formattedRooms = await Promise.all(
      filteredRooms.map(async (room) => ({
        id: room.id,
        name: room.name,
        hostId: room.hostId,
        maxPlayers: room.maxPlayers,
        visibility: room.visibility,
        status: room.status,
        turbo: room.turbo,
        players: room.players
          .filter((p): p is typeof p & { user: NonNullable<typeof p.user> } => p.user != null)
          .map((p) => mapWaitingRoomPlayer(p)),
        playerCount: room.players.length,
        minBalance: room.minBalance ?? null,
        smallBlind: room.smallBlind ?? null,
        bigBlind: room.bigBlind ?? null,
        blockedPlayers: await getBlockedPlayersForViewer(userId, room.players),
      })),
    );

    res.json(formattedRooms);
  } catch (error) {
    console.error('Erreur liste salles:', error);
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Erreur serveur', details: process.env.NODE_ENV === 'development' ? msg : undefined });
  }
});

// GET /api/waiting-room/active/games - Liste des parties actives (doit être avant /:roomId)
router.get('/active/games', waitingRoomListLimiter, async (req, res) => {
  try {
    const allGames = await activeGames.getAll();
    const games = Array.from(allGames.entries()).map(([id, game]) => ({
      id,
      players: game?.state?.players?.length ?? 0,
      phase: game?.state?.phase ?? 'UNKNOWN'
    }));
    res.json(games);
  } catch (error) {
    console.error('Erreur active/games:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

const GAME_MAX_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// GET /api/waiting-room/games-in-progress - Parties en cours (Rejoindre si place, Spectateur)
// Salles PRIVATE : visibles par l'hôte, ses amis, ou toute personne ayant un ami dans la partie
router.get('/games-in-progress', waitingRoomListLimiter, authMiddleware, async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req) ?? undefined;
    const rooms = await prisma.waitingRoom.findMany({
      where: { status: 'IN_GAME', gameId: { not: null } },
      include: {
        players: { include: { user: { select: { username: true } } } },
      },
      orderBy: { createdAt: 'desc' }
    });
    const result = [];
    const now = Date.now();
    let myFriends: Set<string> = new Set();
    const blockedUserIds = await getBlockedUserIds(userId);
    if (userId) {
      const friendships = await prisma.friendship.findMany({
        where: { OR: [{ user1Id: userId }, { user2Id: userId }] }
      });
      for (const f of friendships) {
        myFriends.add(String(f.user1Id) === userId ? f.user2Id : f.user1Id);
      }
    }
    for (const room of rooms) {
      if (!room.gameId) continue;
      if (userId && blockedUserIds.has(room.hostId)) continue;
      if (!activeGames.getSync(room.gameId)) continue;
      if (room.visibility === 'PRIVATE') {
        if (!userId) continue;
        if (room.hostId === userId || myFriends.has(room.hostId)) {
          // OK - host or friend of host
        } else {
          let hasFriendInGame = false;
          try {
            const game = await activeGames.get(room.gameId);
            if (game instanceof CashGameController) {
              const seats = (game as CashGameController).getOccupiedSeats();
              hasFriendInGame = seats.some(s => s.userId != null && !blockedUserIds.has(s.userId) && myFriends.has(s.userId));
            } else if (game?.state?.players) {
              hasFriendInGame = game.state.players.some((p: { id?: string }) => p.id && !blockedUserIds.has(p.id) && myFriends.has(p.id));
            }
          } catch {
            void 0; // jeu absent du cache ou erreur lecture — on exclut si pas d’ami détecté
          }
          if (!hasFriendInGame) continue;
        }
      }
      // Exclure les parties de plus de 15 min (gameId = game_<timestamp> ou updatedAt)
      const match = room.gameId.match(/^game_(\d+)$/);
      const startedAt = match ? parseInt(match[1], 10) : room.updatedAt.getTime();
      if (now - startedAt > GAME_MAX_DURATION_MS) continue;
      try {
        const game = await activeGames.get(room.gameId);
        if (!game?.state) continue;
        const isCashGame = game instanceof CashGameController;
        const occupiedCount = isCashGame ? (game as CashGameController).getOccupiedCount() : (game.state.players?.length ?? 0);
        if (occupiedCount === 0) continue; // Partie vide = ne pas afficher
        const maxSeats = isCashGame ? 9 : room.maxPlayers;
        const canJoin = isCashGame && occupiedCount < maxSeats;
      result.push({
        roomId: room.id,
        roomName: room.name,
        gameId: room.gameId,
        playerCount: occupiedCount,
        maxPlayers: maxSeats,
        phase: game.state.phase ?? 'WAITING',
        canJoin,
        blockedPlayers: await getBlockedPlayersForViewer(userId, room.players),
      });
      } catch (roomErr) {
        console.warn('Erreur salle', room.id, room.gameId, roomErr);
      }
    }
    res.json(result);
  } catch (error) {
    console.error('Erreur games-in-progress:', error);
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Erreur serveur', details: process.env.NODE_ENV === 'development' ? msg : undefined });
  }
});

// POST /api/waiting-room/create - Créer une nouvelle salle
router.post('/create', waitingRoomCreateLimiter, authMiddleware, async (req, res) => {
  try {
    const hostId = getAuthenticatedUserId(req);
    const { roomName, maxPlayers = 5, visibility = 'PUBLIC', smallBlind, bigBlind, minBalance, turbo, avatarUrl: hostAvatarRaw } = req.body;
    const hostAvatarUrl = sanitizePublicAvatarUrl(hostAvatarRaw)

    if (!hostId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (roomName != null && typeof roomName !== 'string') {
      return res.status(400).json({ error: 'roomName doit être une chaîne de caractères' });
    }

    if (visibility !== 'PUBLIC' && visibility !== 'PRIVATE') {
      return res.status(400).json({ error: 'visibility invalide (PUBLIC ou PRIVATE attendu)' });
    }

    const parsedMaxPlayers = Number(maxPlayers);
    if (!Number.isFinite(parsedMaxPlayers) || parsedMaxPlayers < 2 || parsedMaxPlayers > 5) {
      return res.status(400).json({ error: 'maxPlayers doit être un nombre entre 2 et 5' });
    }

    const clampedMaxPlayers = Math.min(5, Math.max(2, parsedMaxPlayers));
    const roomVisibility = visibility;

    const sb = smallBlind != null ? Math.max(1, Math.min(10000, Number(smallBlind) || 1)) : null;
    const bb = bigBlind != null ? Math.max(1, Math.min(10000, Number(bigBlind) || 2)) : null;
    const minB = minBalance != null ? Math.max(100, Math.min(1000000, Number(minBalance) || 100)) : null;

    const user = await prisma.user.findUnique({
      where: { id: hostId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const ROOM_NAME_MAX = 80
    const trimmedRequested =
      typeof roomName === 'string' ? roomName.trim().slice(0, ROOM_NAME_MAX) : ''
    const sanitizedCustom =
      trimmedRequested.length > 0 ? sanitizeHtml(trimmedRequested).trim() : ''
    const resolvedName =
      sanitizedCustom.length > 0 ? sanitizedCustom : `Salle de ${user.username}`

    const room = await prisma.waitingRoom.create({
      data: {
        name: resolvedName,
        hostId,
        maxPlayers: clampedMaxPlayers,
        visibility: roomVisibility,
        smallBlind: sb,
        bigBlind: bb,
        minBalance: minB,
        turbo: turbo === true,
        players: {
          create: {
            userId: hostId,
            isReady: false,
            position: 0,
            avatarUrl: hostAvatarUrl
          }
        }
      },
      include: {
        players: {
          include: {
            user: {
              select: waitingRoomUserSelect,
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
      turbo: room.turbo,
      players: room.players.map((p) => mapWaitingRoomPlayer(p)),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[waiting-room/create] Erreur création salle', {
      hostId: req.userId,
      visibility: req.body?.visibility,
      maxPlayers: req.body?.maxPlayers,
      detail: msg,
    });
    res.status(500).json({ error: 'Erreur serveur', details: process.env.NODE_ENV === 'development' ? msg : undefined });
  }
});

// POST /api/waiting-room/rematch - Host: créer une nouvelle salle avec les mêmes membres
router.post('/rematch', waitingRoomHostLimiter, authMiddleware, async (req, res) => {
  try {
    const userId = (req as express.Request & { userId?: string }).userId;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { gameId } = req.body as { gameId?: string };
    if (!gameId) return res.status(400).json({ error: 'gameId requis' });

    const oldRoom = await prisma.waitingRoom.findFirst({
      where: { gameId },
      include: {
        players: {
          include: {
            user: {
              select: { id: true, username: true, chips: true }
            }
          }
        }
      },
    });

    if (!oldRoom) return res.status(404).json({ error: 'Partie introuvable' });
    if (oldRoom.hostId !== userId) return res.status(403).json({ error: 'Seul l\'hôte peut relancer avec les mêmes membres' });

    const hostUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!hostUser) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const newRoom = await prisma.waitingRoom.create({
      data: {
        name: `Revanche - ${oldRoom.name}`,
        hostId: userId,
        maxPlayers: oldRoom.maxPlayers,
        visibility: oldRoom.visibility,
        turbo: oldRoom.turbo,
        players: {
          create: oldRoom.players.map((rp, idx) => ({
            userId: rp.userId,
            isReady: false,
            position: idx,
            avatarUrl: rp.avatarUrl ?? null,
          })),
        },
      },
    });

    const io = req.app.get('io') as import('socket.io').Server | undefined;
    if (io) {
      io.to(gameId).emit('REMATCH_CREATED', { newRoomId: newRoom.id });
    }

    res.json({ newRoomId: newRoom.id });
  } catch (error) {
    console.error('Erreur rematch:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/waiting-room/:roomId - Détails d'une salle
router.get('/:roomId', waitingRoomListLimiter, authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const viewerId = getAuthenticatedUserId(req) ?? undefined;

    const room = await prisma.waitingRoom.findUnique({
      where: { id: roomId },
      include: {
        players: {
          include: {
            user: {
              select: waitingRoomUserSelect,
            }
          }
        }
      }
    });

    if (!room) {
      return res.status(404).json({ error: 'Salle non trouvée' });
    }

    if (room.status === 'IN_GAME' && !isAttachedGameLive(room.gameId)) {
      return res.status(410).json({
        error: 'Cette partie est terminée ou n’est plus disponible.',
        code: 'ROOM_GAME_ENDED',
      });
    }

    if (viewerId) {
      const blockedUserIds = await getBlockedUserIds(viewerId);
      if (blockedUserIds.has(room.hostId)) {
        return res.status(404).json({ error: 'Salle non trouvée' });
      }
    }

    const io = req.app.get('io') as Server | undefined
    res.json({
      id: room.id,
      name: room.name,
      hostId: room.hostId,
      maxPlayers: room.maxPlayers,
      visibility: room.visibility,
      status: room.status,
      turbo: room.turbo,
      minBalance: room.minBalance ?? null,
      smallBlind: room.smallBlind ?? null,
      bigBlind: room.bigBlind ?? null,
      blockedPlayers: await getBlockedPlayersForViewer(viewerId, room.players),
      presentUserIds: getWaitingRoomPresentUserIds(io, roomId),
      players: room.players.map((p) => mapWaitingRoomPlayer(p)),
    });
  } catch (error) {
    console.error('Erreur récupération salle:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/waiting-room/:roomId/join - Rejoindre une salle
router.post('/:roomId/join', waitingRoomJoinLimiter, authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = getAuthenticatedUserId(req);
    const { avatarUrl: joinAvatarRaw, confirmBlockedWarning } = req.body;
    const joinAvatarUrl = sanitizePublicAvatarUrl(joinAvatarRaw)

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // Vérifier que la salle existe et est en WAITING
    const room = await prisma.waitingRoom.findUnique({
      where: { id: roomId },
      include: {
        players: {
          include: {
            user: { select: { username: true } },
          },
        },
      }
    });

    if (!room) {
      return res.status(404).json({ error: 'Salle non trouvée' });
    }

    if (room.status === 'IN_GAME' && !isAttachedGameLive(room.gameId)) {
      return res.status(410).json({
        error: 'Cette partie est terminée ou n’est plus disponible.',
        code: 'ROOM_GAME_ENDED',
      });
    }

    const blockedUserIds = await getBlockedUserIds(userId);
    if (blockedUserIds.has(room.hostId)) {
      return res.status(404).json({ error: 'Salle non trouvée' });
    }

    if (room.status !== 'WAITING') {
      return res.status(400).json({ error: 'La partie a déjà commencé' });
    }

    if (room.players.length >= room.maxPlayers) {
      return res.status(400).json({ error: 'Salle pleine' });
    }

    const existingRow = room.players.find(p => p.userId === userId);
    if (existingRow) {
      const updatedRoom = await prisma.waitingRoom.update({
        where: { id: roomId },
        data: {
          players: {
            update: {
              where: { id: existingRow.id },
              data: { avatarUrl: joinAvatarUrl ?? existingRow.avatarUrl }
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
                  level: true,
                  avatarUrl: true,
                  avatarHasBinary: true,
                }
              }
            }
          }
        }
      })
      const io0 = req.app.get('io') as Server | undefined;
      const payload = withWaitingRoomPresence(io0, formatWaitingRoomPayload(updatedRoom as never));
      io0?.to(roomId).emit('WAITING_ROOM_UPDATED', payload);
      return res.json(payload);
    }

    const blockedPlayers = await getBlockedPlayersForViewer(userId, room.players);
    if (blockedPlayers.length > 0 && confirmBlockedWarning !== true) {
      return res.status(409).json({
        error: 'Cette salle contient un utilisateur que vous avez bloqué.',
        code: 'BLOCKED_USER_IN_ROOM',
        blockedPlayers,
      });
    }

    if (room.visibility === 'PRIVATE' && room.hostId !== userId) {
      const approved = await prisma.joinRequest.findFirst({
        where: { roomId, userId, status: 'ACCEPTED' }
      });
      if (!approved) {
        return res.status(403).json({ error: 'Cette salle est privée. Envoyez une demande.' });
      }
    }

    if (room.minBalance != null && room.minBalance > 0) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { chips: true }
      });
      const userChips = Math.floor(Number(user?.chips ?? 0));
      if (userChips < room.minBalance) {
        return res.status(400).json({
          error: `Jetons insuffisants. Il faut au moins ${room.minBalance} jetons pour rejoindre cette salle.`,
          code: 'INSUFFICIENT_CHIPS',
          required: room.minBalance,
          current: userChips
        });
      }
    }

    const updatedRoom = await prisma.waitingRoom.update({
      where: { id: roomId },
      data: {
        players: {
          create: {
            userId,
            isReady: false,
            position: room.players.length,
            avatarUrl: joinAvatarUrl
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
                level: true,
                avatarUrl: true,
                avatarHasBinary: true,
              }
            }
          }
        }
      }
    });

    const io = req.app.get('io') as Server | undefined;
    const payload = withWaitingRoomPresence(io, formatWaitingRoomPayload(updatedRoom as never));
    io?.to(roomId).emit('WAITING_ROOM_UPDATED', payload);
    res.json(payload);
  } catch (error) {
    console.error('Erreur rejoindre salle:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/waiting-room/:roomId/leave - Quitter une salle
router.post('/:roomId/leave', waitingRoomActionLimiter, authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = getAuthenticatedUserId(req);
    const io = req.app.get('io') as import('socket.io').Server | undefined;

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const roomBefore = await prisma.waitingRoom.findUnique({
      where: { id: roomId },
      include: { players: true }
    });

    if (!roomBefore) {
      return res.status(404).json({ error: 'Salle introuvable' });
    }

    const isMember =
      roomBefore.players.some((p) => p.userId === userId) || roomBefore.hostId === userId;

    /* Idempotent : double clic, navigation + effet, sendBeacon au unload — évite 403 inutiles. */
    if (!isMember) {
      return res.json({ message: 'Déjà absent', alreadyLeft: true });
    }

    // L'hôte quitte : s'il est seul, on supprime la salle ; sinon le premier autre joueur devient hôte
    if (roomBefore.hostId === userId) {
      const others = roomBefore.players
        .filter((p) => p.userId !== userId)
        .sort((a, b) => {
          const pa = a.position == null ? 9999 : a.position;
          const pb = b.position == null ? 9999 : b.position;
          if (pa !== pb) return pa - pb;
          return a.userId.localeCompare(b.userId);
        });

      if (others.length === 0) {
        await prisma.waitingRoom.delete({ where: { id: roomId } });
        io?.to(roomId).emit('WAITING_ROOM_CLOSED_BY_HOST', { roomId });
        io?.to(roomId).emit('WAITING_ROOM_UPDATED', null);
        return res.json({ message: 'Salle fermée par l\'hôte', closedByHost: true });
      }

      const newHostId = others[0].userId;

      await prisma.roomPlayer.deleteMany({
        where: { roomId, userId }
      });

      await prisma.waitingRoom.update({
        where: { id: roomId },
        data: { hostId: newHostId }
      });

      io?.to(roomId).emit('PLAYER_LEFT', { roomId, userId, scope: 'WAITING_ROOM' });

      const refreshedAfterHostLeave = await prisma.waitingRoom.findUnique({
        where: { id: roomId },
        include: {
          players: {
            include: {
              user: {
                select: { id: true, username: true, level: true, avatarUrl: true, avatarHasBinary: true }
              }
            }
          }
        }
      });
      if (refreshedAfterHostLeave) {
        const payload = withWaitingRoomPresence(
          io,
          formatWaitingRoomPayload(refreshedAfterHostLeave as never),
        );
        io?.to(roomId).emit('WAITING_ROOM_UPDATED', payload);
      }

      return res.json({
        message: 'Hôte transféré',
        newHostId,
        hostTransferred: true
      });
    }

    await prisma.roomPlayer.deleteMany({
      where: {
        roomId,
        userId
      }
    });

    const room = await prisma.waitingRoom.findUnique({
      where: { id: roomId },
      include: { players: true }
    });

    io?.to(roomId).emit('PLAYER_LEFT', { roomId, userId, scope: 'WAITING_ROOM' });

    if (room && room.players.length === 0) {
      await prisma.waitingRoom.delete({
        where: { id: roomId }
      });
      io?.to(roomId).emit('WAITING_ROOM_UPDATED', null);
      return res.json({ message: 'Salle supprimée', empty: true });
    }

    if (room) {
      const refreshed = await prisma.waitingRoom.findUnique({
        where: { id: roomId },
        include: {
          players: {
            include: {
              user: {
                select: { id: true, username: true, level: true, avatarUrl: true, avatarHasBinary: true }
              }
            }
          }
        }
      });
      if (refreshed) {
        const payload = withWaitingRoomPresence(io, formatWaitingRoomPayload(refreshed as never));
        io?.to(roomId).emit('WAITING_ROOM_UPDATED', payload);
      }
    }

    res.json({ message: 'Joueur retiré' });
  } catch (error) {
    console.error('Erreur quitter salle:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/waiting-room/:roomId/ready - Changer statut prêt
router.put('/:roomId/ready', waitingRoomActionLimiter, authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = getAuthenticatedUserId(req);
    const { isReady } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const player = await prisma.roomPlayer.update({
      where: {
        roomId_userId: {
          roomId,
          userId
        }
      },
      data: { isReady }
    });

    const io = req.app.get('io') as import('socket.io').Server | undefined;
    const refreshed = await prisma.waitingRoom.findUnique({
      where: { id: roomId },
      include: {
        players: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                level: true,
                avatarUrl: true,
                avatarHasBinary: true,
              }
            }
          }
        }
      }
    });
    if (refreshed) {
      const payload = withWaitingRoomPresence(io, formatWaitingRoomPayload(refreshed as never));
      io?.to(roomId).emit('WAITING_ROOM_UPDATED', payload);
    }

    res.json({ isReady: player.isReady });
  } catch (error) {
    console.error('Erreur changement statut:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/waiting-room/:roomId/start - Démarrer la partie
// POST /api/waiting-room/:roomId/start - Démarrer la partie
router.post('/:roomId/start', waitingRoomHostLimiter, authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = getAuthenticatedUserId(req);
    const { turnTimeoutMs, turbo } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

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
      return res.status(404).json({
        error: 'Salle non trouvée',
        code: 'WAITING_ROOM_NOT_FOUND',
      });
    }

    if (room.hostId !== userId) {
      return res.status(403).json({
        error: 'Seul l\'hôte peut démarrer',
        code: 'WAITING_ROOM_START_NOT_HOST',
      });
    }

    if (room.players.length < 2) {
      return res.status(400).json({
        error: 'Pas assez de joueurs',
        code: 'WAITING_ROOM_NOT_ENOUGH_PLAYERS',
        minPlayers: 2,
        current: room.players.length,
      });
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
        code: 'WAITING_ROOM_NOT_ALL_READY',
        notReadyPlayers: notReadyPlayers.map(p => p.name),
      });
    }

    // 🔥 CRÉATION DE LA PARTIE (cash game pour permettre spectateurs + rejoindre à la prochaine manche)
    const sb = room.smallBlind ?? 1;
    const bb = room.bigBlind ?? sb * 2;
    const minBal =
      room.minBalance != null && room.minBalance > 0 ? intChips(room.minBalance) : 100;

    for (const rp of room.players) {
      const w = intChips(rp.user.chips ?? 0);
      if (w < minBal) {
        return res.status(400).json({
          error: `Impossible de démarrer : ${rp.user.username} n'a que ${w} jetons en poche (minimum requis : ${minBal}).`,
          code: 'START_INSUFFICIENT_CHIPS',
          playerId: rp.user.id,
          required: minBal,
          current: w,
        });
      }
    }

    const gameId = `game_${Date.now()}`;
    const cashGame = new CashGameController({
      id: gameId,
      roomId,
      maxSeats: 9,
      smallBlind: sb,
      bigBlind: bb,
      defaultBuyIn: minBal,
      turnTimeoutMs:
        typeof turnTimeoutMs === 'number'
          ? turnTimeoutMs
          : turbo === true || room.turbo
            ? TURBO_TURN_TIMEOUT_MS
            : undefined,
    });
    cashGame.initFromRoomPlayers(
      room.players.map((rp) => ({
        userId: rp.user.id,
        username: rp.user.username,
        chips: cashGame.effectiveSitBuyInAmount(intChips(rp.user.chips ?? 0)),
        // Fallback : si le snapshot RoomPlayer.avatarUrl est vide, on prend
        // l'avatar persistant du profil pour que la photo s'affiche en partie
        // (cohérent avec la page Amis et la salle d'attente).
        avatarUrl: rp.avatarUrl ?? clientAvatarUrlFromUser(rp.user),
      }))
    );
    cashGame.startHand();

    const openHandId = cashGame.getGameTable()?.state.handId ?? 'table-open';
    const seatDebits = cashGame
      .getOccupiedSeats()
      .filter((s) => s.userId != null)
      .map((s) => ({ userId: s.userId as string, amount: intChips(s.chips) }));

    try {
      await prisma.$transaction(async (tx) => {
        for (const { userId, amount } of seatDebits) {
          const a = intChips(amount);
          if (a <= 0) continue;
          const row = await tx.user.findUnique({
            where: { id: userId },
            select: { chips: true },
          });
          const before = intChips(row?.chips ?? 0);
          if (before < a) {
            const e = new Error('INSUFFICIENT_CHIPS') as Error & { code: string };
            e.code = 'INSUFFICIENT_CHIPS';
            throw e;
          }
          const after = before - a;
          await tx.user.update({
            where: { id: userId },
            data: { chips: after },
          });
          await appendWalletLedgerEntry(
            {
              context: createPokerCashLedgerContext({
                userId,
                gameId,
                handId: openHandId,
                actionId: `room-open:${userId}:${Date.now()}`,
              }),
              reason: 'CASH_POKER_BUY_IN',
              amount: -a,
              balanceBefore: before,
              balanceAfter: after,
            },
            tx,
          );
        }
      });
    } catch (err) {
      console.error('[waitingRoom] cash open debit failed', err);
      return res.status(500).json({
        error: 'Impossible de verrouiller les jetons en base pour cette table cash.',
        code: 'CASH_OPEN_DEBIT_FAILED',
      });
    }

    // Stocker dans le cache (Redis + local)
    await activeGames.set(gameId, cashGame);
    const size = activeGames.size();
    console.log(`✅ Partie cash ${gameId} créée et stockée. Taille du cache: ${size}`);

    const io = req.app.get('io') as import('socket.io').Server | undefined;
    if (io) {
      cashGame.setOnLiveBetWindowClosed(async () => {
        const socketsInRoom = await io.in(gameId).fetchSockets()
        for (const s of socketsInRoom) {
          const uid = (s as { userId?: string }).userId
          const snap = cashGame.getSanitizedState(uid)
          s.emit('GAME_UPDATE', snap)
          s.emit('GAME_STATE_UPDATED', snap)
        }
      })
      const { voiceMigrateHintForGameStart } = await import('../sockets/voice.gateway.handlers.js')
      io.to(roomId).emit('GAME_STARTED', {
        gameId,
        players: room.players.map((rp) => ({ id: rp.user.id, name: rp.user.username })),
        voiceMigrate: voiceMigrateHintForGameStart(roomId, gameId),
      });
    }

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

    const { voiceMigrateHintForGameStart } = await import('../sockets/voice.gateway.handlers.js')
    res.json({
      gameId,
      message: 'Partie démarrée',
      players: playersForClient,
      voiceMigrate: voiceMigrateHintForGameStart(roomId, gameId),
    });
  } catch (error) {
    console.error('Erreur démarrage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/waiting-room/:roomId/request-join - Demander à rejoindre une salle privée
// Salle PRIVATE : ami de l'hôte ou ami d'un joueur déjà dans la salle
router.post('/:roomId/request-join', waitingRoomJoinLimiter, authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = getAuthenticatedUserId(req);
    const { confirmBlockedWarning } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const room = await prisma.waitingRoom.findUnique({
      where: { id: roomId },
      include: {
        players: {
          include: {
            user: { select: { username: true } },
          },
        },
      }
    });

    if (!room) {
      return res.status(404).json({ error: 'Salle non trouvée' });
    }

    const blockedUserIds = await getBlockedUserIds(userId);
    if (blockedUserIds.has(room.hostId)) {
      return res.status(404).json({ error: 'Salle non trouvée' });
    }

    if (room.visibility === 'PRIVATE') {
      if (room.hostId === userId) {
        return res.status(400).json({ error: 'Vous êtes déjà l\'hôte de cette salle' });
      }
      const isFriendOfHost = await prisma.friendship.findFirst({
        where: {
          OR: [
            { user1Id: userId, user2Id: room.hostId },
            { user2Id: userId, user1Id: room.hostId }
          ]
        }
      });
      let hasFriendInRoom = false;
      if (!isFriendOfHost) {
        const playerIds = room.players.map(p => p.userId);
        const friendshipsWithPlayers = await prisma.friendship.findMany({
          where: {
            OR: [
              { user1Id: userId, user2Id: { in: playerIds } },
              { user2Id: userId, user1Id: { in: playerIds } }
            ]
          }
        });
        hasFriendInRoom = friendshipsWithPlayers.length > 0;
      }
      if (!isFriendOfHost && !hasFriendInRoom) {
        return res.status(403).json({ error: 'Vous devez être ami avec l\'hôte ou avoir un ami dans la salle pour rejoindre' });
      }
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

    const blockedPlayers = await getBlockedPlayersForViewer(userId, room.players);
    if (blockedPlayers.length > 0 && confirmBlockedWarning !== true) {
      return res.status(409).json({
        error: 'Cette salle contient un utilisateur que vous avez bloqué.',
        code: 'BLOCKED_USER_IN_ROOM',
        blockedPlayers,
      });
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
      update: { status: 'PENDING' },
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
router.get('/:roomId/join-requests', waitingRoomHostLimiter, authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const hostId = getAuthenticatedUserId(req);
    if (!hostId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

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
        user: {
          select: {
            id: true,
            username: true,
            level: true,
            avatarUrl: true,
            avatarHasBinary: true,
          },
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(requests.map(r => ({
      id: r.id,
      userId: r.user.id,
      username: r.user.username,
      level: r.user.level,
      avatarUrl: clientAvatarUrlFromUser(r.user),
      createdAt: r.createdAt
    })));
  } catch (error) {
    console.error('Erreur liste demandes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/waiting-room/:roomId/join-requests/:requestId/accept
router.post('/:roomId/join-requests/:requestId/accept', waitingRoomHostLimiter, authMiddleware, async (req, res) => {
  try {
    const { roomId, requestId } = req.params;
    const hostId = getAuthenticatedUserId(req);
    if (!hostId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const room = await prisma.waitingRoom.findUnique({
      where: { id: roomId },
      include: { players: true }
    });

    if (!room) return res.status(404).json({ error: 'Salle non trouvée' });
    if (room.hostId !== hostId) return res.status(403).json({ error: 'Non autorisé' });
    if (room.players.length >= room.maxPlayers) return res.status(400).json({ error: 'Salle pleine' });

    const existingJr = await prisma.joinRequest.findFirst({
      where: { id: requestId, roomId },
    });
    if (!existingJr) return res.status(404).json({ error: 'Demande non trouvée' });
    if (existingJr.status !== 'PENDING') {
      return res.status(400).json({ error: 'Cette demande a déjà été traitée' });
    }

    const joinRequest = await prisma.joinRequest.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            avatarHasBinary: true,
          },
        },
      }
    });

    // Auto-join the player
    await prisma.waitingRoom.update({
      where: { id: roomId },
      data: {
        players: {
          create: {
            userId: joinRequest.userId,
            isReady: false,
            position: room.players.length,
            avatarUrl: clientAvatarUrlFromUser(joinRequest.user),
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
router.post('/:roomId/join-requests/:requestId/reject', waitingRoomHostLimiter, authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;
    const hostId = getAuthenticatedUserId(req);
    if (!hostId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const joinRequest = await prisma.joinRequest.findUnique({
      where: { id: requestId },
      include: { room: true }
    });

    if (!joinRequest) return res.status(404).json({ error: 'Demande non trouvée' });
    if (joinRequest.room.hostId !== hostId) return res.status(403).json({ error: 'Non autorisé' });
    if (joinRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'Cette demande a déjà été traitée' });
    }

    await prisma.joinRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
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
router.delete('/:roomId', waitingRoomHostLimiter, authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = getAuthenticatedUserId(req);
    const io = req.app.get('io') as import('socket.io').Server | undefined;

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
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
    io?.to(roomId).emit('WAITING_ROOM_CLOSED_BY_HOST', { roomId });
    io?.to(roomId).emit('WAITING_ROOM_UPDATED', null);

    return res.json({ message: 'Salle supprimée par l\'hôte' });
  } catch (error) {
    console.error('Erreur suppression salle par hôte:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
