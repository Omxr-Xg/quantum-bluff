import type { Server } from 'socket.io';
import { prisma } from '../config/database.js';
import { rootLogger } from '../observability/index.js';
import { activeGames } from '../shared/activeGames.js';
import { GameTable } from '../logic/GameTable.js';

export class TournamentService {
  private static io: Server | null = null;

  private static alreadyEliminated = new Set<string>();

  private static tournamentTables = new Map<string, {
    survivors: { userId: string; username: string; chips: number }[];
    expectedTables: number;
  }>();

  private static eliminationOrder = new Map<string, string[]>();

  static setIo(io: Server) {
    this.io = io;
    console.log("✅ [TournamentService] Mégaphone Socket branché au service.");
  }

  static getIo(): Server | null {
    return this.io;
  }

  static notifyElimination(userId: string) {
    if (this.alreadyEliminated.has(userId)) return;
    this.alreadyEliminated.add(userId);
    if (this.io) {
      console.log(`📣 [SOCKET] Éjection activée pour le joueur ${userId}`);
      this.io.to(`user:${userId}`).emit('tournament-eliminated', { userId });
    }
  }

  static notifyCountdown(tournamentId: string, tournamentName: string, minutesLeft: number, playerIds: string[]) {
    if (!this.io) return;
    playerIds.forEach(userId => {
      this.io!.to(`user:${userId}`).emit('tournament-countdown', {
        tournamentId,
        tournamentName,
        minutesLeft,
        message: minutesLeft === 1
          ? `⏰ Le tournoi "${tournamentName}" commence dans 1 minute !`
          : `⏰ Le tournoi "${tournamentName}" commence dans ${minutesLeft} minutes !`,
      });
    });
    console.log(`[TOURNOI] Countdown ${minutesLeft}min envoyé pour ${tournamentName}`);
  }

  static notifyCancellation(tournamentId: string, tournamentName: string, playerIds: string[]) {
    if (!this.io) return;
    playerIds.forEach(userId => {
      this.io!.to(`user:${userId}`).emit('tournament-cancelled', {
        tournamentId,
        tournamentName,
        message: `❌ Le tournoi "${tournamentName}" a été annulé faute de joueurs suffisants. Votre buy-in a été remboursé.`,
      });
    });
    console.log(`[TOURNOI] Annulation notifiée pour ${tournamentName}`);
  }

  static recordElimination(tournamentId: string, userId: string) {
    const order = this.eliminationOrder.get(tournamentId);
    if (order && !order.includes(userId)) {
      order.push(userId);
    }
  }

  static async createTournament(data: {
    name: string;
    buyIn: number;
    maxPlayers: number;
    startTime: Date;
    createdById: string;
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

      const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
      const tournamentStart = new Date(tournament.startTime).getTime();

      const overlappingRegistration = await tx.tournamentPlayer.findFirst({
        where: {
          userId,
          tournament: {
            status: 'PENDING',
            id: { not: tournamentId },
            startTime: {
              gte: new Date(tournamentStart - TWO_HOURS_MS),
              lte: new Date(tournamentStart + TWO_HOURS_MS),
            }
          }
        },
        include: { tournament: { select: { name: true, startTime: true } } }
      });

      if (overlappingRegistration) {
        const otherStart = new Date(overlappingRegistration.tournament.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        throw new Error(`Vous êtes déjà inscrit au tournoi "${overlappingRegistration.tournament.name}" à ${otherStart}. Un écart minimum de 2 heures est requis entre deux tournois.`);
      }

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

      if (this.io) {
        this.io.emit('tournament-updated');
      }

      const created = await tx.tournamentPlayer.create({
        data: { tournamentId, userId }
      });

      const allPlayers = await tx.tournamentPlayer.findMany({
        where: { tournamentId },
        include: { user: { select: { id: true, username: true } } }
      });
      const newPlayer = await tx.user.findUnique({
        where: { id: userId },
        select: { username: true }
      });
      if (this.io && newPlayer) {
        allPlayers.forEach(p => {
          if (p.userId !== userId) {
            this.io!.to(`user:${p.userId}`).emit('tournament-player-joined', {
              tournamentId,
              username: newPlayer.username,
              playerCount: allPlayers.length,
              maxPlayers: tournament.maxPlayers,
              message: `👤 ${newPlayer.username} a rejoint le tournoi ! (${allPlayers.length}/${tournament.maxPlayers})`,
            });
          }
        });
      }

      return created;
    });
  }

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

