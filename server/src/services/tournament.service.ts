import type { Server } from 'socket.io';
import { prisma } from '../config/database.js';
import { metrics, rootLogger } from '../observability/index.js';
import { renewTournamentLeaderLock } from './tournamentLeaderLock.service.js';
import { activeGames } from '../shared/activeGames.js';
import { pokerStateStore } from '../shared/pokerStateStore.js';
import { GameTable } from '../logic/GameTable.js';
import {
  appendTournamentSurvivor,
  clearTournamentBracketState,
  clearTournamentSpectateSnapshot,
  clearTournamentSurvivors,
  deleteMergeRoundMapping,
  getMergeRoundMapping,
  getTournamentExpectedTables,
  getTournamentSpectateSnapshot,
  getTournamentSurvivors,
  setMergeRoundMapping,
  setTournamentExpectedTables,
  setTournamentSpectateSnapshot,
  type BracketSurvivorRow,
} from './tournamentBracketStore.service.js';
import { clientAvatarUrlFromUser } from '../utils/userAvatarPublic.js';

/** Max joueurs par table au début du tournoi (n >= 7). */
const TOURNAMENT_SEATS_PER_TABLE = 6;

/** Nombre minimum d’inscrits pour lancer le tournoi à l’heure prévue. */
export const TOURNAMENT_MIN_START_PLAYERS = 4;

/**
 * Répartition des tailles de tables pour le premier tour.
 * 4 → 2+2 ; 5 → 2+3 ; 6 → 3+3 ; n ≥ 7 → équilibré avec max 6 par table.
 */
export function getOpeningRoundTableSizes(totalPlayers: number): number[] {
  if (totalPlayers < TOURNAMENT_MIN_START_PLAYERS) {
    throw new Error('Bracket: au moins 4 joueurs requis');
  }
  if (totalPlayers === 4) return [2, 2];
  if (totalPlayers === 5) return [2, 3];
  if (totalPlayers === 6) return [3, 3];

  const numTables = Math.ceil(totalPlayers / TOURNAMENT_SEATS_PER_TABLE);
  const baseSize = Math.floor(totalPlayers / numTables);
  const remainder = totalPlayers % numTables;
  const tableSizes: number[] = [];
  for (let i = 0; i < numTables; i++) {
    tableSizes.push(i < remainder ? baseSize + 1 : baseSize);
  }
  return tableSizes;
}

export type TournamentSpectateTableRow = {
  tableNumber: number;
  roomId: string;
  players: { id: string; username: string }[];
};

