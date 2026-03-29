import { prisma } from '../config/database.js';
import { rootLogger } from '../observability/index.js';
import { activeGames } from '../shared/activeGames.js';
import { GameTable } from '../logic/GameTable.js';

export class TournamentService {
  // Stockage du socket au niveau de la classe
  private static io: any = null;

  /**
   * Initialise le socket pour tout le service
   */
  static setIo(io: any) {
    this.io = io;
    console.log("✅ [TournamentService] Mégaphone Socket branché au service.");
  }

  /**
   * Crée un nouveau tournoi en base
   */
  static async createTournament(data: { 
    name: string; 
    buyIn: number; 
    maxPlayers: number; 
    startTime: Date; 
    createdById: string 
  }) {
    const tournament = await prisma.tournament.create({
      data: {
        ...data,
        status: 'PENDING',
        prizePool: 0,
      }
    });

    rootLogger.info({ 
      msg: 'tournament_created', 
      tournamentId: tournament.id, 
      name: tournament.name 
    });

    return tournament;
  }

  /**
   * Inscription d'un joueur
   */
  static async joinTournament(tournamentId: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.findUnique({
        where: { id: tournamentId },
        include: { _count: { select: { players: true } } }
      });

      if (!tournament || tournament.status !== 'PENDING') {
        throw new Error("Ce tournoi n'est plus disponible.");
      }

      const alreadyJoined = await tx.tournamentPlayer.findUnique({
        where: { tournamentId_userId: { tournamentId, userId } }
      });

      if (alreadyJoined) throw new Error("Déjà inscrit !");

      if (tournament._count.players >= tournament.maxPlayers) {
        throw new Error("Tournoi complet.");
      }

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.chips < tournament.buyIn) {
        throw new Error("Jetons insuffisants.");
      }

      await tx.user.update({
        where: { id: userId },
        data: { chips: { decrement: tournament.buyIn } }
      });

      await tx.tournament.update({
        where: { id: tournamentId },
        data: { prizePool: { increment: tournament.buyIn } }
      });

      return await tx.tournamentPlayer.create({
        data: { tournamentId, userId }
      });
    });
  }

  /**
   * Quitter un tournoi
   */
  static async leaveTournament(tournamentId: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const registration = await tx.tournamentPlayer.findUnique({
        where: { tournamentId_userId: { tournamentId, userId } }
      });

      if (!registration) throw new Error("Non inscrit.");

      const tournament = await tx.tournament.findUnique({ where: { id: tournamentId } });
      if (!tournament || tournament.status !== 'PENDING') {
        throw new Error("Déjà commencé.");
      }

      await tx.user.update({
        where: { id: userId },
        data: { chips: { increment: tournament.buyIn } }
      });

      await tx.tournament.update({
        where: { id: tournamentId },
        data: { prizePool: { decrement: tournament.buyIn } }
      });

      return await tx.tournamentPlayer.delete({
        where: { tournamentId_userId: { tournamentId, userId } }
      });
    });
  }

  /**
   * Lancement effectif du tournoi
   */
  static async startTournament(tournamentId: string, providedIo?: any) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { 
        players: { 
          include: { user: { select: { id: true, username: true } } } 
        } 
      }
    });

    if (!tournament) throw new Error("Tournoi introuvable");
    if (tournament.status !== 'PENDING') throw new Error("Tournoi déjà actif ou annulé");

    // Sécurité minimum joueurs (Mets < 1 pour tester seul)
    if (tournament.players.length < 2) {
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { status: 'CANCELED' }
      });
      throw new Error("Annulé : pas assez de joueurs.");
    }

    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: 'ACTIVE' }
    });

    const players = [...tournament.players].sort(() => Math.random() - 0.5);
    const MAX_PER_TABLE = 6;
    const tables = [];
    const playerToGameMap: Record<string, string> = {};

    for (let i = 0; i < players.length; i += MAX_PER_TABLE) {
      const slice = players.slice(i, i + MAX_PER_TABLE);
      
      // 1. On génère un ID de partie unique
      const realGameId = `game_tournoi_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

      // 2. On prépare les joueurs au bon format pour ton moteur
      const gamePlayers = slice.map((p, index) => ({
        id: p.userId, // 👈 C'est ÇA qui manquait : l'UUID réel !
        name: p.user.username,
        cards: [],
        chips: tournament.buyIn, // On leur donne les jetons du tournoi
        role: 'PLAYER' as const,
        currentBet: 0,
        isActive: true,
        position: index, // On les assoit dans l'ordre de la table
        isDealer: false,
        isConnected: true
      }));

      // 3. 🎰 ON CRÉE LA TABLE DIRECTEMENT (sans gameService)
      const newTable = new GameTable(realGameId, gamePlayers);
      
      // On lance la première main
      newTable.startHand();

      // 4. 💽 L'ÉTAPE CRUCIALE : ON SAUVEGARDE DANS LE BON SALON (activeGames)
      await activeGames.set(realGameId, newTable);

      // 5. On enregistre qui va où pour la téléportation
      slice.forEach(p => { 
        playerToGameMap[p.userId] = realGameId; 
      });

      tables.push({
        tableNumber: Math.floor(i / MAX_PER_TABLE) + 1,
        roomId: realGameId,
        players: slice.map(p => ({ id: p.userId, username: p.user.username }))
      });
    }

    const playerIds = players.map(p => p.userId);

    const result = { 
      tournamentId,
      playerToGameMap, 
      playersToTeleport: playerIds,
      tables
    };

    // Envoi Socket
    const socketToUse = providedIo || this.io;
    if (socketToUse) {
      console.log(`📣 [SOCKET] Signal de départ envoyé pour ${tournament.name}`);
      socketToUse.emit('tournament-started', result);
    } else {
      console.warn("⚠️ [SOCKET] Aucun socket disponible pour le signal.");
    }

    return result;
  }

  /**
   * Veilleur
   */
  static startTournamentWatcher(io: any) {
    this.setIo(io); // On en profite pour fixer le socket
    console.log("👁️ Veilleur de tournois activé.");

    setInterval(async () => {
      try {
        const now = new Date();
        const pendingOnes = await prisma.tournament.findMany({
          where: { status: 'PENDING', startTime: { lte: now } }
        });

        for (const t of pendingOnes) {
          await this.startTournament(t.id, io);
        }
      } catch (error: any) {
        console.error("❌ Erreur Veilleur:", error.message);
      }
    }, 5000);
  }
}