      if (this.io) {
        this.io.emit('tournament-updated');
      }

      return await tx.tournamentPlayer.delete({
        where: { tournamentId_userId: { tournamentId, userId } }
      });
    });
  }

  static async startTournament(tournamentId: string, providedIo?: Server) {
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
    const totalPlayers = players.length;
    const numTables = Math.ceil(totalPlayers / MAX_PER_TABLE);
    const baseSize = Math.floor(totalPlayers / numTables);
    const remainder = totalPlayers % numTables;

    const tableSizes: number[] = [];
    for (let i = 0; i < numTables; i++) {
      tableSizes.push(i < remainder ? baseSize + 1 : baseSize);
    }

    let offset = 0;
    const tableSlices = tableSizes.map(size => {
      const slice = players.slice(offset, offset + size);
      offset += size;
      return slice;
    });

    const tables = [];
    const playerToGameMap: Record<string, string> = {};

    for (let tableIdx = 0; tableIdx < tableSlices.length; tableIdx++) {
      const slice = tableSlices[tableIdx];
      const realGameId = `game_tournoi_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

      const gamePlayers = slice.map((p, index) => ({
        id: p.userId,
        name: p.user.username,
        cards: [],
        chips: tournament.buyIn,
        role: 'PLAYER' as const,
        currentBet: 0,
        isActive: true,
        position: index,
        isDealer: false,
        isConnected: true
      }));

      const newTable = new GameTable(realGameId, gamePlayers);
      newTable.startHand();
      await activeGames.set(realGameId, newTable);

      slice.forEach(p => {
        playerToGameMap[p.userId] = realGameId;
      });

      tables.push({
        tableNumber: tableIdx + 1,
        roomId: realGameId,
        players: slice.map(p => ({ id: p.userId, username: p.user.username }))
      });
    }

    TournamentService.tournamentTables.set(tournamentId, {
      survivors: [],
      expectedTables: numTables,
    });
    TournamentService.eliminationOrder.set(tournamentId, []);

    const playerIds = players.map(p => p.userId);

    const result = {
      tournamentId,
      playerToGameMap,
      playersToTeleport: playerIds,
      tables
    };

    const socketToUse = providedIo || this.io;
    if (socketToUse) {
      console.log(`📣 [SOCKET] Signal de départ envoyé pour ${tournament.name}`);
      socketToUse.emit('tournament-started', result);
    } else {
      console.warn("⚠️ [SOCKET] Aucun socket disponible pour le signal.");
    }

    return result;
  }

  static async handleTableFinished(
    tournamentId: string,
    winnerId: string,
    winnerUsername: string,
    winnerChips: number
  ) {
    const tracking = this.tournamentTables.get(tournamentId);
    if (!tracking) return;

    tracking.survivors.push({ userId: winnerId, username: winnerUsername, chips: winnerChips });

    if (tracking.survivors.length < tracking.expectedTables) {
      if (this.io) {
        this.io.to(`user:${winnerId}`).emit('tournament-waiting-final', {
          survivorsCount: tracking.survivors.length,
          expectedTables: tracking.expectedTables,
        });
      }
      console.log(`[TOURNOI] Survivants: ${tracking.survivors.length}/${tracking.expectedTables}`);
      return;
    }

    if (tracking.survivors.length === 1) {
      const eliminated = this.eliminationOrder.get(tournamentId) ?? [];
      const rankedIds = [winnerId, ...eliminated.slice().reverse()];
      await this.processVictory(rankedIds, tournamentId);
      return;
    }

    const finalGameId = `game_tournoi_final_${Date.now()}`;
    const finalPlayers = tracking.survivors.map((s, index) => ({
      id: s.userId,
      name: s.username,
      cards: [],
      chips: s.chips,
      role: 'PLAYER' as const,
      currentBet: 0,
      isActive: true,
      position: index,
      isDealer: false,
      isConnected: true,
    }));

    const finalTable = new GameTable(finalGameId, finalPlayers);
    finalTable.startHand();
    await activeGames.set(finalGameId, finalTable);

    const survivorsCopy = [...tracking.survivors];

    this.tournamentTables.set(tournamentId, {
      survivors: [],
      expectedTables: 1,
    });

    if (this.io) {
      survivorsCopy.forEach(s => {
        this.io!.to(`user:${s.userId}`).emit('tournament-final-table', {
          gameId: finalGameId,
          players: survivorsCopy.map(p => ({
            userId: p.userId,
            username: p.username,
            chips: p.chips,
          })),
        });
      });

      const eliminated = this.eliminationOrder.get(tournamentId) ?? [];
      eliminated.forEach(userId => {
        this.io!.to(`user:${userId}`).emit('tournament-spectate', {
          gameId: finalGameId,
        });
      });
    }

    console.log(`[TOURNOI] TABLE FINALE créée: ${finalGameId} avec ${survivorsCopy.length} joueurs`);
  }

  static async processVictory(rankedPlayerIds: string[], tournamentId?: string) {
    try {
      const winnerId = rankedPlayerIds[0];
      const playerRecord = await prisma.tournamentPlayer.findFirst({
        where: { userId: winnerId, tournament: { status: 'ACTIVE' } },
        include: { tournament: true }
      });

      if (!playerRecord) {
        console.warn(`[TOURNOI] Aucun tournoi actif trouvé pour ${winnerId}`);
        return;
      }

      const tournament = playerRecord.tournament;
      const prizePool = tournament.prizePool;

      const validIds = rankedPlayerIds.slice(0, 3);
      const existingUsers = await prisma.user.findMany({
        where: { id: { in: validIds } },
        select: { id: true, username: true }
      });
      const existingIds = existingUsers.map(u => u.id);

      let distribution: { userId: string; amount: number; position: number }[] = [];
      const validRanked = validIds.filter(id => existingIds.includes(id));

      if (validRanked.length === 1) {
        distribution = [{ userId: validRanked[0], amount: prizePool, position: 1 }];
      } else if (validRanked.length === 2) {
        distribution = [
          { userId: validRanked[0], amount: Math.floor(prizePool * 0.70), position: 1 },
          { userId: validRanked[1], amount: Math.floor(prizePool * 0.30), position: 2 },
        ];
      } else {
        distribution = [
          { userId: validRanked[0], amount: Math.floor(prizePool * 0.60), position: 1 },
          { userId: validRanked[1], amount: Math.floor(prizePool * 0.30), position: 2 },
          { userId: validRanked[2], amount: Math.floor(prizePool * 0.10), position: 3 },
        ];
      }

      await prisma.$transaction([
        ...distribution.map(d =>
          prisma.user.update({
            where: { id: d.userId },
            data: { chips: { increment: d.amount } }
          })
        ),
        prisma.tournament.update({
          where: { id: tournament.id },
          data: { status: 'COMPLETED' }
        })
      ]);

      const fullRanking = rankedPlayerIds.map((uid, index) => ({
        userId: uid,
        username: existingUsers.find(u => u.id === uid)?.username ?? 'Joueur',
        position: index + 1,
        amount: distribution.find(d => d.userId === uid)?.amount ?? 0,
      }));

      if (this.io) {
        const allPlayers = await prisma.tournamentPlayer.findMany({
          where: { tournamentId: tournament.id },
          select: { userId: true }
        });

        allPlayers.forEach(p => {
          this.io!.to(`user:${p.userId}`).emit('tournament-result', {
            tournamentName: tournament.name,
            prizePool,
            ranking: fullRanking,
            myPosition: fullRanking.find(r => r.userId === p.userId)?.position ?? null,
            myAmount: fullRanking.find(r => r.userId === p.userId)?.amount ?? 0,
          });
        });
      }

      if (tournamentId) {
        this.tournamentTables.delete(tournamentId);
        this.eliminationOrder.delete(tournamentId);
      }

      console.log(`[TOURNOI] ${tournament.name} CLÔTURÉ.`, fullRanking);

    } catch (error) {
      console.error('[TOURNOI] Erreur processVictory:', error);
    }
  }

  static startTournamentWatcher(io: Server) {
    this.setIo(io);
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
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("❌ Erreur Veilleur:", msg);
      }
    }, 5000);
  }
}
