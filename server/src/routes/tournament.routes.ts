import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { TournamentService } from '../services/tournament.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import jwt from 'jsonwebtoken'; // Assure-toi d'avoir importé jwt

const router = Router();

// Interface pour typer le contenu de ton token
interface TokenPayload {
  userId: string;
  // ajoute d'autres champs si ton token en contient (ex: iat, exp)
}

/**
 * 1. LISTER LES TOURNOIS (Lobby)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    let currentUserId: string | null = null;
    const authHeader = req.headers.authorization;

    console.log("=== DEBUG LOBBY ==="); // 👈 MOUCHARD 1
    console.log("Header recu :", authHeader); // 👈 MOUCHARD 2

    // 1. Décryptage du token
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        // VÉRIFIE BIEN QUE CETTE CLÉ (secret) EST LA MÊME DANS TOUT TON PROJET
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as TokenPayload;
        currentUserId = decoded.userId;
        console.log("ID Utilisateur détecté dans le Lobby:", currentUserId); // LOG DE DEBUG
      } catch {
        console.log("Token invalide ou manquant");
      }
    }

    // 2. Récupération des tournois
    const tournaments = await prisma.tournament.findMany({
      where: { status: 'PENDING' },
      include: {
        _count: { select: { players: true } },
        players: {
          include: {
            user: { select: { id: true, username: true, experience: true } }
          }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    // 3. Formatage de la réponse
    const result = tournaments.map(t => {
      const isJoined = currentUserId ? t.players.some(p => p.userId === currentUserId) : false;

      return {
        id: t.id,
        name: t.name,
        buyIn: t.buyIn,
        prizePool: t.prizePool,
        maxPlayers: t.maxPlayers,
        startTime: t.startTime,
        status: t.status,
        visibility: TournamentService.getTournamentVisibility(t.id),
        _count: t._count,
        isJoined,
        players: t.players,
      };
    });

    res.json(result);
  } catch (error) {
    console.error("Lobby Error:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des tournois" });
  }
});

/**
 * 2. CRÉER UN TOURNOI
 */
router.post('/create', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, buyIn, maxPlayers, startTime, visibility } = req.body;
    const userId = req.userId; // Déjà typé via ton declare global

    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }

    if (!name || buyIn === undefined || !maxPlayers || !startTime) {
      return res.status(400).json({ error: "Données manquantes" });
    }

    if (maxPlayers < 4 || maxPlayers > 36) {
      return res.status(400).json({ error: 'Le nombre de joueurs doit être entre 4 et 36.' });
    }

    const tournament = await TournamentService.createTournament({
      name: String(name), 
      buyIn: Number(buyIn), 
      maxPlayers: Number(maxPlayers), 
      startTime: new Date(startTime), 
      createdById: userId,
      visibility: visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
    });
    
    res.status(201).json(tournament);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur lors de la création";
    res.status(400).json({ error: msg });
  }
});

router.post('/:id/request-join', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Non autorisé' });
    const request = await TournamentService.createPrivateJoinRequest(req.params.id, userId);
    const io = TournamentService.getIo();
    io?.to(`user:${request.hostId}`).emit('TOURNAMENT_JOIN_REQUEST_RECEIVED', {
      requestId: request.id,
      tournamentId: request.tournamentId,
      tournamentName: request.tournamentName,
      requesterId: request.requesterId,
      requesterUsername: request.requesterUsername,
    });
    res.json({ message: 'Demande envoyée', requestId: request.id });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur';
    res.status(400).json({ error: msg });
  }
});

router.get('/requests/received', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Non autorisé' });
  res.json(TournamentService.getPendingRequestsForHost(userId));
});

router.post('/requests/:requestId/accept', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Non autorisé' });
    const accepted = await TournamentService.acceptPrivateJoinRequest(req.params.requestId, userId);
    const io = TournamentService.getIo();
    io?.to(`user:${accepted.requesterId}`).emit('TOURNAMENT_JOIN_REQUEST_ACCEPTED', {
      tournamentId: accepted.tournamentId,
      tournamentName: accepted.tournamentName,
    });
    res.json({ message: 'Demande acceptée' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur';
    res.status(400).json({ error: msg });
  }
});

/**
 * 3. REJOINDRE UN TOURNOI
 */
router.post('/:id/join', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tournamentId = req.params.id;
    const userId = req.userId;

    if (!userId) return res.status(401).json({ error: "Non autorisé" });

    const registration = await TournamentService.joinTournament(tournamentId, userId);
    res.json({ message: "Inscription réussie !", registration });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur lors de l'inscription";
    res.status(400).json({ error: msg });
  }
});

/**
 * 4. LANCER MANUELLEMENT
 */
router.post('/:id/start', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await TournamentService.startTournament(req.params.id);
    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur lors du lancement";
    res.status(400).json({ error: msg });
  }
});

router.post('/:id/leave', authMiddleware, async (req, res) => {
  try {
    await TournamentService.leaveTournament(req.params.id, req.userId!);
    res.json({ message: "Vous avez quitté le tournoi. Votre Buy-in a été remboursé." });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur";
    res.status(400).json({ error: msg });
  }
});

export default router;