export class TournamentService {
  private static async avatarUrlByUserId(
    userIds: string[],
  ): Promise<Map<string, string>> {
    const unique = [...new Set(userIds.filter(Boolean))];
    if (unique.length === 0) return new Map();
    const users = await prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, avatarUrl: true, avatarHasBinary: true },
    });
    const m = new Map<string, string>();
    for (const u of users) {
      const url = clientAvatarUrlFromUser(u);
      if (url) m.set(u.id, url);
    }
    return m;
  }

  private static io: Server | null = null;
  /** Tables suivables en spectateur (mémoire processus — même instance que les parties). */
  private static spectateTablesByTournament = new Map<
    string,
    { tournamentName: string; tables: TournamentSpectateTableRow[] }
  >();

  private static alreadyEliminated = new Set<string>();

  private static eliminationOrder = new Map<string, string[]>();

  /** Partie fusion `game_tournoi_merge_*` → tournoi (réduction à 2 avant finale HU). */
  private static mergeRoundGameToTournament = new Map<string, string>();

  /** Compteur pour un contrôle ~1 min du bracket (leader uniquement). */
  private static bracketStaleWatcherTick = 0;

  static getMergeRoundTournamentId(gameId: string): string | undefined {
    return this.mergeRoundGameToTournament.get(gameId);
  }

  static setIo(io: Server) {
    this.io = io;
    console.log("✅ [TournamentService] Mégaphone Socket branché au service.");
  }

  static getIo(): Server | null {
    return this.io;
  }

  static publishSpectateTables(
    tournamentId: string,
    tournamentName: string,
    tables: TournamentSpectateTableRow[],
  ): void {
    this.spectateTablesByTournament.set(tournamentId, { tournamentName, tables });
    void setTournamentSpectateSnapshot(tournamentId, tournamentName, tables);
  }

  static clearSpectateTables(tournamentId: string): void {
    this.spectateTablesByTournament.delete(tournamentId);
    void clearTournamentSpectateSnapshot(tournamentId);
  }

  /** Partie encore « live » pour l’UI spectateur : runtime local ou snapshot poker partagé. */
  private static async isTournamentRoomLive(roomId: string): Promise<boolean> {
    const runtime = await activeGames.get(roomId);
    if (runtime) return true;
    try {
      const snap = await pokerStateStore.get(roomId);
      return snap != null;
    } catch {
      return false;
    }
  }

  /** Reconstruit la liste des tables depuis les parties actives (Redis + mémoire) si la carte en mémoire a été perdue. */
  private static async rebuildSpectateTablesFromActiveGames(
    tournamentId: string,
  ): Promise<TournamentSpectateTableRow[]> {
    const all = await activeGames.getAll();
    const rows: TournamentSpectateTableRow[] = [];
    for (const [roomId, game] of all) {
      if (!(game instanceof GameTable)) continue;
      if (!roomId.startsWith('game_tournoi_')) continue;
      if (game.state.tournamentId !== tournamentId) continue;
      const players = game.state.players.map((p) => ({
        id: p.id,
        username: p.name,
      }));
      rows.push({
        tableNumber: game.state.tournamentTableNumber ?? rows.length + 1,
        roomId,
        players,
      });
    }
    rows.sort((a, b) => a.tableNumber - b.tableNumber);
    return rows;
  }

  /** Tables connues pour ce tournoi + indicateur si la partie tourne encore sur ce nœud. */
  static async getSpectateTablesPayload(tournamentId: string): Promise<{
    tournamentName: string;
    tables: Array<TournamentSpectateTableRow & { live: boolean }>;
  } | null> {
    const meta = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { name: true, status: true },
    });
    if (!meta) return null;

    if (meta.status === 'COMPLETED' || meta.status === 'CANCELED') {
      return { tournamentName: meta.name, tables: [] };
    }

    const redisSnap = await getTournamentSpectateSnapshot(tournamentId);
    let entry = this.spectateTablesByTournament.get(tournamentId);

    if (redisSnap?.tables?.length) {
      entry = {
        tournamentName: redisSnap.tournamentName || meta.name,
        tables: redisSnap.tables,
      };
    } else if (!entry) {
      const rebuilt = await this.rebuildSpectateTablesFromActiveGames(tournamentId);
      if (rebuilt.length > 0) {
        entry = { tournamentName: meta.name, tables: rebuilt };
        this.spectateTablesByTournament.set(tournamentId, entry);
      }
    }

    if (!entry) {
      return { tournamentName: meta.name, tables: [] };
    }

    const tables: Array<TournamentSpectateTableRow & { live: boolean }> = [];
    for (const t of entry.tables) {
      const live = await this.isTournamentRoomLive(t.roomId);
      tables.push({ ...t, live });
    }
    return { tournamentName: entry.tournamentName, tables };
  }

  /**
   * Table de tournoi active sur ce nœud où le joueur est encore assis (rétablissement après événement socket manqué ou reconnexion).
   */
  static async findActiveTournamentTableForUser(
    userId: string,
  ): Promise<{ gameId: string; tournamentId: string } | null> {
    const uid = String(userId).trim();
    if (!uid) return null;

    const registrations = await prisma.tournamentPlayer.findMany({
      where: {
        userId: uid,
        eliminatedAt: null,
        tournament: { status: 'ACTIVE' },
      },
      select: { tournamentId: true },
    });
    if (registrations.length === 0) return null;

    const tournamentIds = new Set(registrations.map((r) => r.tournamentId));
    const all = await activeGames.getAll();
    for (const [roomId, game] of all) {
      if (!(game instanceof GameTable)) continue;
      const tid = game.state.tournamentId;
      if (!tid || !tournamentIds.has(tid)) continue;
      if (!roomId.startsWith('game_tournoi_')) continue;
      if (game.state.players.some((p) => String(p.id) === uid)) {
        return { gameId: roomId, tournamentId: tid };
      }
    }
    return null;
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
        reason: 'insufficient_players',
      });
    });
    console.log(`[TOURNOI] Annulation notifiée pour ${tournamentName}`);
  }

  static recordElimination(tournamentId: string, userId: string) {
    let order = this.eliminationOrder.get(tournamentId);
    if (!order) {
      order = [];
      this.eliminationOrder.set(tournamentId, order);
    }
    if (!order.includes(userId)) {
      order.push(userId);
    }
  }

  static async createTournament(data: {
    name: string;
    buyIn: number;
    maxPlayers: number;
    startTime: Date;
    createdById: string;
    visibility?: 'PUBLIC' | 'PRIVATE';
  }) {
    const tournament = await prisma.tournament.create({
      data: {
        name: data.name,
        buyIn: data.buyIn,
        maxPlayers: data.maxPlayers,
        startTime: data.startTime,
        createdById: data.createdById,
        status: 'PENDING',
        prizePool: 0,
        visibility: data.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
      },
    });

    rootLogger.info({
      msg: 'tournament_created',
      tournamentId: tournament.id,
      name: tournament.name
    });

    return tournament;
  }

  static async createPrivateJoinRequest(tournamentId: string, requesterId: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true, name: true, createdById: true, status: true, visibility: true },
    });
    if (!tournament || tournament.status !== 'PENDING') {
      throw new Error("Ce tournoi n'est plus disponible.");
    }
    if (tournament.visibility !== 'PRIVATE') {
      throw new Error('Ce tournoi est public. Inscription directe disponible.');
    }
    if (tournament.createdById === requesterId) {
      throw new Error('Vous êtes déjà organisateur du tournoi.');
    }
    const requester = await prisma.user.findUnique({
      where: { id: requesterId },
      select: { username: true },
    });
    if (!requester) {
      throw new Error('Utilisateur introuvable.');
    }
    const row = await prisma.tournamentJoinRequest.upsert({
      where: {
        tournamentId_requesterId: { tournamentId, requesterId },
      },
      create: {
        tournamentId,
        requesterId,
        status: 'PENDING',
      },
      update: {
        status: 'PENDING',
      },
    });
    return {
      id: row.id,
      tournamentId,
      tournamentName: tournament.name,
      hostId: tournament.createdById,
      requesterId,
      requesterUsername: requester.username,
      createdAt: row.createdAt.getTime(),
      status: 'PENDING' as const,
    };
  }

  static async getPendingRequestsForHost(hostId: string) {
    const rows = await prisma.tournamentJoinRequest.findMany({
      where: {
        status: 'PENDING',
        tournament: { createdById: hostId, status: 'PENDING' },
      },
      include: {
        tournament: { select: { id: true, name: true, createdById: true } },
        requester: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      tournamentId: r.tournamentId,
      tournamentName: r.tournament.name,
      hostId: r.tournament.createdById,
      requesterId: r.requesterId,
      requesterUsername: r.requester.username,
      createdAt: r.createdAt.getTime(),
      status: 'PENDING' as const,
    }));
  }

  static async acceptPrivateJoinRequest(requestId: string, hostId: string) {
    const row = await prisma.tournamentJoinRequest.findFirst({
      where: {
        id: requestId,
        status: 'PENDING',
        tournament: { createdById: hostId },
      },
      include: {
        tournament: { select: { id: true, name: true, createdById: true } },
        requester: { select: { username: true } },
      },
    });
    if (!row) {
      throw new Error('Demande introuvable ou déjà traitée.');
    }
    await this.joinTournament(row.tournamentId, row.requesterId, { allowPrivateInvite: true });
    await prisma.tournamentJoinRequest.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' },
    });
    return {
      id: row.id,
      tournamentId: row.tournamentId,
      tournamentName: row.tournament.name,
      hostId: row.tournament.createdById,
      requesterId: row.requesterId,
      requesterUsername: row.requester.username,
      createdAt: row.createdAt.getTime(),
      status: 'ACCEPTED' as const,
    };
  }

  static async joinTournament(
    tournamentId: string,
    userId: string,
    options?: { allowPrivateInvite?: boolean },
  ) {
    return await prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.findUnique({
        where: { id: tournamentId },
        include: { _count: { select: { players: true } } }
      });

      if (!tournament || tournament.status !== 'PENDING') {
        throw new Error("Ce tournoi n'est plus disponible.");
      }

      if (
        tournament.visibility === 'PRIVATE' &&
        tournament.createdById !== userId &&
        !options?.allowPrivateInvite
      ) {
        throw new Error('Ce tournoi privé est sur invitation : demandez une invitation au créateur.');
      }

      if (new Date(tournament.startTime).getTime() < Date.now()) {
        throw new Error('La date de début de ce tournoi est passée.')
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

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { chips: true },
      });
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

  /**
   * Rembourse tous les inscrits et passe le tournoi en CANCELED (buy-in rendu, prizePool à 0).
   */
  static async refundAllPlayersAndCancelTournament(tournamentId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const t = await tx.tournament.findUnique({
        where: { id: tournamentId },
        include: { players: true },
      });
      if (!t || t.status !== 'PENDING') {
        return;
      }
      for (const p of t.players) {
        await tx.user.update({
          where: { id: p.userId },
          data: { chips: { increment: t.buyIn } },
        });
      }
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: 'CANCELED', prizePool: 0 },
      });
    });
    this.clearSpectateTables(tournamentId);
  }

  static async startTournament(tournamentId: string, providedIo?: Server) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        players: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                avatarHasBinary: true,
              },
            },
          },
        }
      }
    });

    if (!tournament) throw new Error("Tournoi introuvable");
    if (tournament.status !== 'PENDING') throw new Error("Tournoi déjà actif ou annulé");

    if (tournament.players.length < TOURNAMENT_MIN_START_PLAYERS) {
      await this.refundAllPlayersAndCancelTournament(tournamentId);
      throw new Error("Annulé : pas assez de joueurs.");
    }

    const activated = await prisma.tournament.updateMany({
      where: { id: tournamentId, status: 'PENDING' },
      data: { status: 'ACTIVE' },
    });
    if (activated.count === 0) {
      throw new Error("Tournoi déjà actif ou annulé");
    }

    await clearTournamentBracketState(tournamentId);

    const players = [...tournament.players].sort(() => Math.random() - 0.5);
    const totalPlayers = players.length;
    const tableSizes = getOpeningRoundTableSizes(totalPlayers);
    const numTables = tableSizes.length;

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

      const gamePlayers = slice.map((p, index) => {
        const avatar = clientAvatarUrlFromUser(p.user) ?? undefined;
        return {
          id: p.userId,
          name: p.user.username,
          cards: [],
          chips: tournament.buyIn,
          role: 'PLAYER' as const,
          currentBet: 0,
          isActive: true,
          position: index,
          isDealer: false,
          isConnected: true,
          ...(avatar ? { avatar } : {}),
        };
      });

      const newTable = new GameTable(realGameId, gamePlayers, {
        tournamentId,
        tournamentTableNumber: tableIdx + 1,
      });
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

    this.publishSpectateTables(
      tournamentId,
      tournament.name,
      tables.map((t) => ({
        tableNumber: t.tableNumber,
        roomId: t.roomId,
        players: t.players.map((p) => ({ id: p.id, username: p.username })),
      })),
    );

    await setTournamentExpectedTables(tournamentId, numTables);
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        openingRoundTableCount: numTables,
        activeBracketPhase: 'OPENING',
      },
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
      socketToUse.emit('tournament-updated');
    } else {
      console.warn("⚠️ [SOCKET] Aucun socket disponible pour le signal.");
    }

    return result;
  }

  private static async createHeadsUpFinalTable(
    tournamentId: string,
    survivors: BracketSurvivorRow[],
    buyIn: number,
  ): Promise<void> {
    if (survivors.length !== 2) {
      rootLogger.error({
        msg: 'tournament_final_requires_two',
        tournamentId,
        count: survivors.length,
      });
      return;
    }

    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { activeBracketPhase: 'FINAL' },
    });

    const finalGameId = `game_tournoi_final_${Date.now()}`;
    const doubled = survivors.map((s) => ({
      ...s,
      stack: Math.max(s.chips, buyIn) * 2,
    }));

    const avatarMap = await this.avatarUrlByUserId(doubled.map((s) => s.userId));
    const finalPlayers = doubled.map((s, index) => {
      const avatar = avatarMap.get(s.userId);
      return {
        id: s.userId,
        name: s.username,
        cards: [],
        chips: s.stack,
        role: 'PLAYER' as const,
        currentBet: 0,
        isActive: true,
        position: index,
        isDealer: false,
        isConnected: true,
        ...(avatar ? { avatar } : {}),
      };
    });

    const finalTable = new GameTable(finalGameId, finalPlayers, {
      tournamentId,
      tournamentTableNumber: 1,
    });
    finalTable.startHand();
    await activeGames.set(finalGameId, finalTable);
    const survivorsCopy = doubled.map((s) => ({
      userId: s.userId,
      username: s.username,
      chips: s.stack,
    }));
    await clearTournamentSurvivors(tournamentId);

    const meta = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { name: true },
    });
    if (meta) {
      this.publishSpectateTables(tournamentId, meta.name, [
        {
          tableNumber: 1,
          roomId: finalGameId,
          players: survivorsCopy.map((p) => ({
            id: p.userId,
            username: p.username,
          })),
        },
      ]);
    }

    if (this.io) {
      const finalPayload = { gameId: finalGameId, players: survivorsCopy };
      survivorsCopy.forEach((s) => {
        this.io!.to(`user:${s.userId}`).emit('tournament-final-table', finalPayload);
      });

      const eliminated = this.eliminationOrder.get(tournamentId) ?? [];
      eliminated.forEach(userId => {
        this.io!.to(`user:${userId}`).emit('tournament-spectate', {
          gameId: finalGameId,
        });
      });
    }

    rootLogger.info({
      msg: 'tournament_final_table_created',
      tournamentId,
      gameId: finalGameId,
    });
  }

  private static async createMergeRoundTable(
    tournamentId: string,
    survivors: BracketSurvivorRow[],
    tournamentName: string,
  ): Promise<void> {
    const mergeId = `game_tournoi_merge_${Date.now()}`;
    this.mergeRoundGameToTournament.set(mergeId, tournamentId);
    void setMergeRoundMapping(mergeId, tournamentId);

    const mergeAvatarMap = await this.avatarUrlByUserId(survivors.map((s) => s.userId));
    const mergePlayers = survivors.map((s, index) => {
      const avatar = mergeAvatarMap.get(s.userId);
      return {
        id: s.userId,
        name: s.username,
        cards: [],
        chips: Math.max(0, s.chips),
        role: 'PLAYER' as const,
        currentBet: 0,
        isActive: true,
        position: index,
        isDealer: false,
        isConnected: true,
        ...(avatar ? { avatar } : {}),
      };
    });

    const mergeTable = new GameTable(mergeId, mergePlayers, {
      tournamentId,
      tournamentTableNumber: 1,
    });
    mergeTable.startHand();
    await activeGames.set(mergeId, mergeTable);

    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { activeBracketPhase: 'MERGE' },
    });
    await clearTournamentSurvivors(tournamentId);

    const payloadPlayers = survivors.map((p) => ({
      userId: p.userId,
      username: p.username,
      chips: Math.max(0, p.chips),
    }));

    this.publishSpectateTables(tournamentId, tournamentName, [
      {
        tableNumber: 1,
        roomId: mergeId,
        players: survivors.map((p) => ({
          id: p.userId,
          username: p.username,
        })),
      },
    ]);

    if (this.io) {
      payloadPlayers.forEach((p) => {
        this.io!.to(`user:${p.userId}`).emit('tournament-merge-table', {
          gameId: mergeId,
          players: payloadPlayers,
        });
      });
      const eliminated = this.eliminationOrder.get(tournamentId) ?? [];
      eliminated.forEach((userId) => {
        this.io!.to(`user:${userId}`).emit('tournament-spectate', {
          gameId: mergeId,
        });
      });
    }

    rootLogger.info({
      msg: 'tournament_merge_table_created',
      tournamentId,
      gameId: mergeId,
      players: survivors.length,
    });
  }

  static async handleMergeRoundComplete(
    mergeGameId: string,
    survivors: { userId: string; username: string; chips: number }[],
  ): Promise<void> {
    if (survivors.length !== 2) return;
    let tournamentId = this.mergeRoundGameToTournament.get(mergeGameId);
    if (!tournamentId) {
      tournamentId = (await getMergeRoundMapping(mergeGameId)) ?? undefined;
      if (tournamentId) {
        this.mergeRoundGameToTournament.set(mergeGameId, tournamentId);
      }
    }
    if (!tournamentId) {
      rootLogger.warn({ msg: 'tournament_merge_unknown_game', mergeGameId });
      return;
    }
    this.mergeRoundGameToTournament.delete(mergeGameId);
    void deleteMergeRoundMapping(mergeGameId);

    const t = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { buyIn: true, status: true },
    });
    if (!t || t.status !== 'ACTIVE') return;

    await this.createHeadsUpFinalTable(
      tournamentId,
      survivors.map((s) => ({
        userId: s.userId,
        username: s.username,
        chips: s.chips,
      })),
      t.buyIn,
    );
  }

  /** Cas rare : il ne reste qu’un survivant à la table de fusion (ex. pot à 3). */
  static async handleMergeSingleWinner(
    mergeGameId: string,
    winnerId: string,
  ): Promise<void> {
    let tournamentId = this.mergeRoundGameToTournament.get(mergeGameId);
    if (!tournamentId) {
      tournamentId = (await getMergeRoundMapping(mergeGameId)) ?? undefined;
      if (tournamentId) {
        this.mergeRoundGameToTournament.set(mergeGameId, tournamentId);
      }
    }
    if (!tournamentId) {
      rootLogger.warn({ msg: 'tournament_merge_single_unknown_game', mergeGameId });
      return;
    }
    this.mergeRoundGameToTournament.delete(mergeGameId);
    void deleteMergeRoundMapping(mergeGameId);

    const eliminated = this.eliminationOrder.get(tournamentId) ?? [];
    const rankedIds = [winnerId, ...eliminated.slice().reverse()];
    await this.processVictory(rankedIds, tournamentId);
  }

  static async handleTableFinished(
    tournamentId: string,
    winnerId: string,
    winnerUsername: string,
    winnerChips: number,
    /** Identifiant de la partie terminée (idempotence bracket multi-pods). */
    finishedGameId: string,
  ): Promise<
    | {
        emitTournamentWonPartial: {
          userId: string;
          survivorsCount: number;
          expectedTables: number;
        };
      }
    | undefined
  > {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        status: true,
        openingRoundTableCount: true,
        activeBracketPhase: true,
      },
    });
    if (!tournament || tournament.status !== 'ACTIVE') return;

    const persistedExpected =
      tournament.activeBracketPhase === 'FINAL'
        ? 1
        : tournament.openingRoundTableCount ?? null;
    const expectedTables =
      persistedExpected ?? (await getTournamentExpectedTables(tournamentId)) ?? 1;

    const appendResult = await appendTournamentSurvivor(
      tournamentId,
      {
        userId: winnerId,
        username: winnerUsername,
        chips: winnerChips,
      },
      finishedGameId,
    );
    if (appendResult.duplicate) {
      rootLogger.info({
        msg: 'tournament_table_finish_duplicate_ignored',
        tournamentId,
        finishedGameId,
        winnerId,
      });
    }
    if (appendResult.memoryOnly) {
      rootLogger.warn({
        msg: 'tournament_survivor_recorded_memory_only',
        tournamentId,
        finishedGameId,
        detail:
          'Redis bracket indisponible : risque de désynchronisation multi-instances. Vérifier REDIS_URL et la charge.',
      });
    }

    const survivors = await getTournamentSurvivors(tournamentId);

    if (survivors.length < expectedTables) {
      metrics.incTournamentBracket('partial_waiting');
      if (this.io) {
        this.io.to(`user:${winnerId}`).emit('tournament-waiting-final', {
          survivorsCount: survivors.length,
          expectedTables,
        });
      }
      rootLogger.info({
        msg: 'tournament_bracket_waiting_more_tables',
        tournamentId,
        survivorsCount: survivors.length,
        expectedTables,
        finishedGameId,
      });
      return {
        emitTournamentWonPartial: {
          userId: winnerId,
          survivorsCount: survivors.length,
          expectedTables,
        },
      };
    }

    if (survivors.length === 1) {
      const eliminated = this.eliminationOrder.get(tournamentId) ?? [];
      const rankedIds = [winnerId, ...eliminated.slice().reverse()];
      await this.processVictory(rankedIds, tournamentId);
      return;
    }

    const phase = tournament.activeBracketPhase ?? 'OPENING';

    if (phase === 'OPENING' && survivors.length > 2) {
      const meta = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { name: true },
      });
      if (meta) {
        await this.createMergeRoundTable(tournamentId, survivors, meta.name);
      }
      return;
    }

    if (phase === 'OPENING' && survivors.length === 2) {
      const t = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { buyIn: true },
      });
      if (t) {
        await this.createHeadsUpFinalTable(tournamentId, survivors, t.buyIn);
      }
      return;
    }

    rootLogger.warn({
      msg: 'tournament_handle_table_unexpected_bracket',
      tournamentId,
      phase,
      survivorCount: survivors.length,
      expectedTables,
    });
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
            data: { chips: { increment: d.amount } },
            select: { id: true },
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
        this.eliminationOrder.delete(tournamentId);
        await clearTournamentBracketState(tournamentId);
      }
      this.clearSpectateTables(tournament.id);

      console.log(`[TOURNOI] ${tournament.name} CLÔTURÉ.`, fullRanking);

      this.io?.emit('tournament-updated');
    } catch (error) {
      console.error('[TOURNOI] Erreur processVictory:', error);
    }
  }

  /**
   * Branche Socket.IO pour les événements tournoi + démarrage automatique (leader Redis uniquement).
   * Le cron ne lance plus les tournois pour éviter double déclenchement avec cet intervalle.
   *
   * Ops : en multi-instances, Redis doit être joignable pour le verrou leader ; sinon les tournois
   * peuvent rester PENDING après `startTime` (métrique `tournament_stale_pending_count`, logs
   * `tournament_watcher_not_leader_stale_pending` / `tournament_leader_lock_redis_error`).
   */
  static startTournamentWatcher(io: Server) {
    this.setIo(io);
    rootLogger.info({ msg: 'tournament_watcher_started' });

    setInterval(() => {
      void (async () => {
        try {
          const now = new Date();
          const overdueThreshold = new Date(now.getTime() - 30_000);
          const stalePendingCount = await prisma.tournament.count({
            where: { status: 'PENDING', startTime: { lte: overdueThreshold } },
          });
          metrics.setTournamentStalePendingCount(stalePendingCount);

          const leader = await renewTournamentLeaderLock();
          if (!leader) {
            if (stalePendingCount > 0) {
              rootLogger.warn({
                msg: 'tournament_watcher_not_leader_stale_pending',
                stalePendingCount,
                detail:
                  'Cette instance ne détient pas le verrou Redis ; les PENDING en retard ne seront pas démarrés ici. Vérifier Redis et la connectivité en multi-instances.',
              });
            }
            return;
          }

          const pendingOnes = await prisma.tournament.findMany({
            where: { status: 'PENDING', startTime: { lte: now } },
            select: { id: true },
          });

          for (const t of pendingOnes) {
            try {
              await this.startTournament(t.id, io);
              rootLogger.info({ msg: 'tournament_started_by_watcher', tournamentId: t.id });
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              if (msg.includes('Annulé : pas assez de joueurs')) {
                const full = await prisma.tournament.findUnique({
                  where: { id: t.id },
                  include: { players: true },
                });
                if (full?.status === 'CANCELED') {
                  this.notifyCancellation(
                    t.id,
                    full.name,
                    full.players.map((p) => p.userId),
                  );
                }
              }
              rootLogger.warn({
                msg: 'tournament_start_skipped',
                tournamentId: t.id,
                detail: msg,
              });
            }
          }

          const staleMs = 2 * 60 * 60 * 1000;
          const staleBefore = new Date(now.getTime() - staleMs);
          const abandonedPending = await prisma.tournament.findMany({
            where: { status: 'PENDING', startTime: { lt: staleBefore } },
            include: { players: true },
          });
          for (const t of abandonedPending) {
            try {
              await this.refundAllPlayersAndCancelTournament(t.id);
              this.notifyCancellation(t.id, t.name, t.players.map((p) => p.userId));
              rootLogger.info({ msg: 'tournament_abandoned_pending_cleaned', tournamentId: t.id });
            } catch (err) {
              rootLogger.warn({
                msg: 'tournament_abandoned_cleanup_failed',
                tournamentId: t.id,
                detail: err instanceof Error ? err.message : String(err),
              });
            }
          }
          if (abandonedPending.length > 0) {
            this.io?.emit('tournament-updated');
          }

          this.bracketStaleWatcherTick += 1;
          if (this.bracketStaleWatcherTick % 12 === 0) {
            const activeOpening = await prisma.tournament.findMany({
              where: { status: 'ACTIVE', activeBracketPhase: 'OPENING' },
              select: { id: true, openingRoundTableCount: true, name: true },
            });
            for (const t of activeOpening) {
              const expected =
                t.openingRoundTableCount ??
                (await getTournamentExpectedTables(t.id)) ??
                1;
              const survivors = await getTournamentSurvivors(t.id);
              if (survivors.length > 0 && survivors.length < expected) {
                rootLogger.warn({
                  msg: 'tournament_bracket_still_waiting_watcher',
                  tournamentId: t.id,
                  name: t.name,
                  survivorsCount: survivors.length,
                  expectedTables: expected,
                  detail:
                    'Bracket incomplet : vérifier Redis (clés tournament:*:survivors), que chaque table a produit un gagnant, et l’affinité client↔pod pour les actions.',
                });
                metrics.incTournamentBracket('watcher_still_waiting');
              }
            }
          }
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          rootLogger.error({ msg: 'tournament_watcher_error', detail: msg });
        }
      })();
    }, 5000);
  }
}
