import { randomUUID } from "crypto";
import { Server, Socket } from "socket.io";
import { activeGames } from "../shared/activeGames.js";
import { activeBlackjackGames } from "../shared/activeBlackjackGames.js";
import { blackjackStateStore } from "../shared/blackjackStateStore.js";
import { pokerStateStore } from "../shared/pokerStateStore.js";
import { logSuspiciousAction } from "../utils/securityLogger.js";
import { AntiCheatMonitor } from "../utils/antiCheat.js";
import { prisma } from "../config/database.js";
import { GameTable } from "../logic/GameTable.js";
import { CashGameController } from "../logic/CashGameController.js";
import { intChips } from "../utils/chips.js";
import {
  awardXpInTransaction,
  XP_POKER_SHOWDOWN_LOSS,
  XP_POKER_SHOWDOWN_WIN,
} from "../logic/gamification.js";
import {
  assessBlackjackRuntimeReadiness,
  BLACKJACK_RUNTIME_STALE_MS,
} from "../blackjack/services/blackjackRuntimeHealth.service.js";
import { resetStaleBlackjackPlaySession } from "../blackjack/recovery/blackjackRecovery.service.js";
import {
  BlackjackTableLockedError,
  withBlackjackTableLock,
} from "../blackjack/services/blackjackTableLock.service.js";
import { applyPokerAction } from "../poker/services/pokerActionOrchestrator.service.js";
import {
  clearPracticeBotSession,
  schedulePracticeBotTurns,
} from "../poker/services/practiceBotTurns.service.js";
import { isPracticeBotGameId } from "../shared/practiceBotGames.js";
import {
  PokerTableLockedError,
  withPokerTableLock,
} from "../poker/services/pokerTableLock.service.js";
import { rootLogger } from "../observability/logger.js";
import { registerBeloteGatewayHandlers } from "./belote.gateway.handlers.js";
import { emitWaitingRoomUpdated } from "../routes/waitingRoom.routes.js";
import {
  handleVoiceDisconnect,
  registerVoiceGatewayHandlers,
  withVoiceMigrateOnRoomReturn,
} from "./voice.gateway.handlers.js";
import { flushPendingIncomingCalls } from "../voice/voiceCallDelivery.js";
import { metrics as promMetrics } from "../observability/metrics.js";
import {
  markChatMessageSent,
  markFriendInvitedToTable,
  markPokerHandResult,
} from "../dailyChallenges/dailyChallenge.service.js";
import { sanitizePublicAvatarUrl } from "../utils/avatarUrl.js";
import { clientAvatarUrlFromUser } from "../utils/userAvatarPublic.js";
import { resolvePublicCosmetics } from "../shop/publicCosmetics.js";
import type { PublicPlayerCosmetics } from "../types/poker.js";
import {
  censorChatLinks,
  isChatContentEffectivelyEmpty,
} from "../utils/chatLinkCensor.js";
import { appendActionLog } from "../config/redis.config.js";
import { buildHiddenBetResolutionPayload } from "../poker/hiddenBets/hiddenBetSnapshot.js";
import { resolveHiddenBetsForHand } from "../poker/hiddenBets/resolver/hiddenBetResolver.js";
import {
  applyRepaymentOnPokerSettlement,
  type RepaymentSocketPayload,
} from "../services/friendLoan.service.js";
import {
  emitToUsers,
  FRIEND_LOAN_SOCKET,
} from "../services/friendLoan.emit.js";
import { appendWalletLedgerEntry } from "../casino/services/walletLedger.service.js";
import { createPokerCashLedgerContext } from "../poker/cash/pokerCashLedger.js";
import {
  isUserOnline,
  markUserOffline,
  markUserOnline,
  setUserActivity,
} from "../services/presence.service.js";
import { TOURNAMENT_LOBBY_SOCKET_ROOM } from "../tournament/tournament.roster.events.js";
import { verifyToken } from "../auth/jwt.service.js";
import { isBlacklisted } from "../auth/tokenBlacklist.js";

// 👇 B4 : IMPORT DU SERVICE ANTI-TRICHE 👇
import { AntiCheatService } from "../services/antiCheat.service.js";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  gameId?: string;
  isAdminSpectator?: boolean;
}

/**
 * Résout l'URL d'avatar à utiliser pour un siège.
 *
 * Priorité :
 * 1. URL fournie par le client (snapshot d'avatar) si elle passe la sanitization.
 * 2. Sinon, on retombe sur l'avatar persistant du profil (`User.avatarUrl` ou
 *    image binaire en base), de manière à ce que la photo affichée dans la
 *    page Amis reste visible en salle d'attente et en partie même si le client
 *    n'a pas envoyé d'avatar (web first load, preset bundlé rejeté, etc.).
 *
 * Retourne `null` si on n'a strictement rien (l'avatar est alors une initiale
 * côté client via `getPlayerAvatar`).
 */
const EMPTY_SEAT_COSMETICS: PublicPlayerCosmetics = {
  banner: null,
  frame: null,
  title: null,
};

async function resolveSeatPublicProfile(
  rawAvatarUrl: unknown,
  userId: string | null | undefined,
): Promise<{ avatarUrl: string | null; cosmetics: PublicPlayerCosmetics }> {
  const sanitized = sanitizePublicAvatarUrl(rawAvatarUrl);
  if (!userId) {
    return { avatarUrl: sanitized, cosmetics: EMPTY_SEAT_COSMETICS };
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        avatarUrl: true,
        avatarHasBinary: true,
        equippedBannerId: true,
        equippedFrameId: true,
        equippedTitleId: true,
      },
    });
    if (!user) {
      return { avatarUrl: sanitized, cosmetics: EMPTY_SEAT_COSMETICS };
    }
    const avatarUrl = sanitized ?? clientAvatarUrlFromUser(user);
    return {
      avatarUrl,
      cosmetics: resolvePublicCosmetics(user),
    };
  } catch {
    return { avatarUrl: sanitized, cosmetics: EMPTY_SEAT_COSMETICS };
  }
}

async function resolveSeatAvatarUrl(
  rawAvatarUrl: unknown,
  userId: string | null | undefined,
): Promise<string | null> {
  const profile = await resolveSeatPublicProfile(rawAvatarUrl, userId);
  return profile.avatarUrl;
}

export class GameGateway {
  private io: Server;
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private turnTimerDeadlines: Map<string, number> = new Map();

  // 👇 B4 : CHRONOMÈTRE ANTI-BOT 👇
  private turnStartTimes: Map<string, number> = new Map();

  /** Invalide les timers / callbacks obsolètes quand resetTimer/startTurnTimer se chevauchent (async gap). */
  private turnTimerEpoch: Map<string, number> = new Map();
  private socketToUser: Map<string, string> = new Map();
  private userToSocket: Map<string, string> = new Map();
  private antiCheat = new AntiCheatMonitor(8, 3000);
  private disconnectionTimeouts: Map<string, NodeJS.Timeout> = new Map();
  /** Tournoi : auto-ready inter-mains (par table). On garde l'absolute deadline pour permettre
   *  un re-emit cohérent à la reconnexion d'un client. */
  private tournamentHandReadyTimers: Map<string, NodeJS.Timeout> = new Map();
  private tournamentHandReadyDeadlines: Map<string, number> = new Map();
  /** Délai d'auto-ready inter-mains tournoi (ms). */
  private static readonly TOURNAMENT_HAND_READY_AUTO_MS = 30_000;
  private async logRoomState(
    room: string,
    label: string,
    extra: Record<string, unknown> = {},
  ) {
    const sockets = await this.io.in(room).fetchSockets();

    console.log("[SOCKET]", label, {
      room,
      socketsCount: sockets.length,
      socketIds: sockets.map((s) => s.id),
      userIds: sockets.map(
        (s) => (s as unknown as AuthenticatedSocket).userId ?? null,
      ),
      ...extra,
    });
  }

  constructor(io: Server) {
    this.io = io;
    this.setupMiddleware();
    this.setupHandlers();
    this.setupBlackjackStoreSubscription();
    this.setupPokerStoreSubscription();
  }

  public notifyUser(userId: string, event: string, payload: unknown) {
    this.io.to(`user:${userId}`).emit(event, payload);
  }

  private sanitizeStoredPokerSnapshot(
    snapshot: import("../poker/store/pokerStateStore.js").PokerRuntimeSnapshot,
    requestingUserId?: string,
  ) {
    return {
      ...snapshot,
      players: snapshot.players.map((player) => ({
        ...player,
        cards:
          requestingUserId && player.id === requestingUserId
            ? player.cards
            : [],
      })),
    };
  }

  private setupMiddleware() {
    this.io.use((socket: AuthenticatedSocket, next) => {
      const authToken = socket.handshake.auth?.token;
      const headerAuth = socket.handshake.headers?.authorization;
      const token =
        authToken ||
        (typeof headerAuth === "string" ? headerAuth.split(" ")[1] : undefined);

      if (!token) {
        rootLogger.warn({
          msg: "socket_auth_missing_token",
          socketId: socket.id,
        });
        logSuspiciousAction("MISSING_TOKEN", {
          socketId: socket.id,
          details: "Connexion socket sans token",
        });
        return next(new Error("Token manquant"));
      }

      void (async () => {
        try {
          if (await isBlacklisted(token)) {
            rootLogger.warn({
              msg: "socket_auth_blacklisted_token",
              socketId: socket.id,
            });
            return next(new Error("Token révoqué"));
          }

          const decoded = verifyToken(token);
          if (decoded.role === "admin") {
            socket.userId = decoded.userId;
            socket.isAdminSpectator = true;
            rootLogger.debug({
              msg: "socket_auth_admin_spectator_ok",
              userId: socket.userId,
              socketId: socket.id,
            });
            return next();
          }

          const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, bannedUntil: true },
          });
          if (!user) {
            rootLogger.warn({
              msg: "socket_auth_user_not_found",
              userId: decoded.userId,
              socketId: socket.id,
            });
            return next(new Error("Session expirée"));
          }
          if (user.bannedUntil && user.bannedUntil > new Date()) {
            rootLogger.warn({
              msg: "socket_auth_user_suspended",
              userId: decoded.userId,
              socketId: socket.id,
            });
            return next(new Error("Compte suspendu"));
          }

          socket.userId = decoded.userId;
          rootLogger.debug({
            msg: "socket_auth_ok",
            userId: socket.userId,
            socketId: socket.id,
          });
          next();
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Token invalide";
          rootLogger.warn({
            msg: "socket_auth_invalid_token",
            socketId: socket.id,
            detail: msg,
          });
          logSuspiciousAction("INVALID_TOKEN", {
            socketId: socket.id,
            details: "Token socket invalide",
          });
          next(new Error("Token invalide"));
        }
      })();
    });
  }

  private setupHandlers() {
    this.io.on("connection", (socket: AuthenticatedSocket) => {
      const clientsCount = (
        this.io as unknown as { engine: { clientsCount: number } }
      ).engine.clientsCount;
      promMetrics.incSocketEvent("connection");
      promMetrics.setSocketIoConnectionsActive(clientsCount);
      rootLogger.debug({
        msg: "socket_client_connected",
        socketId: socket.id,
        userId: socket.userId,
        clientsCount,
      });

      if (socket.userId && !socket.isAdminSpectator) {
        this.socketToUser.set(socket.id, socket.userId);
        this.userToSocket.set(socket.userId, socket.id);
        void markUserOnline(socket.userId, socket.id).catch((err) =>
          rootLogger.warn({
            msg: "presence_mark_online_failed",
            userId: socket.userId,
            detail: err instanceof Error ? err.message : String(err),
          }),
        );
        socket.join(`user:${socket.userId}`);
        void flushPendingIncomingCalls(this.io, socket.userId);
        this.io.emit("FRIEND_STATUS_CHANGED", {
          userId: socket.userId,
          status: "online",
        });
        rootLogger.debug({
          msg: "socket_user_room_joined",
          userId: socket.userId,
          socketId: socket.id,
        });
      }

      socket.on("JOIN_USER_ROOM", () => {
        if (!socket.userId) return;

        Array.from(socket.rooms).forEach((room) => {
          if (room.startsWith("user:")) {
            socket.leave(room);
          }
        });

        socket.join(`user:${socket.userId}`);
        void flushPendingIncomingCalls(this.io, socket.userId);
        console.log(`✅ Utilisateur ${socket.userId} a rejoint sa room personnelle`);
      });

      socket.on("USER_ACTIVITY_CHANGED", ({ activity }: { activity?: string }) => {
        if (!socket.userId || typeof activity !== "string") return;
        void setUserActivity(socket.userId, activity).then(() => {
          this.io.emit("FRIEND_STATUS_CHANGED", {
            userId: socket.userId,
            status: "online",
            activity,
          });
        });
      });

      socket.on(
        "JOIN_TOURNAMENT_ROOM",
        async ({ tournamentId }: { tournamentId?: string }) => {
          if (!tournamentId || !socket.userId) return;
          const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            select: { hostId: true, visibility: true },
          });
          if (!tournament) return;
          const isHost = tournament.hostId === socket.userId;
          const tp = await prisma.tournamentPlayer.findFirst({
            where: { tournamentId, userId: socket.userId },
          });
          if (!isHost && !tp && tournament.visibility !== "PUBLIC") return;
          socket.join(`tournament:${tournamentId}`);
        },
      );

      socket.on(
        "LEAVE_TOURNAMENT_ROOM",
        ({ tournamentId }: { tournamentId?: string }) => {
          if (!tournamentId) return;
          socket.leave(`tournament:${tournamentId}`);
        },
      );

      socket.on("JOIN_TOURNAMENT_LOBBY", () => {
        if (!socket.userId) return;
        socket.join(TOURNAMENT_LOBBY_SOCKET_ROOM);
      });

      socket.on("LEAVE_TOURNAMENT_LOBBY", () => {
        socket.leave(TOURNAMENT_LOBBY_SOCKET_ROOM);
      });

      socket.on(
        "join-room",
        async ({ roomId }: { roomId?: string; userId?: string }) => {
          if (!roomId || !socket.userId) return;
          const room = await prisma.waitingRoom.findUnique({
            where: { id: roomId },
            include: { players: { select: { userId: true } } },
          });
          if (!room) return;
          const isMember =
            room.hostId === socket.userId ||
            room.players.some((player) => player.userId === socket.userId);
          const hasAcceptedJoinRequest = await prisma.joinRequest.findFirst({
            where: { roomId, userId: socket.userId, status: "ACCEPTED" },
            select: { id: true },
          });
          if (room.visibility !== "PUBLIC" && !isMember && !hasAcceptedJoinRequest) {
            logSuspiciousAction("UNAUTHORIZED_ROOM_SUBSCRIBE", {
              userId: socket.userId,
              socketId: socket.id,
              details: { roomId },
            });
            return;
          }
          socket.join(roomId);
          console.log(`🚪 Socket ${socket.id} joined waiting room ${roomId}`);
          void emitWaitingRoomUpdated(roomId, this.io).catch(() => {});
        },
      );

      socket.on("leave-room", ({ roomId }: { roomId?: string }) => {
        if (!roomId) return;
        socket.leave(roomId);
        void emitWaitingRoomUpdated(roomId, this.io).catch(() => {});
      });

      socket.on(
        "invite-to-room",
        async (data: {
          roomId: string;
          invitedUserId: string;
          inviterId: string;
        }) => {
          const { roomId, invitedUserId, inviterId } = data;
          if (!roomId || !invitedUserId || !inviterId) return;
          if (socket.userId !== inviterId) return;

          try {
            const room = await prisma.waitingRoom.findUnique({
              where: { id: roomId },
            });
            if (!room || room.status !== "WAITING" || room.hostId !== inviterId)
              return;

            const blocked = await prisma.userBlock.findFirst({
              where: {
                OR: [
                  { blockerId: inviterId, blockedId: invitedUserId },
                  { blockerId: invitedUserId, blockedId: inviterId },
                ],
              },
              select: { id: true },
            });
            if (blocked) return;

            const invitation = await prisma.gameInvitation.upsert({
              where: {
                roomId_receiverId: { roomId, receiverId: invitedUserId },
              },
              create: {
                roomId,
                senderId: inviterId,
                receiverId: invitedUserId,
                status: "PENDING",
              },
              update: { status: "PENDING", senderId: inviterId },
            });

            const sender = await prisma.user.findUnique({
              where: { id: inviterId },
              select: { username: true },
            });

            this.io
              .to(`user:${invitedUserId}`)
              .emit("GAME_INVITATION_RECEIVED", {
                invitationId: invitation.id,
                roomId,
                roomName: room.name,
                sender: {
                  id: inviterId,
                  username: sender?.username ?? "Joueur",
                },
              });
            await markFriendInvitedToTable(inviterId)
            console.log(
              `📨 Invitation envoyée: ${inviterId} → ${invitedUserId} (salle ${roomId})`,
            );
          } catch (err) {
            console.error("Erreur invite-to-room:", err);
          }
        },
      );

      socket.on(
        "invite-to-blackjack-room",
        async (data: {
          blackjackRoomId: string;
          invitedUserId: string;
          inviterId: string;
        }) => {
          const { blackjackRoomId, invitedUserId, inviterId } = data;
          if (!blackjackRoomId || !invitedUserId || !inviterId) return;
          if (socket.userId !== inviterId) return;
          if (invitedUserId === inviterId) return;

          try {
            const room = await prisma.blackjackRoom.findUnique({
              where: { id: blackjackRoomId },
              include: { seats: true },
            });
            if (!room || room.status !== "WAITING" || room.hostId !== inviterId)
              return;

            const blocked = await prisma.userBlock.findFirst({
              where: {
                OR: [
                  { blockerId: inviterId, blockedId: invitedUserId },
                  { blockerId: invitedUserId, blockedId: inviterId },
                ],
              },
              select: { id: true },
            });
            if (blocked) return;

            const friendship = await prisma.friendship.findFirst({
              where: {
                OR: [
                  { user1Id: inviterId, user2Id: invitedUserId },
                  { user1Id: invitedUserId, user2Id: inviterId },
                ],
              },
            });
            if (!friendship) return;

            if (room.seats.some((s) => s.userId === invitedUserId)) return;
            if (room.seats.length >= room.maxSeats) return;

            const invitation = await prisma.blackjackRoomInvitation.upsert({
              where: {
                blackjackRoomId_receiverId: {
                  blackjackRoomId,
                  receiverId: invitedUserId,
                },
              },
              create: {
                blackjackRoomId,
                senderId: inviterId,
                receiverId: invitedUserId,
                status: "PENDING",
              },
              update: { status: "PENDING", senderId: inviterId },
            });

            const sender = await prisma.user.findUnique({
              where: { id: inviterId },
              select: { username: true },
            });

            this.io
              .to(`user:${invitedUserId}`)
              .emit("GAME_INVITATION_RECEIVED", {
                invitationId: invitation.id,
                roomId: blackjackRoomId,
                roomName: room.name,
                sender: {
                  id: inviterId,
                  username: sender?.username ?? "Joueur",
                },
                game: "blackjack",
              });
            await markFriendInvitedToTable(inviterId)
            console.log(
              `📨 Invitation blackjack: ${inviterId} → ${invitedUserId} (${blackjackRoomId})`,
            );
          } catch (err) {
            console.error("Erreur invite-to-blackjack-room:", err);
          }
        },
      );

      socket.on(
        "JOIN_GAME",
        async (data: {
          gameId: string;
          playerId: string;
          avatarUrl?: string;
        }) => {
          try {
            const { gameId, playerId } = data;

            if (
              socket.userId &&
              this.disconnectionTimeouts.has(socket.userId)
            ) {
              clearTimeout(this.disconnectionTimeouts.get(socket.userId)!);
              this.disconnectionTimeouts.delete(socket.userId);
              console.log(
                `[Réseau] Joueur ${socket.userId} de retour avant la fin du timeout !`,
              );
            }

            if (socket.userId !== playerId) {
              logSuspiciousAction("UNAUTHORIZED_JOIN", {
                userId: socket.userId,
                socketId: socket.id,
                gameId,
                action: "JOIN_GAME",
                details: { requestedPlayerId: playerId },
              });

              socket.emit("ERROR", {
                code: "UNAUTHORIZED",
                message: "Vous n'êtes pas autorisé à rejoindre cette partie",
              });
              return;
            }

            if (socket.gameId && socket.gameId !== gameId) {
              socket.leave(socket.gameId);
            }
            socket.join(gameId);
            socket.gameId = gameId;

            await this.logRoomState(gameId, "joined_game_room", {
              socketId: socket.id,
              userId: socket.userId,
              playerId,
              gameId,
            });

            const game = await activeGames.get(gameId);
            if (game) {
              if (game instanceof CashGameController) {
                game.setOnLiveBetWindowClosed(() => {
                  void this.broadcastCashGameSnapshot(gameId);
                });

                const profile = await resolveSeatPublicProfile(data.avatarUrl, playerId);
                game.setSeatPublicProfile(playerId, profile);

                const socketsInRoom = await this.io.in(gameId).fetchSockets();

                console.log(
                  "[SOCKET][JOIN_GAME] broadcasting_initial_snapshot",
                  {
                    gameId,
                    socketsCount: socketsInRoom.length,
                    playersCount: game.state.players?.length ?? undefined,
                    phase: game.state.phase,
                    currentTurn: game.state.currentTurn,
                    handId: game.state.handId,
                  },
                );

                for (const s of socketsInRoom) {
                  const uid = (s as unknown as AuthenticatedSocket).userId;
                  const isSpectator = !game.getPlayerState(uid ?? "");
                  const snapshot = game.getSanitizedState(
                    isSpectator ? undefined : uid,
                    isSpectator,
                  );
                  s.emit("GAME_UPDATE", snapshot);
                  s.emit("GAME_STATE_UPDATED", snapshot);
                }
                void this.ensureTurnTimerForActiveHand(gameId);
              } else if (game instanceof GameTable) {
                const profile = await resolveSeatPublicProfile(data.avatarUrl, playerId);
                const pl = game.getPlayerState(playerId);
                if (pl) {
                  if (profile.avatarUrl) pl.avatar = profile.avatarUrl;
                  else delete pl.avatar;
                  pl.cosmetics = profile.cosmetics;
                }
                const socketsInRoom = await this.io.in(gameId).fetchSockets();
                for (const s of socketsInRoom) {
                  const uid = (s as unknown as AuthenticatedSocket).userId;
                  const isSpectator = !uid || !game.getPlayerState(uid);
                  const snapshot = game.getSanitizedState(
                    isSpectator ? undefined : uid,
                    isSpectator,
                  );
                  s.emit("GAME_UPDATE", snapshot);
                  s.emit("GAME_STATE_UPDATED", snapshot);
                }
                void this.ensureTurnTimerForActiveHand(gameId);
                if (isPracticeBotGameId(gameId)) {
                  schedulePracticeBotTurns(this.io, gameId);
                }
              }

              console.log(
                `✅ Joueur ${playerId} a rejoint la partie ${gameId}`,
              );
            } else {
              const storedSnapshot = await pokerStateStore.get(gameId);

              if (storedSnapshot) {
                const snapshot = this.sanitizeStoredPokerSnapshot(
                  storedSnapshot,
                  playerId,
                );

                socket.emit("GAME_UPDATE", snapshot);
                socket.emit("GAME_STATE_UPDATED", snapshot);

                console.log(
                  `✅ Joueur ${playerId} a rejoint la partie ${gameId} (snapshot store)`,
                );
                return;
              }

              logSuspiciousAction("GAME_NOT_FOUND", {
                userId: socket.userId,
                socketId: socket.id,
                gameId,
                action: "JOIN_GAME",
              });
              rootLogger.warn({
                msg: "socket_game_not_found",
                reason: "JOIN_GAME",
                gameId,
                userId: socket.userId,
                socketId: socket.id,
                storedSnapshot: false,
              });

              socket.emit("ERROR", {
                code: "GAME_NOT_FOUND",
                message: "Partie introuvable",
              });
            }
          } catch (error) {
            console.error("Erreur JOIN_GAME:", error);
            socket.emit("ERROR", {
              code: "JOIN_ERROR",
              message: "Erreur lors de la connexion à la partie",
            });
          }
        },
      );

      socket.on("JOIN_SPECTATE", async (data: { gameId: string }) => {
        try {
          const { gameId } = data;
          socket.join(gameId);
          socket.gameId = gameId;

          const game = await activeGames.get(gameId);
          if (game) {
            if (game instanceof CashGameController) {
              game.setOnLiveBetWindowClosed(() => {
                void this.broadcastCashGameSnapshot(gameId);
              });
            }
            socket.emit("GAME_UPDATE", game.getSanitizedState(undefined, true));
            console.log(`👁️ Spectateur a rejoint la partie ${gameId}`);
          } else {
            rootLogger.warn({
              msg: "socket_game_not_found",
              reason: "JOIN_SPECTATE",
              gameId,
              userId: socket.userId,
              socketId: socket.id,
            });
            socket.emit("ERROR", {
              code: "GAME_NOT_FOUND",
              message: "Partie introuvable",
            });
          }
        } catch (error) {
          console.error("Erreur JOIN_SPECTATE:", error);
          socket.emit("ERROR", {
            code: "SPECTATE_ERROR",
            message: "Erreur lors de la connexion en spectateur",
          });
        }
      });

      socket.on("JOIN_BLACKJACK_TABLE", (data: { gameId?: string }) => {
        void (async () => {
          try {
            const gameId = data?.gameId;
            if (!gameId || !socket.userId) return;

            const room = await prisma.blackjackRoom.findFirst({
              where: { gameId },
              select: { id: true, status: true, gameId: true },
            });
            const runtimeState = await blackjackStateStore.getTable(gameId);
            const runtimeAssessment = assessBlackjackRuntimeReadiness({
              requestedGameId: gameId,
              room,
              runtimeState,
              snapshot: {
                exists: false,
              },
            });
            if (runtimeAssessment.status === "TABLE_STATE_STALE" && room) {
              try {
                const didReset = await withBlackjackTableLock(
                  blackjackStateStore,
                  `room:${room.id}`,
                  async (): Promise<boolean> => {
                    const r = await prisma.blackjackRoom.findFirst({
                      where: { gameId },
                      select: { id: true, status: true },
                    });
                    if (!r || r.status !== "PLAYING") return false;
                    const rt = await blackjackStateStore.getTable(gameId);
                    if (!rt) return false;
                    const ms = Date.parse(rt.updatedAt);
                    if (
                      !Number.isFinite(ms) ||
                      Date.now() - ms <= BLACKJACK_RUNTIME_STALE_MS
                    ) {
                      return false;
                    }
                    await resetStaleBlackjackPlaySession({
                      roomId: r.id,
                      gameId,
                    });
                    return true;
                  },
                );
                if (didReset) {
                  socket.emit("ERROR", {
                    code: "TABLE_SESSION_RESET",
                    message:
                      "La partie inactive a été fermée. Rouvrez la salle depuis le lobby.",
                    roomId: room.id,
                  });
                  return;
                }
              } catch (bjLockErr) {
                if (bjLockErr instanceof BlackjackTableLockedError) {
                  socket.emit("ERROR", {
                    code: "TABLE_LOCKED",
                    message: "Table verrouillée, réessaie.",
                  });
                  return;
                }
                console.error(
                  "Erreur reset stale blackjack (JOIN):",
                  bjLockErr,
                );
              }
            }
            if (!runtimeAssessment.canServeState) {
              socket.emit("ERROR", {
                code: runtimeAssessment.status,
                message: runtimeAssessment.reason ?? "Table indisponible",
              });
              return;
            }

            socket.join(gameId);
            socket.join(`blackjack:${gameId}`);
            socket.gameId = gameId;
            const table = activeBlackjackGames.getSync(gameId);
            if (table) {
              socket.emit("BLACKJACK_TABLE_UPDATE", {
                gameId,
                state: table.toPublicState(socket.userId),
              });
              console.log(
                `🃏 Socket ${socket.id} joined blackjack table ${gameId}`,
              );
            } else {
              const stored = await blackjackStateStore.getTable(gameId);
              const storedPublicState = stored?.runtime?.publicState;
              if (storedPublicState && typeof storedPublicState === "object") {
                socket.emit("BLACKJACK_TABLE_UPDATE", {
                  gameId,
                  state: storedPublicState,
                });
                console.log(
                  `🃏 Socket ${socket.id} joined blackjack table ${gameId} (store hydrate)`,
                );
              } else {
                socket.emit("ERROR", {
                  code: "GAME_NOT_FOUND",
                  message: "Table blackjack introuvable",
                });
              }
            }
          } catch (err) {
            console.error("Erreur JOIN_BLACKJACK_TABLE:", err);
          }
        })();
      });

      // 👇 NOUVEAU : LE NETTOYAGE DU BLACKJACK 👇
      socket.on("LEAVE_BLACKJACK_TABLE", (data: { gameId?: string }) => {
        const gameId = data?.gameId;
        if (!gameId) return;

        socket.leave(gameId);
        socket.leave(`blackjack:${gameId}`);
        if (socket.gameId === gameId) {
          socket.gameId = undefined;
        }

        console.log(
          `👋 Socket ${socket.id} a quitté proprement la table blackjack ${gameId}`,
        );
      });
      // 👆 FIN DU NOUVEAU BLOC 👆

      registerBeloteGatewayHandlers(this.io, socket);
      registerVoiceGatewayHandlers(this.io, socket);

      socket.on("SPECTATOR_QUEUE_JOIN", async (data: { gameId: string }) => {
        try {
          const { gameId } = data;
          if (!socket.userId || !gameId || socket.gameId !== gameId) return;
          const game = await activeGames.get(gameId);
          if (!(game instanceof CashGameController)) return;
          game.addSpectatorToRejoinQueue(socket.userId);
          socket.emit("SPECTATOR_QUEUE_STATUS", { queued: true });
        } catch (err) {
          console.error("Erreur SPECTATOR_QUEUE_JOIN:", err);
        }
      });

      socket.on("SPECTATOR_QUEUE_LEAVE", async (data: { gameId: string }) => {
        try {
          const { gameId } = data;
          if (!socket.userId || !gameId || socket.gameId !== gameId) return;
          const game = await activeGames.get(gameId);
          if (!(game instanceof CashGameController)) return;
          game.removeSpectatorFromRejoinQueue(socket.userId);
          socket.emit("SPECTATOR_QUEUE_STATUS", { queued: false });
        } catch (err) {
          console.error("Erreur SPECTATOR_QUEUE_LEAVE:", err);
        }
      });

      socket.on(
        "PLAYER_ACTION",
        async (data: {
          gameId: string;
          playerId: string;
          action: "FOLD" | "CALL" | "RAISE" | "CHECK";
          amount?: number;
          actionId?: string;
          handId?: string;
          expectedStreet?: string;
        }) => {
          const startActionTime = Date.now();
          try {
            const { gameId, playerId, action, amount: rawAmount } = data;
            console.log("[GAME][ACTION] received", {
              socketId: socket.id,
              socketUserId: socket.userId,
              gameId,
              playerId,
              action,
              rawAmount,
              handId: data.handId,
              expectedStreet: data.expectedStreet,
              actionId: data.actionId,
            });
            const amount =
              rawAmount !== undefined ? intChips(rawAmount) : undefined;

            if (!socket.userId) {
              socket.emit("ERROR", {
                code: "UNAUTHORIZED",
                message: "Utilisateur non authentifié",
              });
              return;
            }

            // 👇 B4 : ANTI-BOT : VÉRIFICATION DU TEMPS DE RÉACTION 👇
            const turnStart = this.turnStartTimes.get(gameId);
            if (turnStart) {
              const reactionTimeMs = Date.now() - turnStart;
              this.turnStartTimes.delete(gameId); // On le supprime pour éviter de recompter

              // Appel non-bloquant au service anti-triche
              AntiCheatService.checkBotAction(
                socket.userId,
                reactionTimeMs,
              ).catch((err) => {
                rootLogger.error({
                  msg: "anticheat_bot_check_error",
                  detail: err,
                });
              });
            }
            // 👆 B4 : FIN ANTI-BOT 👆

            const antiCheatResult = this.antiCheat.registerAction(
              socket.userId,
            );

            if (antiCheatResult.suspicious) {
              logSuspiciousAction("TOO_MANY_ACTIONS", {
                userId: socket.userId,
                socketId: socket.id,
                gameId,
                action,
                details: {
                  countInWindow: antiCheatResult.count,
                  windowMs: 3000,
                },
              });

              socket.emit("ERROR", {
                code: "TOO_MANY_ACTIONS",
                message: "Trop d’actions en peu de temps",
              });
              return;
            }

            if (socket.userId !== playerId) {
              logSuspiciousAction("PLAYER_ID_MISMATCH", {
                userId: socket.userId,
                socketId: socket.id,
                gameId,
                action,
                details: { providedPlayerId: playerId, amount },
              });

              socket.emit("ERROR", {
                code: "UNAUTHORIZED",
                message: "Action non autorisée",
              });
              return;
            }

            const game = await activeGames.get(gameId);
            if (!game) {
              const existsInDb = await pokerStateStore.get(gameId);
              if (existsInDb) {
                socket.emit("ERROR", {
                  code: "TABLE_NOT_LOADED_LOCALLY",
                  message: "La table n'est pas chargée en mémoire",
                });
                return;
              }

              logSuspiciousAction("GAME_NOT_FOUND", {
                userId: socket.userId,
                socketId: socket.id,
                gameId,
                action,
              });
              rootLogger.warn({
                msg: "socket_game_not_found",
                reason: "PLAYER_ACTION",
                gameId,
                userId: socket.userId,
                socketId: socket.id,
                action,
                storedSnapshot: false,
              });

              socket.emit("ERROR", {
                code: "GAME_NOT_FOUND",
                message: "Partie introuvable",
              });
              return;
            }

            console.log("[GAME][ACTION] before_apply", {
              gameId,
              playerId,
              action,
              phase: game.state.phase,
              currentTurn: game.state.currentTurn,
              handId: game.state.handId,
              actionVersion: game.state.actionVersion,
              streetVersion: game.state.streetVersion,
              pot: game.state.pot,
            });

            await applyPokerAction({
              gameId,
              playerId,
              actionType: action,
              amount,
              actionId: data.actionId,
              handId: data.handId,
              expectedStreet: data.expectedStreet,
            });

            const freshGameAfterApply = await activeGames.get(gameId);

            if (freshGameAfterApply) {
              console.log("[GAME][ACTION] after_apply", {
                gameId,
                playerId,
                action,
                phase: freshGameAfterApply.state.phase,
                currentTurn: freshGameAfterApply.state.currentTurn,
                handId: freshGameAfterApply.state.handId,
                actionVersion: freshGameAfterApply.state.actionVersion,
                streetVersion: freshGameAfterApply.state.streetVersion,
                pot: freshGameAfterApply.state.pot,
                handRuntimePhase: freshGameAfterApply.state.handRuntimePhase,
                lastHandAction: freshGameAfterApply.state.lastHandAction,
              });
            }

            this.resetTimer(gameId);
            let freshGame = await activeGames.get(gameId);
            if (!freshGame) {
              rootLogger.warn({
                msg: "socket_game_not_found_after_action",
                gameId,
                userId: socket.userId,
                playerId,
                action,
                hint: "table_may_have_been_removed_after_hand_complete",
              });
              socket.emit("ERROR", {
                code: "GAME_NOT_FOUND",
                message: "Partie introuvable",
              });
              return;
            }
            const socketsInRoom = await this.io.in(gameId).fetchSockets();
            await this.logRoomState(gameId, "before_emit_after_player_action", {
              gameId,
              phase: freshGame?.state.phase,
              currentTurn: freshGame?.state.currentTurn,
              handId: freshGame?.state.handId,
              actionVersion: freshGame?.state.actionVersion,
              streetVersion: freshGame?.state.streetVersion,
            });
            for (const s of socketsInRoom) {
              console.log("[SOCKET][EMIT] GAME_UPDATE", {
                targetSocketId: s.id,
                targetUserId: (s as unknown as AuthenticatedSocket).userId,
                gameId,
                phase: freshGame.state.phase,
                currentTurn: freshGame.state.currentTurn,
                handId: freshGame.state.handId,
                actionVersion: freshGame.state.actionVersion,
                streetVersion: freshGame.state.streetVersion,
              });
              const uid = (s as unknown as AuthenticatedSocket).userId;
              const isSpectator = !freshGame.getPlayerState(uid ?? "");
              const snapshot = freshGame.getSanitizedState(
                isSpectator ? undefined : uid,
                isSpectator,
              );
              s.emit("GAME_UPDATE", snapshot);
              s.emit("GAME_STATE_UPDATED", snapshot);
            }
            this.io.to(gameId).emit("HAND_STATE_CHANGED", {
              gameId,
              phase: freshGame.state.phase,
              handRuntimePhase: freshGame.state.handRuntimePhase,
              handEndReason: freshGame.state.handEndReason,
              handId: freshGame.state.handId,
            });

            if (freshGameAfterApply?.state.lastHandAction && freshGameAfterApply.state.handId) {
              const { playerName, action: loggedAction, amount, street } = freshGameAfterApply.state.lastHandAction;
              const line = `${street}|${playerName}|${loggedAction}|${amount ?? 0}`;
              await appendActionLog(gameId, freshGameAfterApply.state.handId, line);
            }

            if (isPracticeBotGameId(gameId)) {
              schedulePracticeBotTurns(this.io, gameId);
            }

            if (freshGame.state.phase === "SHOWDOWN") {
              this.io.to(gameId).emit("SHOWDOWN_REVEAL", {
                gameId,
                handId: freshGame.state.handId,
                handEndReason: freshGame.state.handEndReason,
              });
              const innerGame =
                freshGame instanceof CashGameController
                  ? freshGame.getGameTable()
                  : freshGame;
              if (innerGame && freshGame.state.showdownWinnerId) {
                this.recordMultiPlayerStats(innerGame as GameTable).catch(
                  (err) =>
                    console.error(
                      "[Stats] Erreur enregistrement stats multi:",
                      err,
                    ),
                );
              }
              if (freshGame instanceof CashGameController) {
                const cashGame = freshGame as CashGameController;
                const showdownSnapshot = {
                  handId: freshGame.state.handId ?? "",
                  handEndReason: freshGame.state.handEndReason,
                  showdownWinnerId: freshGame.state.showdownWinnerId,
                  showdownWinnerIds: freshGame.state.showdownWinnerIds,
                  showdownPot: freshGame.state.showdownPot,
                };
                await this.completeCashHandAndBroadcast(
                  gameId,
                  cashGame,
                  cashGame.roomId,
                  showdownSnapshot,
                );
              }
            } else {
              this.startTurnTimer(gameId);
            }

            const duration = Date.now() - startActionTime;
            console.log(
              `[Réseau] ⚡ Action ${action} traitée et diffusée en ${duration}ms pour ${playerId}`,
            );
          } catch (error) {
            const e = error as { code?: string; message?: string };
            logSuspiciousAction("ACTION_ERROR", {
              userId: socket.userId,
              socketId: socket.id,
              gameId: data.gameId,
              action: data.action,
              details: e?.message ?? (error as Error).message,
            });

            console.error("Erreur PLAYER_ACTION:", error);
            socket.emit("ERROR", {
              code: e?.code ?? "ACTION_ERROR",
              message: e?.message ?? (error as Error).message,
            });
          }
        },
      );

      socket.on(
        "GAME_CHAT",
        async (data: {
          gameId: string;
          playerId: string;
          playerName: string;
          content: string;
          type: "emoji" | "text";
        }) => {
          const { gameId, playerId, playerName, content, type } = data;
          if (
            !gameId ||
            !playerId ||
            !content ||
            !socket.gameId ||
            socket.gameId !== gameId
          )
            return;
          if (socket.userId !== playerId) return;
          const censored = censorChatLinks(String(content));
          if (isChatContentEffectivelyEmpty(censored)) return;

          const sanitizeChatDisplayName = (raw: unknown): string => {
            const s = String(raw ?? "");
            let out = "";
            for (let i = 0; i < s.length && out.length < 48; i++) {
              const c = s.charCodeAt(i);
              if (c < 32 || c === 127) continue;
              out += s[i]!;
            }
            return out.trim();
          };

          const uid = socket.userId;
          let resolvedName = "Joueur";
          if (uid) {
            try {
              const user = await prisma.user.findUnique({
                where: { id: uid },
                select: { username: true },
              });
              const fromDb = user?.username?.trim();
              if (fromDb && fromDb.length > 0) {
                resolvedName = fromDb;
              } else {
                resolvedName = sanitizeChatDisplayName(playerName) || "Joueur";
              }
            } catch {
              resolvedName = sanitizeChatDisplayName(playerName) || "Joueur";
            }
          }

          const id = randomUUID();
          void markChatMessageSent(uid)
          socket.broadcast.to(gameId).emit("GAME_CHAT", {
            id,
            gameId,
            playerId,
            playerName: resolvedName,
            content: censored,
            type,
          });
        },
      );

      socket.on(
        "CASH_SIT",
        async (data: {
          gameId: string;
          seatIndex: number;
          buyIn: number;
          avatarUrl?: string;
        }) => {
          try {
            const { gameId, seatIndex, buyIn } = data;
            const userId = socket.userId;
            if (!userId || !gameId || socket.gameId !== gameId) return;
            await withPokerTableLock(gameId, `cashsit:${userId}`, async () => {
              const game = await activeGames.get(gameId);
              if (!(game instanceof CashGameController)) return;
              const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { username: true, chips: true },
              });
              const wallet = intChips(user?.chips ?? 0);
              const profile = await resolveSeatPublicProfile(data.avatarUrl, userId);
              const result = game.sit(
                userId,
                user?.username ?? "Joueur",
                seatIndex,
                buyIn ?? 100,
                profile.avatarUrl,
                wallet,
                profile.cosmetics,
              );
              if (!result.ok) {
                socket.emit("ERROR", {
                  code: "CASH_SIT_FAILED",
                  message: result.error,
                });
                return;
              }
              const seat = game
                .getOccupiedSeats()
                .find((s) => s.userId === userId);
              const debit = intChips(seat?.chips ?? 0);
              try {
                await this.persistCashPokerBuyInDebits(gameId, "sit", [
                  { userId, amount: debit },
                ]);
              } catch {
                game.forceClearSeatForUser(userId);
                socket.emit("ERROR", {
                  code: "CASH_SIT_FAILED",
                  message:
                    "Impossible de débiter le portefeuille pour ce buy-in. Réessayez.",
                });
                return;
              }
              const socketsInRoom = await this.io.in(gameId).fetchSockets();
              for (const s of socketsInRoom) {
                const uid = (s as unknown as AuthenticatedSocket).userId;
                const isSpectator = !game.getPlayerState(uid ?? "");
                const snapshot = game.getSanitizedState(
                  isSpectator ? undefined : uid,
                  isSpectator,
                );
                s.emit("GAME_UPDATE", snapshot);
                s.emit("GAME_STATE_UPDATED", snapshot);
              }
              this.io.to(gameId).emit("CASH_NEXT_HAND_READY_UPDATED", {
                readyUserIds: game.getNextHandReadyUserIds(),
                allReady: game.isAllNextHandPlayersReady(),
                readyDeadline: this.getTournamentInterHandReadyDeadline(gameId),
              });
            });
          } catch (err) {
            if (err instanceof PokerTableLockedError) {
              socket.emit("ERROR", {
                code: "TABLE_LOCKED",
                message: "Une action est déjà en cours sur cette table.",
              });
              return;
            }
            console.error("Erreur CASH_SIT:", err);
          }
        },
      );

      socket.on("PRACTICE_LEAVE", async (data: { gameId?: string }) => {
        try {
          const gameId = data?.gameId;
          if (!gameId || !isPracticeBotGameId(gameId)) return;
          if (socket.gameId !== gameId) return;

          this.resetTimer(gameId);
          clearPracticeBotSession(gameId);
          await activeGames.delete(gameId);
          socket.leave(gameId);
          socket.gameId = undefined;
        } catch (err) {
          console.error("Erreur PRACTICE_LEAVE:", err);
        }
      });

      socket.on("CASH_LEAVE", async (data: { gameId: string }) => {
        try {
          const { gameId } = data;
          const userId = socket.userId;
          if (!userId || !gameId || socket.gameId !== gameId) return;
          await withPokerTableLock(gameId, `cashleave:${userId}`, async () => {
            const game = await activeGames.get(gameId);
            if (!(game instanceof CashGameController)) return;
            const roomId = game.roomId;
            const leaverId = userId;

            if (game.isInHand()) {
              const r = game.quitVoluntaryDuringHand(leaverId);
              if (!r.ok) {
                socket.emit("ERROR", {
                  code: "CASH_LEAVE_FAILED",
                  message: r.error,
                });
                return;
              }

              this.io.to(gameId).emit("PLAYER_LEFT", {
                gameId,
                playerId: leaverId,
                scope: "GAME",
              });
              this.resetTimer(gameId);

              const freshGame = await activeGames.get(gameId);
              if (!freshGame) return;

              const socketsInRoom = await this.io.in(gameId).fetchSockets();
              for (const s of socketsInRoom) {
                const uid = (s as unknown as AuthenticatedSocket).userId;
                const isSpectator = !freshGame.getPlayerState(uid ?? "");
                const snapshot = freshGame.getSanitizedState(
                  isSpectator ? undefined : uid,
                  isSpectator,
                );
                s.emit("GAME_UPDATE", snapshot);
                s.emit("GAME_STATE_UPDATED", snapshot);
              }
              this.io.to(gameId).emit("HAND_STATE_CHANGED", {
                gameId,
                phase: freshGame.state.phase,
                handRuntimePhase: freshGame.state.handRuntimePhase,
                handEndReason: freshGame.state.handEndReason,
                handId: freshGame.state.handId,
              });

              const cashGame =
                freshGame instanceof CashGameController ? freshGame : null;

              if (r.showdown && cashGame) {
                this.io.to(gameId).emit("SHOWDOWN_REVEAL", {
                  gameId,
                  handId: cashGame.state.handId,
                  handEndReason: cashGame.state.handEndReason,
                });

                const innerGame = cashGame.getGameTable();
                if (innerGame && cashGame.state.showdownWinnerId) {
                  this.recordMultiPlayerStats(innerGame as GameTable).catch(
                    (err) =>
                      console.error(
                        "[Stats] Erreur enregistrement stats multi:",
                        err,
                      ),
                  );
                }

                const showdownSnapshot = {
                  handId: cashGame.state.handId ?? "",
                  handEndReason: cashGame.state.handEndReason,
                  showdownWinnerId: cashGame.state.showdownWinnerId,
                  showdownWinnerIds: cashGame.state.showdownWinnerIds,
                  showdownPot: cashGame.state.showdownPot,
                };

                await this.completeCashHandAndBroadcast(
                  gameId,
                  cashGame,
                  roomId,
                  showdownSnapshot,
                );
              } else {
                this.startTurnTimer(gameId);
              }

              return;
            }

            const result = game.leave(leaverId);
            if (!result.ok) {
              socket.emit("ERROR", {
                code: "CASH_LEAVE_FAILED",
                message: result.error,
              });
              return;
            }
            if (result.cashedOutChips > 0) {
              await this.persistCashPokerCashouts(gameId, "leave", [
                {
                  userId: leaverId,
                  chips: result.cashedOutChips,
                  actionPrefix: "leave",
                },
              ]);
            }

            let dissolveReason:
              | "all_players_left"
              | "heads_up_peer_left"
              | null = null;

            this.io.to(gameId).emit("PLAYER_LEFT", {
              gameId,
              playerId: leaverId,
              scope: "GAME",
            });

            if (game.getOccupiedCount() === 1) {
              const remaining = game.getOccupiedSeats()[0]?.userId;
              if (remaining) {
                game.cancelInterHandCountdown();
                const r2 = game.leave(remaining);
                if (r2.ok && r2.cashedOutChips > 0) {
                  await this.persistCashPokerCashouts(gameId, "leave", [
                    {
                      userId: remaining,
                      chips: r2.cashedOutChips,
                      actionPrefix: "heads-up-peer",
                    },
                  ]);
                }
                dissolveReason = "heads_up_peer_left";
              }
            }

            if (game.getOccupiedCount() > 0) {
              const socketsInRoom = await this.io.in(gameId).fetchSockets();
              for (const s of socketsInRoom) {
                const uid = (s as unknown as AuthenticatedSocket).userId;
                const isSpectator = !game.getPlayerState(uid ?? "");
                const snapshot = game.getSanitizedState(
                  isSpectator ? undefined : uid,
                  isSpectator,
                );
                s.emit("GAME_UPDATE", snapshot);
                s.emit("GAME_STATE_UPDATED", snapshot);
              }
            }

            if (game.getOccupiedCount() === 0) {
              if (!dissolveReason) dissolveReason = "all_players_left";

              this.io.to(gameId).emit(
                "GAME_ENDED",
                withVoiceMigrateOnRoomReturn({
                  gameId,
                  reason: dissolveReason,
                  roomId,
                }),
              );

              await activeGames.delete(gameId);
              try {
                await prisma.waitingRoom.updateMany({
                  where: { id: roomId },
                  data: { status: "WAITING", gameId: null },
                });
              } catch (err) {
                // Some CI test databases do not include waiting room tables.
                // Game teardown must still complete and emit GAME_ENDED.
                rootLogger.warn({
                  msg: "cash_leave_waiting_room_update_failed",
                  gameId,
                  roomId,
                  detail: err instanceof Error ? err.message : String(err),
                });
              }
            }
          });
        } catch (err) {
          if (err instanceof PokerTableLockedError) {
            socket.emit("ERROR", {
              code: "TABLE_LOCKED",
              message: "Une action est déjà en cours sur cette table.",
            });
            return;
          }
          console.error("Erreur CASH_LEAVE:", err);
        }
      });

      socket.on(
        "CASH_REBUY",
        async (data: { gameId: string; amount: number }) => {
          try {
            const { gameId, amount } = data;
            if (!socket.userId || !gameId || socket.gameId !== gameId) return;
            const game = await activeGames.get(gameId);
            if (!(game instanceof CashGameController)) return;
            const user = await prisma.user.findUnique({
              where: { id: socket.userId },
              select: { chips: true },
            });
            const wallet = intChips(user?.chips ?? 0);
            const add = intChips(
              Math.max(10, Math.min(intChips(amount ?? 100), 5000)),
            );
            const result = game.rebuy(socket.userId, intChips(amount ?? 100), wallet);
            if (!result.ok) {
              socket.emit("ERROR", {
                code: "CASH_REBUY_FAILED",
                message: result.error,
              });
              return;
            }
            try {
              await this.persistCashPokerRebuyDebit(gameId, socket.userId, add);
            } catch {
              const seat = game
                .getOccupiedSeats()
                .find((s) => s.userId === socket.userId);
              if (seat) seat.chips = Math.max(0, intChips(seat.chips) - add);
              socket.emit("ERROR", {
                code: "CASH_REBUY_FAILED",
                message: "Solde insuffisant pour ce rebuy.",
              });
              return;
            }
            const socketsInRoom = await this.io.in(gameId).fetchSockets();
            for (const s of socketsInRoom) {
              const uid = (s as unknown as AuthenticatedSocket).userId;
              const isSpectator = !game.getPlayerState(uid ?? "");
              s.emit(
                "GAME_UPDATE",
                game.getSanitizedState(isSpectator ? undefined : uid, isSpectator),
              );
            }
          } catch (err) {
            console.error("Erreur CASH_REBUY:", err);
          }
        },
      );

      socket.on(
        "CASH_NEXT_HAND_READY",
        async (data: { gameId: string; ready: boolean }) => {
          try {
            const { gameId, ready } = data;
            if (!socket.userId || !gameId || socket.gameId !== gameId) return;

            const game = await activeGames.get(gameId);
            if (!(game instanceof CashGameController)) return;

            const result = game.setNextHandReady(socket.userId, Boolean(ready));

            this.io.to(gameId).emit("CASH_NEXT_HAND_READY_UPDATED", {
              readyUserIds: result.readyUserIds,
              allReady: result.allReady,
              readyDeadline: this.getTournamentInterHandReadyDeadline(gameId),
            });

            if (result.allReady) {
              this.clearTournamentInterHandAutoReady(gameId);
              game.startHand();
              await this.broadcastCashGameSnapshot(gameId);
              this.io.to(gameId).emit("HAND_STATE_CHANGED", {
                gameId,
                phase: game.state.phase,
                handRuntimePhase: game.state.handRuntimePhase,
                handEndReason: game.state.handEndReason,
                handId: game.state.handId,
              });
              this.resetTimer(gameId);
              this.startTurnTimer(gameId);
            }
          } catch (err) {
            console.error("Erreur CASH_NEXT_HAND_READY:", err);
          }
        },
      );

      socket.on(
        "RECONNECT_GAME",
        async (data: { gameId: string; avatarUrl?: string }) => {
          try {
            const { gameId } = data;

            if (
              socket.userId &&
              this.disconnectionTimeouts.has(socket.userId)
            ) {
              clearTimeout(this.disconnectionTimeouts.get(socket.userId)!);
              this.disconnectionTimeouts.delete(socket.userId);
              console.log(
                `[Réseau] Joueur ${socket.userId} de retour avant la fin du timeout !`,
              );
            }

            if (socket.gameId && socket.gameId !== gameId) {
              socket.leave(socket.gameId);
            }

            socket.join(gameId);
            socket.gameId = gameId;

            await this.logRoomState(gameId, "reconnect_joined_game_room", {
              socketId: socket.id,
              userId: socket.userId,
              gameId,
            });

            // 1) Poker runtime local
            const pokerGame = await activeGames.get(gameId);
            if (pokerGame && socket.userId) {
              const player = pokerGame.getPlayerState(socket.userId);
              if (player) player.isConnected = true;

              if (pokerGame instanceof CashGameController) {
                const profile = await resolveSeatPublicProfile(data.avatarUrl, socket.userId);
                pokerGame.setSeatPublicProfile(socket.userId, profile);

                const socketsInRoom = await this.io.in(gameId).fetchSockets();
                for (const s of socketsInRoom) {
                  const uid = (s as unknown as AuthenticatedSocket).userId;
                  const isSpectator = !pokerGame.getPlayerState(uid ?? "");
                  const snapshot = pokerGame.getSanitizedState(
                    isSpectator ? undefined : uid,
                    isSpectator,
                  );
                  s.emit("GAME_UPDATE", snapshot);
                  s.emit("GAME_STATE_UPDATED", snapshot);
                }
                /* Si une fenêtre ready-check inter-mains tournoi est en cours, renvoie
                 * son état (avec deadline) au client qui se reconnecte — sinon il manquera
                 * l'overlay « Prêt » jusqu'au prochain trigger serveur. */
                if (
                  pokerGame.getWalletLedger() === "none" &&
                  pokerGame.getGameTable() == null
                ) {
                  const survivorCount = pokerGame
                    .getSurvivorsWithChips()
                    .length;
                  if (survivorCount >= 2) {
                    // Reboot serveur : si le timer en mémoire est perdu mais l'état
                    // inter-mains est persistant côté contrôleur, on ré-arme pour ne
                    // pas bloquer la table indéfiniment.
                    if (
                      this.getTournamentInterHandReadyDeadline(gameId) == null
                    ) {
                      this.scheduleTournamentInterHandAutoReady(gameId);
                    }
                    const snap = pokerGame.getSanitizedState();
                    socket.emit("CASH_WAITING_PLAYERS", {
                      cashSeats: snap.cashSeats,
                    });
                    socket.emit("CASH_NEXT_HAND_READY_UPDATED", {
                      readyUserIds: pokerGame.getNextHandReadyUserIds(),
                      allReady: pokerGame.isAllNextHandPlayersReady(),
                      readyDeadline:
                        this.getTournamentInterHandReadyDeadline(gameId),
                    });
                  }
                }
              } else if (pokerGame instanceof GameTable) {
                const profile = await resolveSeatPublicProfile(data.avatarUrl, socket.userId);
                if (socket.userId) {
                  const pl = pokerGame.getPlayerState(socket.userId);
                  if (pl) {
                    if (profile.avatarUrl) pl.avatar = profile.avatarUrl;
                    else delete pl.avatar;
                    pl.cosmetics = profile.cosmetics;
                  }
                }
                const socketsInRoom = await this.io.in(gameId).fetchSockets();
                for (const s of socketsInRoom) {
                  const uid = (s as unknown as AuthenticatedSocket).userId;
                  const isSpectator = !uid || !pokerGame.getPlayerState(uid);
                  const snapshot = pokerGame.getSanitizedState(
                    isSpectator ? undefined : uid,
                    isSpectator,
                  );
                  s.emit("GAME_UPDATE", snapshot);
                  s.emit("GAME_STATE_UPDATED", snapshot);
                }
              }

              this.io.to(gameId).emit("PLAYER_RECONNECTED", {
                playerId: socket.userId,
                gameId,
              });
              console.log(
                `🔄 Joueur ${socket.userId} reconnecté au Poker ${gameId}`,
              );
              return;
            }

            // 2) Poker snapshot store fallback
            const storedPokerSnapshot = await pokerStateStore.get(gameId);
            if (storedPokerSnapshot && socket.userId) {
              const snapshot = this.sanitizeStoredPokerSnapshot(
                storedPokerSnapshot,
                socket.userId,
              );

              socket.emit("GAME_UPDATE", snapshot);
              socket.emit("GAME_STATE_UPDATED", snapshot);

              this.io.to(gameId).emit("PLAYER_RECONNECTED", {
                playerId: socket.userId,
                gameId,
              });
              console.log(
                `🔄 Joueur ${socket.userId} reconnecté au Poker ${gameId} (snapshot store)`,
              );
              return;
            }

            // 3) Blackjack runtime local
            const blackjackTable = activeBlackjackGames.getSync(gameId);
            if (blackjackTable && socket.userId) {
              socket.join(`blackjack:${gameId}`);

              socket.emit("BLACKJACK_TABLE_UPDATE", {
                gameId,
                state: blackjackTable.toPublicState(socket.userId),
              });
              console.log(
                `🔄 Joueur ${socket.userId} reconnecté au Blackjack ${gameId}`,
              );
              return;
            }

            // 4) Blackjack store fallback
            const storedBlackjack = await blackjackStateStore.getTable(gameId);
            const storedPublicState = storedBlackjack?.runtime?.publicState;
            if (storedPublicState && typeof storedPublicState === "object") {
              socket.join(`blackjack:${gameId}`);

              socket.emit("BLACKJACK_TABLE_UPDATE", {
                gameId,
                state: storedPublicState,
              });
              console.log(
                `🔄 Joueur ${socket.userId} reconnecté au Blackjack ${gameId} (store hydrate)`,
              );
              return;
            }

            // 5) Really not found anymore
            logSuspiciousAction("RECONNECT_ERROR", {
              userId: socket.userId,
              socketId: socket.id,
              gameId,
              action: "RECONNECT_GAME",
            });

            socket.emit("ERROR", {
              code: "RECONNECT_ERROR",
              message:
                "Impossible de se reconnecter à la partie (elle est peut-être terminée)",
            });
          } catch (error) {
            console.error("Erreur RECONNECT_GAME:", error);
            socket.emit("ERROR", {
              code: "RECONNECT_ERROR",
              message: "Erreur lors de la reconnexion",
            });
          }
        },
      );

      socket.on("disconnect", async (reason) => {
        await handleVoiceDisconnect(this.io, socket);

        const currentCount = (
          this.io as unknown as { engine: { clientsCount: number } }
        ).engine.clientsCount;
        promMetrics.incSocketEvent("disconnect");
        promMetrics.setSocketIoConnectionsActive(currentCount);
        rootLogger.debug({
          msg: "socket_client_disconnected",
          socketId: socket.id,
          reason,
          clientsCount: currentCount,
        });

        const userId = socket.userId;

        // On nettoie ce socket spécifique de l'annuaire
        this.socketToUser.delete(socket.id);

        if (userId) {
          await markUserOffline(userId, socket.id);
          const stillOnline = await isUserOnline(userId);

          if (!stillOnline) {
            console.log(
              `[Réseau] Le joueur ${userId} n'a plus de sockets actifs.`,
            );
            this.userToSocket.delete(userId);
            this.antiCheat.clearUser(userId);

            this.io.emit("FRIEND_STATUS_CHANGED", {
              userId,
              status: "offline",
            });
          } else {
            console.log(
              `[Réseau] Socket ${socket.id} mort pour ${userId}, mais d'autres connexions restent actives (Redis / cluster).`,
            );
            return;
          }
        }

        if (socket.gameId && userId && !process.env.JEST_WORKER_ID) {
          const gameId = socket.gameId;
          console.log(
            `[Réseau] Joueur ${userId} déconnecté. Lancement du délai de 10s...`,
          );

          const timeout = setTimeout(async () => {
            console.log(
              `[Réseau] Timeout expiré pour ${userId}. Le joueur est officiellement hors ligne.`,
            );
            const game = await activeGames.get(gameId);
            if (game) {
              const player = game.getPlayerState(userId);
              if (player) {
                player.isConnected = false;

                if (game.state.currentTurn === userId) {
                  try {
                    //  On ne force le FOLD que si on n'est pas en phase de Showdown
                    if (game.state.phase !== "SHOWDOWN") {
                      console.log(
                        `[Réseau] Auto-FOLD pour le joueur déconnecté ${userId}`,
                      );
                      game.handlePlayerAction(userId, "FOLD");
                    } else {
                      console.log(
                        `[Réseau] Showdown en cours pour ${userId}, auto-fold ignoré.`,
                      );
                    }

                    const socketsInRoom = await this.io
                      .in(gameId)
                      .fetchSockets();
                    for (const s of socketsInRoom) {
                      const uid = (s as unknown as AuthenticatedSocket).userId;
                      const isSpectator = !game.getPlayerState(uid ?? "");
                      const snapshot = game.getSanitizedState(
                        isSpectator ? undefined : uid,
                        isSpectator,
                      );
                      s.emit("GAME_UPDATE", snapshot);
                      s.emit("GAME_STATE_UPDATED", snapshot);
                    }

                    // On ne relance le timer de tour que si on n'est pas au Showdown
                    if (game.state.phase !== "SHOWDOWN") {
                      this.startTurnTimer(gameId);
                    }
                  } catch (error) {
                    console.error("[Réseau] Erreur auto-fold timeout:", error);
                  }
                } else {
                  player.isActive = false;

                  // pas de force-fold pendant le Showdown
                  if (game.state.phase !== "SHOWDOWN") {
                    game.forceFoldForDisconnect(userId);
                  }

                  const socketsInRoom = await this.io.in(gameId).fetchSockets();
                  for (const s of socketsInRoom) {
                    const uid = (s as unknown as AuthenticatedSocket).userId;
                    const isSpectator = !game.getPlayerState(uid ?? "");
                    const snapshot = game.getSanitizedState(
                      isSpectator ? undefined : uid,
                      isSpectator,
                    );
                    s.emit("GAME_UPDATE", snapshot);
                    s.emit("GAME_STATE_UPDATED", snapshot);
                  }

                  if (game.state.phase === "SHOWDOWN") {
                    this.startTurnTimer(gameId);
                  }
                }

                const result = game.endGameDueToDisconnect();
                if (result) {
                  this.resetTimer(gameId);
                  await activeGames.delete(gameId);
                  this.io.to(gameId).emit("GAME_ENDED", {
                    gameId,
                    winnerId: result.winnerId,
                    reason: "opponent_left",
                    pot: result.pot,
                  });
                } else {
                  this.io.to(gameId).emit("PLAYER_DISCONNECTED", {
                    playerId: userId,
                    gameId,
                  });
                  this.io.to(gameId).emit("PLAYER_LEFT", {
                    gameId,
                    playerId: userId,
                    scope: "GAME",
                  });
                }
              } else if (game instanceof CashGameController) {
                const removed = game.removeDisconnectedPlayer(userId);
                if (removed.ok) {
                  if (removed.cashedOutChips > 0) {
                    await this.persistCashPokerCashouts(gameId, "disconnect", [
                      {
                        userId,
                        chips: removed.cashedOutChips,
                        actionPrefix: "disconnect",
                      },
                    ]);
                  }
                  const socketsInRoom = await this.io.in(gameId).fetchSockets();
                  for (const s of socketsInRoom) {
                    const uid = (s as unknown as AuthenticatedSocket).userId;
                    const isSpectator = !game.getPlayerState(uid ?? "");
                    s.emit(
                      "GAME_UPDATE",
                      game.getSanitizedState(isSpectator ? undefined : uid, isSpectator),
                    );
                  }
                  if (game.getOccupiedCount() === 0) {
                    await activeGames.delete(gameId);

                    // 1. 🚀 ON PRÉVIENT LE FRONTEND IMMÉDIATEMENT
                    this.io.to(gameId).emit(
                      "GAME_ENDED",
                      withVoiceMigrateOnRoomReturn({
                        gameId,
                        reason: "all_players_left",
                        roomId: game.roomId,
                      }),
                    );

                    // 2. 💾 ON SAUVEGARDE EN BDD APRÈS (avec un .catch pour le CI GitLab)
                    await prisma.waitingRoom
                      .updateMany({
                        where: { id: game.roomId },
                        data: { status: "WAITING", gameId: null },
                      })
                      .catch((err) => {
                        console.error(
                          "[Test/BDD] Erreur update waitingRoom ignorée :",
                          err.message,
                        );
                      });
                  }
                }
              }
            }
            this.disconnectionTimeouts.delete(userId);
          }, 10000);

          (timeout as NodeJS.Timeout).unref?.();

          this.disconnectionTimeouts.set(userId, timeout);
        }
      });
    });
  }

  private setupPokerStoreSubscription() {
    void pokerStateStore.subscribeUpdates(async (event) => {
      if (event.type === "POKER_TABLE_DELETED") {
        this.io.to(event.gameId).emit("GAME_ENDED", {
          gameId: event.gameId,
          reason: "table_deleted",
        });
        return;
      }

      const snapshot = await pokerStateStore.get(event.gameId);
      if (!snapshot) return;

      const sockets = await this.io.in(event.gameId).fetchSockets();
      for (const s of sockets) {
        const uid = (s as unknown as AuthenticatedSocket).userId;
        const sanitized = this.sanitizeStoredPokerSnapshot(snapshot, uid);
        s.emit("GAME_UPDATE", sanitized);
        s.emit("GAME_STATE_UPDATED", sanitized);
      }
    });
  }

  private setupBlackjackStoreSubscription() {
    void blackjackStateStore.subscribeUpdates(async (event) => {
      if (event.type !== "BLACKJACK_TABLE_UPDATE") return;
      const state = await blackjackStateStore.getTable(event.tableId);
      const storedPublicState = state?.runtime?.publicState;
      if (!storedPublicState || typeof storedPublicState !== "object") return;

      this.io.to(`blackjack:${event.tableId}`).emit("BLACKJACK_TABLE_UPDATE", {
        gameId: event.tableId,
        state: storedPublicState,
      });
    });
  }

  private async recordMultiPlayerStats(game: GameTable): Promise<void> {
    const winnerId = game.state.showdownWinnerId;
    const winnerIds =
      game.state.showdownWinnerIds ?? (winnerId ? [winnerId] : []);
    const pot = game.state.showdownPot ?? 0;
    if (!winnerId) return;

    const handKey = game.state.handId
      ? `${game.id}:${game.state.handId}`
      : `${game.id}:${Date.now()}`;
    const boardCards = (game.state.communityCards ?? []).map((c: { rank?: string; suit?: string }) =>
      `${c.rank ?? ""}${c.suit ?? ""}`,
    );
    const winnerPlayer = game.state.players.find((p) => p.id === winnerId);

    try {
      await prisma.gameResult.upsert({
        where: { gameId: handKey },
        create: {
          gameId: handKey,
          winnerId,
          winnerName: winnerPlayer?.name ?? "Joueur",
          pot,
          hands: {
            handId: game.state.handId ?? null,
            tableGameId: game.id,
            players: game.state.players.map((p) => ({
              id: p.id,
              name: p.name,
              won: winnerIds.includes(p.id),
            })),
          },
          startedAt: new Date(),
          endedAt: new Date(),
        },
        update: {
          pot,
          endedAt: new Date(),
        },
      });
      await prisma.gameHistory.create({
        data: {
          tableId: game.id,
          gameId: handKey,
          board: boardCards,
          pot,
          winnerId,
        },
      });
    } catch (histErr) {
      console.error("[Stats] Erreur persistance historique poker", histErr);
    }

    for (const player of game.state.players) {
      const isWinner = player.id === winnerId;
      const isWinningPlayer = winnerIds.includes(player.id);
      const chipsWon = isWinner ? pot : 0;
      const chipsLost = !isWinner
        ? (player.totalPutInThisHand ?? player.currentBet ?? 0)
        : 0;
      const participatedInHand =
        (player.totalPutInThisHand ?? 0) > 0 ||
        (player.currentBet ?? 0) > 0 ||
        isWinningPlayer;

      try {
        const xpAmount = isWinner
          ? XP_POKER_SHOWDOWN_WIN
          : XP_POKER_SHOWDOWN_LOSS;
        let handsAfter = 0;
        let winsAfter = 0;
        let nextWinStreak = 0;
        const handEndReason = game.state.handEndReason;
        await prisma.$transaction(async (tx) => {
          const prev = await tx.playerStats.findUnique({
            where: { playerId: player.id },
            select: { winStreak: true, lossStreak: true, totalHands: true, totalWins: true },
          });
          nextWinStreak = isWinner ? (prev?.winStreak ?? 0) + 1 : 0;
          const nextLossStreak = isWinner ? 0 : (prev?.lossStreak ?? 0) + 1;
          const updated = await tx.playerStats.upsert({
            where: { playerId: player.id },
            create: {
              playerId: player.id,
              totalGames: 1,
              totalWins: isWinner ? 1 : 0,
              totalLosses: isWinner ? 0 : 1,
              totalHands: participatedInHand ? 1 : 0,
              totalChipsWon: chipsWon,
              totalChipsLost: chipsLost,
              biggestWin: chipsWon,
              biggestPot: pot,
              winStreak: nextWinStreak,
              lossStreak: nextLossStreak,
            },
            update: {
              totalGames: { increment: 1 },
              ...(participatedInHand ? { totalHands: { increment: 1 } } : {}),
              ...(isWinner
                ? {
                    totalWins: { increment: 1 },
                    totalChipsWon: { increment: chipsWon },
                    winStreak: nextWinStreak,
                    lossStreak: 0,
                  }
                : {
                    totalLosses: { increment: 1 },
                    totalChipsLost: { increment: chipsLost },
                    winStreak: 0,
                    lossStreak: nextLossStreak,
                  }),
            },
          });
          handsAfter = updated.totalHands;
          winsAfter = updated.totalWins;
          await awardXpInTransaction(tx, player.id, xpAmount);
          if (participatedInHand) {
            await markPokerHandResult(
              player.id,
              {
                isBotGame: isPracticeBotGameId(game.id),
                participated: true,
                didWin: isWinningPlayer,
                chipsWon: isWinningPlayer ? chipsWon : 0,
                handEndReason: game.state.handEndReason,
                communityCardCount: game.state.communityCards?.length ?? 0,
                finalHandName: game.state.showdownHandName,
              },
              tx,
            );
          }
        });
        if (participatedInHand) {
          void import("../achievements/achievement.service.js").then(({ checkAchievements }) => {
            void checkAchievements(player.id, { type: "POKER_HAND", handsPlayed: handsAfter });
            if (isWinner) {
              void checkAchievements(player.id, { type: "POKER_WIN", wins: winsAfter });
              if (handEndReason === "WIN_BY_FOLD") {
                void checkAchievements(player.id, { type: "POKER_BLUFF_WIN" });
              }
              if (nextWinStreak >= 10) {
                void checkAchievements(player.id, {
                  type: "POKER_WIN_STREAK",
                  streakCount: nextWinStreak,
                });
              }
            }
          });
          if (isWinner) {
            void import("../season/season.service.js").then(({ incrementSeasonScore }) =>
              incrementSeasonScore(player.id, { pokerWins: 1 }),
            );
          }
        }
      } catch (err) {
        console.error("[Stats] Erreur upsert pour", player.id, err);
      }
    }
    console.log(
      `[Stats] Stats multi enregistrées pour la partie ${game.id} (gagnant: ${winnerId})`,
    );
  }

  private async persistCashPokerBuyInDebits(
    gameId: string,
    ledgerHandId: string,
    items: { userId: string; amount: number }[],
  ): Promise<void> {
    if (items.length === 0) return;
    await prisma.$transaction(async (tx) => {
      for (const { userId, amount } of items) {
        const a = intChips(amount);
        if (a <= 0) continue;
        const row = await tx.user.findUnique({
          where: { id: userId },
          select: { chips: true },
        });
        const before = intChips(row?.chips ?? 0);
        if (before < a) {
          const e = new Error("INSUFFICIENT_CHIPS_BUY_IN") as Error & { code?: string };
          e.code = "INSUFFICIENT_CHIPS_BUY_IN";
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
              handId: ledgerHandId,
              actionId: `buy-in:${userId}:${Date.now()}`,
            }),
            reason: "CASH_POKER_BUY_IN",
            amount: -a,
            balanceBefore: before,
            balanceAfter: after,
          },
          tx,
        );
      }
    });
  }

  private async persistCashPokerRebuyDebit(
    gameId: string,
    userId: string,
    amount: number,
  ): Promise<void> {
    const a = intChips(amount);
    if (a <= 0) return;
    await prisma.$transaction(async (tx) => {
      const row = await tx.user.findUnique({
        where: { id: userId },
        select: { chips: true },
      });
      const before = intChips(row?.chips ?? 0);
      if (before < a) {
        const e = new Error("INSUFFICIENT_CHIPS_REBUY") as Error & { code?: string };
        e.code = "INSUFFICIENT_CHIPS_REBUY";
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
            handId: "rebuy",
            actionId: `rebuy:${userId}:${Date.now()}`,
          }),
          reason: "CASH_POKER_REBUY",
          amount: -a,
          balanceBefore: before,
          balanceAfter: after,
        },
        tx,
      );
    });
  }

  private async persistCashPokerCashouts(
    gameId: string,
    ledgerHandId: string,
    items: { userId: string; chips: number; actionPrefix: string }[],
  ): Promise<void> {
    if (items.length === 0) return;
    try {
      await prisma.$transaction(async (tx) => {
        for (const { userId, chips, actionPrefix } of items) {
          const amount = intChips(chips);
          if (amount <= 0) continue;
          const row = await tx.user.findUnique({
            where: { id: userId },
            select: { chips: true },
          });
          const before = intChips(row?.chips ?? 0);
          const after = before + amount;
          await tx.user.update({
            where: { id: userId },
            data: { chips: after },
          });
          await appendWalletLedgerEntry(
            {
              context: createPokerCashLedgerContext({
                userId,
                gameId,
                handId: ledgerHandId,
                actionId: `${actionPrefix}:${userId}:${Date.now()}`,
              }),
              reason: "CASH_POKER_CASHOUT",
              amount,
              balanceBefore: before,
              balanceAfter: after,
            },
            tx,
          );
        }
      });
    } catch (err) {
      rootLogger.error({
        msg: "cash_poker_cashout_persist_failed",
        gameId,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Après une main cash : HU → s’il ne reste qu’un joueur, retour lobby (GAME_ENDED).
   */
  private async maybeDissolveCashAfterHand(
    cashGame: CashGameController,
    gameId: string,
    roomId: string,
    lastHandId: string,
  ): Promise<boolean> {
    if (cashGame.getWalletLedger() === "none") {
      return false;
    }
    const SHOWDOWN_RESULT_DISPLAY_MS = 3000;
    let dissolveReason: "all_players_left" | "heads_up_peer_left" | null = null;
    if (cashGame.getOccupiedCount() === 1) {
      const remaining = cashGame.getOccupiedSeats()[0]?.userId;
      if (remaining) {
        cashGame.cancelInterHandCountdown();
        const left = cashGame.leave(remaining);
        if (left.ok && left.cashedOutChips > 0) {
          await this.persistCashPokerCashouts(gameId, lastHandId, [
            {
              userId: remaining,
              chips: left.cashedOutChips,
              actionPrefix: "heads-up-dissolve",
            },
          ]);
        }
        dissolveReason = "heads_up_peer_left";
      }
    }
    if (cashGame.getOccupiedCount() === 0) {
      if (!dissolveReason) dissolveReason = "all_players_left";
      await activeGames.delete(gameId);
      await prisma.waitingRoom.updateMany({
        where: { id: roomId },
        data: { status: "WAITING", gameId: null },
      });
      // Laisse le temps au front d'afficher l'abattage + gagnant avant retour waiting room.
      const endTimer = setTimeout(() => {
        this.io.to(gameId).emit(
          "GAME_ENDED",
          withVoiceMigrateOnRoomReturn({
            gameId,
            reason: dissolveReason,
            roomId,
          }),
        );
      }, SHOWDOWN_RESULT_DISPLAY_MS);
      endTimer.unref?.();
      return true;
    }
    return false;
  }

  private async broadcastCashGameSnapshot(gameId: string): Promise<void> {
    const game = await activeGames.get(gameId);
    if (!game || !(game instanceof CashGameController)) return;
    const socketsInRoom = await this.io.in(gameId).fetchSockets();
    for (const s of socketsInRoom) {
      const uid = (s as unknown as AuthenticatedSocket).userId;
      const isSpectator = !game.getPlayerState(uid ?? "");
      const snapshot = game.getSanitizedState(isSpectator ? undefined : uid, isSpectator);
      s.emit("GAME_UPDATE", snapshot);
      s.emit("GAME_STATE_UPDATED", snapshot);
    }
  }

  private async completeCashHandAndBroadcast(
    gameId: string,
    cashGame: CashGameController,
    roomId: string,
    showdownSnapshot: {
      handId: string;
      handEndReason?: string;
      showdownWinnerId?: string;
      showdownWinnerIds?: string[];
      showdownPot?: number;
    },
  ): Promise<void> {
    const virtual = cashGame.getWalletLedger() === "none";
    const gtBeforeComplete = cashGame.getGameTable();
    if (virtual && gtBeforeComplete?.state.phase === "SHOWDOWN") {
      // Même délai que `SHOWDOWN_REVEAL_MS` (5000) côté client `Game.tsx` : laisser le showdown + highlights.
      await new Promise<void>((resolve) => setTimeout(resolve, 5000));
    }
    const hiddenBetSnap = virtual
      ? null
      : buildHiddenBetResolutionPayload(gameId, cashGame);
    const startingMap = cashGame.getLastHandStartingStacks();
    const { playerStacks, seatCashOuts } = cashGame.onHandComplete();
    const handId = showdownSnapshot.handId || "unknown";

    const bustedUserIds = playerStacks
      .filter((b) => intChips(b.chips) <= 0)
      .map((b) => String(b.userId));
    if (virtual && bustedUserIds.length > 0) {
      try {
        const { recordTournamentEliminationsIfAny } = await import(
          "../tournament/tournament.runtime.service.js"
        );
        await recordTournamentEliminationsIfAny(gameId, bustedUserIds);
      } catch (err) {
        rootLogger.error({
          msg: "tournament_elimination_record_failed",
          gameId,
          detail: err instanceof Error ? err.message : String(err),
        });
      }
    }
    for (const bustedUserId of bustedUserIds) {
      this.io.to(`user:${bustedUserId}`).emit("PLAYER_BUSTED", {
        gameId,
        userId: bustedUserId,
        reason: "OUT_OF_CHIPS",
        mode: "cash",
      });
    }

    if (!virtual && (playerStacks.length > 0 || seatCashOuts.length > 0)) {
      try {
        const loanEmits: {
          socketRepayment?: RepaymentSocketPayload;
          socketCompleted?: RepaymentSocketPayload;
        }[] = [];
        let seatAdjustments: { userId: string; delta: number }[] = [];
        await prisma.$transaction(async (tx) => {
          seatAdjustments = [];
          const userIds = [
            ...new Set([
              ...playerStacks.map((p) => p.userId),
              ...seatCashOuts.map((s) => s.userId),
            ]),
          ];
          const dbRows = await tx.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, chips: true },
          });
          const liquidMap = new Map(dbRows.map((r) => [r.id, intChips(r.chips)]));
          async function liquidOf(uid: string): Promise<number> {
            if (!liquidMap.has(uid)) {
              const r = await tx.user.findUnique({
                where: { id: uid },
                select: { chips: true },
              });
              liquidMap.set(uid, intChips(r?.chips ?? 0));
            }
            return liquidMap.get(uid)!;
          }

          for (const { userId, chips: endStackRaw } of playerStacks) {
            const endStack = intChips(endStackRaw);
            const startStack = intChips(startingMap.get(userId) ?? 0);
            const delta = endStack - startStack;
            const liquid = await liquidOf(userId);
            const balanceBeforeTotal = liquid + startStack;
            const balanceAfterTotal = liquid + endStack;

            if (delta !== 0) {
              await appendWalletLedgerEntry(
                {
                  context: createPokerCashLedgerContext({
                    userId,
                    gameId,
                    handId,
                    actionId: `hand-result:${handId}:${userId}`,
                  }),
                  reason: "CASH_POKER_HAND_RESULT",
                  amount: delta,
                  balanceBefore: balanceBeforeTotal,
                  balanceAfter: balanceAfterTotal,
                },
                tx,
              );
            }

            if (delta > 0) {
              const totalAfterWin = liquid + endStack;
              const r = await applyRepaymentOnPokerSettlement(tx, {
                borrowerId: userId,
                grossWinDelta: delta,
                borrowerBalanceAfterFullWin: totalAfterWin,
                gameId,
                handId,
              });
              if (r.repayment > 0 && r.lenderId) {
                await tx.user.update({
                  where: { id: r.lenderId },
                  data: { chips: { increment: r.repayment } },
                });
                seatAdjustments.push({ userId, delta: -r.repayment });
              }
              if (r.socketRepayment || r.socketCompleted) {
                loanEmits.push({
                  socketRepayment: r.socketRepayment,
                  socketCompleted: r.socketCompleted,
                });
              }
            }
          }

          for (const { userId, chips: outRaw } of seatCashOuts) {
            const amount = intChips(outRaw);
            if (amount <= 0) continue;
            const before = await liquidOf(userId);
            const after = before + amount;
            await tx.user.update({
              where: { id: userId },
              data: { chips: after },
            });
            liquidMap.set(userId, after);
            await appendWalletLedgerEntry(
              {
                context: createPokerCashLedgerContext({
                  userId,
                  gameId,
                  handId,
                  actionId: `cashout-hand:${handId}:${userId}`,
                }),
                reason: "CASH_POKER_CASHOUT",
                amount,
                balanceBefore: before,
                balanceAfter: after,
              },
              tx,
            );
          }
        });
        for (const adj of seatAdjustments) {
          cashGame.adjustSeatChips(adj.userId, adj.delta);
        }
        for (const ev of loanEmits) {
          if (ev.socketRepayment) {
            emitToUsers(
              this.io,
              [ev.socketRepayment.borrowerId, ev.socketRepayment.lenderId],
              FRIEND_LOAN_SOCKET.LOAN_REPAYMENT_PROGRESS,
              ev.socketRepayment,
            );
          }
          if (ev.socketCompleted) {
            emitToUsers(
              this.io,
              [ev.socketCompleted.borrowerId, ev.socketCompleted.lenderId],
              FRIEND_LOAN_SOCKET.LOAN_COMPLETED,
              ev.socketCompleted,
            );
          }
        }
      } catch (err) {
        console.error("[CashGame] Erreur persistance soldes showdown:", err);
      }
    }
    if (hiddenBetSnap) {
      try {
        await resolveHiddenBetsForHand(hiddenBetSnap, this.io);
      } catch (err) {
        rootLogger.error({
          msg: "hidden_bet_resolve_hand_failed",
          gameId,
          handId: hiddenBetSnap.handId,
          err: String(err),
        });
      }
    }
    const rejoinBuyIns = virtual
      ? []
      : await cashGame.processRejoinQueue(async (uid) => {
          const u = await prisma.user.findUnique({
            where: { id: uid },
            select: { username: true, chips: true },
          });
          return u
            ? { username: u.username, chips: Math.max(100, u.chips ?? 1000) }
            : null;
        });
    if (!virtual && rejoinBuyIns.length > 0) {
      try {
        await this.persistCashPokerBuyInDebits(
          gameId,
          `rejoin-after:${handId}`,
          rejoinBuyIns.map((b) => ({
            userId: b.userId,
            amount: b.buyInAmount,
          })),
        );
      } catch (err) {
        rootLogger.error({
          msg: "cash_poker_rejoin_buy_in_failed",
          gameId,
          detail: err instanceof Error ? err.message : String(err),
        });
        for (const b of rejoinBuyIns) {
          cashGame.forceClearSeatForUser(b.userId);
        }
      }
    }
    const socketsInRoom2 = await this.io.in(gameId).fetchSockets();
    for (const s of socketsInRoom2) {
      const uid = (s as unknown as AuthenticatedSocket).userId;
      const isSpectator = !cashGame.getPlayerState(uid ?? "");
      const snapshot = cashGame.getSanitizedState(
        isSpectator ? undefined : uid,
        isSpectator,
      );
      s.emit("GAME_UPDATE", snapshot);
      s.emit("GAME_STATE_UPDATED", snapshot);
    }
    this.io.to(gameId).emit("HAND_STATE_CHANGED", {
      gameId,
      phase: cashGame.state.phase,
      handRuntimePhase: cashGame.state.handRuntimePhase,
      handEndReason: cashGame.state.handEndReason,
      handId: cashGame.state.handId,
    });
    this.io.to(gameId).emit("SHOWDOWN_RESULT", {
      gameId,
      handId: showdownSnapshot.handId,
      winnerId: showdownSnapshot.showdownWinnerId,
      winnerIds: showdownSnapshot.showdownWinnerIds ?? [],
      handEndReason: showdownSnapshot.handEndReason,
    });
    this.io.to(gameId).emit("POT_DISTRIBUTED", {
      gameId,
      handId: showdownSnapshot.handId,
      pot: showdownSnapshot.showdownPot ?? 0,
    });
    const dissolved = await this.maybeDissolveCashAfterHand(
      cashGame,
      gameId,
      roomId,
      handId,
    );
    if (!dissolved) {
      if (virtual) {
        const survivors = cashGame.getSurvivorsWithChips();
        if (
          cashGame.getStopWhenSingleSurvivor() &&
          survivors.length === 1
        ) {
          this.clearTournamentInterHandAutoReady(gameId);
          await activeGames.set(gameId, cashGame);
          await this.broadcastCashGameSnapshot(gameId);
          const { onTournamentSingleSurvivor } = await import(
            "../tournament/tournament.gatewayHook.js"
          );
          const tournamentAdvance = await onTournamentSingleSurvivor(
            this.io,
            gameId,
            survivors[0]!.userId,
          );
          this.io.to(gameId).emit("GAME_ENDED", {
            gameId,
            reason: "TOURNAMENT_TABLE_COMPLETE",
            tournamentId: cashGame.roomId,
            winnerUserId: survivors[0]!.userId,
            tournamentAdvance,
          });
        } else {
          /* Tournoi : ready-check inter-mains identique au cash (les joueurs cliquent « Prêt »
           * avant la prochaine main), avec auto-ready 30s pour couvrir l'AFK / crash. */
          const snap = cashGame.getSanitizedState();
          this.io.to(gameId).emit("CASH_WAITING_PLAYERS", {
            cashSeats: snap.cashSeats,
          });
          this.scheduleTournamentInterHandAutoReady(gameId);
          this.io.to(gameId).emit("CASH_NEXT_HAND_READY_UPDATED", {
            readyUserIds: cashGame.getNextHandReadyUserIds(),
            allReady: cashGame.isAllNextHandPlayersReady(),
            readyDeadline: this.getTournamentInterHandReadyDeadline(gameId),
          });
        }
      } else {
        const snap = cashGame.getSanitizedState();
        this.io.to(gameId).emit("CASH_WAITING_PLAYERS", {
          cashSeats: snap.cashSeats,
        });
        this.io.to(gameId).emit("CASH_NEXT_HAND_READY_UPDATED", {
          readyUserIds: cashGame.getNextHandReadyUserIds(),
          allReady: cashGame.isAllNextHandPlayersReady(),
        });
      }
    }
  }

  private bumpTurnTimerEpoch(gameId: string): number {
    const next = (this.turnTimerEpoch.get(gameId) ?? 0) + 1;
    this.turnTimerEpoch.set(gameId, next);
    return next;
  }

  private async ensureTurnTimerForActiveHand(gameId: string) {
    const deadline = this.turnTimerDeadlines.get(gameId);
    if (deadline && deadline > Date.now()) {
      const timeLeft = Math.max(1, Math.ceil((deadline - Date.now()) / 1000));
      this.io.to(gameId).emit("TURN_TIMER", { gameId, timeLeft });
      return;
    }

    const game = await activeGames.get(gameId);
    if (!game) return;
    if (!game.state.currentTurn || game.state.phase === "SHOWDOWN") return;
    this.startTurnTimer(gameId);
  }

  private startTurnTimer(gameId: string) {
    const existing = this.timers.get(gameId);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(gameId);
    }
    const epoch = this.bumpTurnTimerEpoch(gameId);

    void (async () => {
      const game = await activeGames.get(gameId);
      if (!game) return;
      if (this.turnTimerEpoch.get(gameId) !== epoch) return;

      const turnMs =
        game instanceof CashGameController ? game.getTurnTimeoutMs() : 30_000;
      const timeLeftSec = Math.round(turnMs / 1000);
      const deadline = Date.now() + turnMs;

      const timer = setTimeout(async () => {
        if (this.turnTimerEpoch.get(gameId) !== epoch) return;
        this.resetTimer(gameId);
        const g = await activeGames.get(gameId);
        if (!g) return;

        const currentPlayerId = g.state.currentTurn;
        if (currentPlayerId) {
          try {
            const player = g.getPlayerState(currentPlayerId);
            if (!player) return;

            if (
              isPracticeBotGameId(gameId) &&
              currentPlayerId.startsWith("qb-bot-")
            ) {
              clearPracticeBotSession(gameId);
              schedulePracticeBotTurns(this.io, gameId);
              const afterBotKick = await activeGames.get(gameId);
              if (afterBotKick?.state.currentTurn) {
                this.startTurnTimer(gameId);
              }
              return;
            }

            const callAmount = g.calculateCallAmount(currentPlayerId);

            if (callAmount === 0) {
              console.log(`⏱️ Timeout - ${player.name} CHECK auto`);
              await applyPokerAction({
                gameId,
                playerId: currentPlayerId,
                actionType: "CHECK",
                actionId: `timeout-${Date.now()}`,
              });
            } else {
              console.log(
                `⏱️ Timeout - ${player.name} FOLD auto (callAmount: ${callAmount})`,
              );
              await applyPokerAction({
                gameId,
                playerId: currentPlayerId,
                actionType: "FOLD",
                actionId: `timeout-${Date.now()}`,
              });
            }

            const fresh = await activeGames.get(gameId);
            if (!fresh) return;

            const socketsInRoom = await this.io.in(gameId).fetchSockets();
            for (const s of socketsInRoom) {
              const uid = (s as unknown as AuthenticatedSocket).userId;
              const isSpectator = !fresh.getPlayerState(uid ?? "");
              const snapshot = fresh.getSanitizedState(
                isSpectator ? undefined : uid,
                isSpectator,
              );
              s.emit("GAME_UPDATE", snapshot);
              s.emit("GAME_STATE_UPDATED", snapshot);
            }
            if (isPracticeBotGameId(gameId)) {
              schedulePracticeBotTurns(this.io, gameId);
            }
            if (fresh.state.phase === "SHOWDOWN" && fresh instanceof CashGameController) {
              const showdownSnapshot = {
                handId: fresh.state.handId ?? "",
                handEndReason: fresh.state.handEndReason,
                showdownWinnerId: fresh.state.showdownWinnerId,
                showdownWinnerIds: fresh.state.showdownWinnerIds,
                showdownPot: fresh.state.showdownPot,
              };
              await this.completeCashHandAndBroadcast(gameId, fresh, fresh.roomId, showdownSnapshot);
            } else if (fresh.state.currentTurn) {
              this.startTurnTimer(gameId);
            }
          } catch (error) {
            console.error("Erreur timeout:", error);
          }
        }
      }, turnMs);

      if (this.turnTimerEpoch.get(gameId) !== epoch) {
        clearTimeout(timer);
        return;
      }
      this.timers.set(gameId, timer);
      this.turnTimerDeadlines.set(gameId, deadline);

      // 👇 B4 : ANTI-BOT : ON DÉMARRE LE CHRONO ICI 👇
      this.turnStartTimes.set(gameId, Date.now());

      this.io.to(gameId).emit("TURN_TIMER", { gameId, timeLeft: timeLeftSec });
    })();
  }

  private resetTimer(gameId: string) {
    if (this.timers.has(gameId)) {
      clearTimeout(this.timers.get(gameId)!);
      this.timers.delete(gameId);
    }
    // 👇 B4 : ANTI-BOT : ON VIDE LE CHRONO 👇
    this.turnStartTimes.delete(gameId);
    this.turnTimerDeadlines.delete(gameId);

    this.bumpTurnTimerEpoch(gameId);
  }

  /**
   * Tournoi : programme le timer d'auto-ready inter-mains. Au déclenchement, on force
   * tous les survivants à "Prêt" et on enchaîne la main suivante (idempotent — protège
   * de l'AFK / crash). Annulé dès que tous les joueurs ont cliqué Prêt eux-mêmes ou
   * que la table se dissout / passe en GAME_ENDED.
   */
  private scheduleTournamentInterHandAutoReady(gameId: string): void {
    this.clearTournamentInterHandAutoReady(gameId);
    const deadline = Date.now() + GameGateway.TOURNAMENT_HAND_READY_AUTO_MS;
    this.tournamentHandReadyDeadlines.set(gameId, deadline);
    const t = setTimeout(() => {
      void this.autoStartNextTournamentHand(gameId).catch((err) => {
        console.error("[TOURNAMENT][INTER_HAND] auto-ready failed", err);
      });
    }, GameGateway.TOURNAMENT_HAND_READY_AUTO_MS);
    this.tournamentHandReadyTimers.set(gameId, t);
  }

  private clearTournamentInterHandAutoReady(gameId: string): void {
    const t = this.tournamentHandReadyTimers.get(gameId);
    if (t) clearTimeout(t);
    this.tournamentHandReadyTimers.delete(gameId);
    this.tournamentHandReadyDeadlines.delete(gameId);
  }

  /** Deadline absolue (epoch ms) du timer auto-ready inter-mains tournoi, si actif. */
  getTournamentInterHandReadyDeadline(gameId: string): number | null {
    return this.tournamentHandReadyDeadlines.get(gameId) ?? null;
  }

  private async autoStartNextTournamentHand(gameId: string): Promise<void> {
    this.clearTournamentInterHandAutoReady(gameId);
    const game = await activeGames.get(gameId);
    if (!(game instanceof CashGameController)) return;
    if (game.getWalletLedger() !== "none") return;
    if (game.getGameTable() != null) return; // une main est déjà en cours

    const survivors = game.getSurvivorsWithChips();
    if (survivors.length < 2) return;

    const readySet = new Set(game.getNextHandReadyUserIds());
    let kept = survivors.filter((s) => readySet.has(s.userId));
    let afkIds = survivors
      .filter((s) => !readySet.has(s.userId))
      .map((s) => s.userId);

    /* Cas 0 prêt : le joueur avec le plus de jetons l'emporte
     * (départage par userId pour determinisme). */
    if (kept.length === 0) {
      const winner = [...survivors].sort(
        (a, b) => b.chips - a.chips || a.userId.localeCompare(b.userId),
      )[0]!;
      kept = [winner];
      afkIds = survivors
        .filter((s) => s.userId !== winner.userId)
        .map((s) => s.userId);
    }

    /* Élimination en mémoire + DB pour les AFK. */
    for (const uid of afkIds) game.forceClearSeatForUser(uid);
    if (afkIds.length > 0) {
      try {
        const { recordTournamentEliminationsIfAny } = await import(
          "../tournament/tournament.runtime.service.js"
        );
        await recordTournamentEliminationsIfAny(gameId, afkIds);
      } catch (err) {
        rootLogger.error({
          msg: "tournament_afk_elimination_record_failed",
          gameId,
          detail: err instanceof Error ? err.message : String(err),
        });
      }
    }

    /* Notifier les clients AFK (canal `user:` cohérent avec PLAYER_BUSTED existant). */
    for (const uid of afkIds) {
      this.io.to(`user:${uid}`).emit("PLAYER_BUSTED", {
        gameId,
        userId: uid,
        reason: "AFK",
        mode: "cash",
      });
    }

    await activeGames.set(gameId, game);
    await this.broadcastCashGameSnapshot(gameId);

    /* Branche post-élimination. */
    if (kept.length === 1) {
      const { onTournamentSingleSurvivor } = await import(
        "../tournament/tournament.gatewayHook.js"
      );
      const tournamentAdvance = await onTournamentSingleSurvivor(
        this.io,
        gameId,
        kept[0]!.userId,
      );
      this.io.to(gameId).emit("GAME_ENDED", {
        gameId,
        reason: "TOURNAMENT_TABLE_COMPLETE",
        tournamentId: game.roomId,
        winnerUserId: kept[0]!.userId,
        tournamentAdvance,
      });
      return;
    }

    /* ≥2 ready restants → on enchaîne. */
    game.startHand();
    await activeGames.set(gameId, game);
    await this.broadcastCashGameSnapshot(gameId);
    this.io.to(gameId).emit("HAND_STATE_CHANGED", {
      gameId,
      phase: game.state.phase,
      handRuntimePhase: game.state.handRuntimePhase,
      handEndReason: game.state.handEndReason,
      handId: game.state.handId,
    });
    this.resetTimer(gameId);
  }
}
