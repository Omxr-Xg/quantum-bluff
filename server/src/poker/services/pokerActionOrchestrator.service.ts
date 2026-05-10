import { activeGames } from "../../shared/activeGames.js";
import { pokerStateStore } from "../../shared/pokerStateStore.js";
import {
  normalizePokerActionPayload,
  validatePokerActionPayload,
} from "../domain/pokerAction.validation.js";
import type {
  PokerActionError,
  PokerActionPayload,
} from "../domain/pokerAction.types.js";
import {
  makePokerActionDedupKey,
  registerPokerActionDedup,
} from "./pokerActionDedup.service.js";
import { withPokerTableLock } from "./pokerTableLock.service.js";
import { metrics } from "../../observability/metrics.js";
import { rootLogger } from "../../observability/logger.js";
import { TournamentService } from "../../services/tournament.service.js";
import { CashGameController } from "../../logic/CashGameController.js";
import { prisma } from "../../config/database.js";
import { isPracticeBotGameId } from "../../shared/practiceBotGames.js";
import type { ActiveGame } from "../../shared/activeGames.js";

/** Tables poker tournoi (y compris table finale `game_tournoi_final_*`). */
function isTournamentTableGameId(gameId: string): boolean {
  return gameId.startsWith("game_tournoi_");
}

type ActionTarget = {
  getStateContext: () => {
    handId?: string;
    phase?: string;
    currentTurn?: string;
  };
  apply: (
    playerId: string,
    action: "FOLD" | "CALL" | "RAISE" | "CHECK",
    amount?: number,
  ) => void;
  getMinRaise: () => number;
};

async function handleHandCompleteIfNeeded(
  gameId: string,
  game: ActiveGame,
): Promise<void> {
  if (game.state.handRuntimePhase !== "HAND_COMPLETE") {
    return;
  }

  const io = TournamentService.getIo();

  if (isTournamentTableGameId(gameId)) {
    const bustedPlayers = game.state.players.filter((p) => p.chips <= 0);
    for (const busted of bustedPlayers) {
      console.log(
        `📣 [SOCKET] Envoi du signal d'élimination à ${busted.name}`,
      );
      if (io) io.to(`user:${busted.id}`).emit("tournament-eliminated", { userId: busted.id });
      if (io) {
        io.to(`user:${busted.id}`).emit("PLAYER_BUSTED", {
          gameId,
          userId: String(busted.id),
          reason: "OUT_OF_CHIPS",
          mode: "tournament",
        });
      }
    }
    for (const busted of bustedPlayers) {
      const tp = await prisma.tournamentPlayer.findFirst({
        where: { userId: String(busted.id), tournament: { status: 'ACTIVE' } }
      });
      if (tp) TournamentService.recordElimination(tp.tournamentId, String(busted.id));
    }
  }

  if (game instanceof CashGameController) {
    return;
  }

  const survivors = isTournamentTableGameId(gameId)
    ? game.state.players.filter((p) => p.chips > 0)
    : game.state.players.filter(
        (p) => p.chips > 0 && p.isConnected !== false,
      );

  if (gameId.startsWith("game_tournoi_merge_")) {
    if (survivors.length === 2) {
      await TournamentService.handleMergeRoundComplete(
        gameId,
        survivors.map((p) => ({
          userId: String(p.id),
          username: String(p.name),
          chips: p.chips,
        })),
      );
      activeGames.delete(gameId);
      return;
    }
    if (survivors.length === 1) {
      await TournamentService.handleMergeSingleWinner(
        gameId,
        String(survivors[0].id),
      );
      activeGames.delete(gameId);
      return;
    }
  }

  if (survivors.length > 1) {
    const nextHandDelayMs = isPracticeBotGameId(gameId) ? 900 : 6500;
    console.log(
      `⏱️ [MOTEUR] Fin de main. Relance dans ${nextHandDelayMs}ms...`,
    );

    setTimeout(async () => {
      try {
        await withPokerTableLock(
          gameId,
          "auto-start-hand",
          async () => {
            const currentGame = await activeGames.get(gameId);

            if (currentGame && "startHand" in currentGame) {
              const currentSurvivors = isTournamentTableGameId(
                gameId,
              )
                ? currentGame.state.players.filter((p) => p.chips > 0)
                : currentGame.state.players.filter(
                    (p) =>
                      p.chips > 0 && p.isConnected !== false,
                  );

              if (currentSurvivors.length > 1) {
                currentGame.startHand();
                await activeGames.set(gameId, currentGame);

                const ioRel = TournamentService.getIo() ?? io;
                if (ioRel) {
                  const room = ioRel.in(gameId);
                  const sockets = await room.fetchSockets();

                  for (const s of sockets) {
                    const uid = (s as unknown as { userId?: string }).userId;
                    const isSpectator = !currentGame.getPlayerState(
                      uid ?? "",
                    );
                    const snapshot = currentGame.getSanitizedState(
                      isSpectator ? undefined : uid,
                      isSpectator,
                    );
                    s.emit("GAME_UPDATE", snapshot);
                    s.emit("GAME_STATE_UPDATED", snapshot);
                  }

                  ioRel.to(gameId).emit("HAND_STATE_CHANGED", {
                    gameId,
                    phase: currentGame.state.phase,
                    handRuntimePhase: currentGame.state.handRuntimePhase,
                    handEndReason: currentGame.state.handEndReason,
                    handId: currentGame.state.handId,
                  });
                }
              } else if (isPracticeBotGameId(gameId)) {
                const ioRel = TournamentService.getIo() ?? io;
                if (ioRel) {
                  let reason:
                    | "human_won"
                    | "human_busted"
                    | "session_over" = "session_over";
                  if (currentSurvivors.length === 1) {
                    reason = currentSurvivors[0].id.startsWith("qb-bot-")
                      ? "human_busted"
                      : "human_won";
                  }
                  ioRel.to(gameId).emit("PRACTICE_SESSION_END", {
                    gameId,
                    reason,
                  });
                }
              }
            }
          },
        );

        const ioAfter = TournamentService.getIo();
        if (ioAfter && isPracticeBotGameId(gameId)) {
          const { runPracticeBotTurnsChain, broadcastPracticeTableState } =
            await import("./practiceBotTurns.service.js");
          await runPracticeBotTurnsChain(ioAfter, gameId);
          await broadcastPracticeTableState(ioAfter, gameId);
        }
      } catch (error) {
        console.error("❌ Erreur relance auto :", error);
        const ioErr = TournamentService.getIo();
        if (ioErr && isPracticeBotGameId(gameId)) {
          ioErr.to(gameId).emit("PRACTICE_SESSION_END", {
            gameId,
            reason: "stuck",
          });
        }
      }
    }, nextHandDelayMs);
  } else if (
    survivors.length === 1 &&
    isTournamentTableGameId(gameId) &&
    !gameId.startsWith("game_tournoi_merge_")
  ) {
    console.log(`🏆 [TOURNOI] VICTOIRE DE ${survivors[0].name} !`);

    const tp = await prisma.tournamentPlayer.findFirst({
      where: { userId: String(survivors[0].id), tournament: { status: 'ACTIVE' } },
    });
    if (tp) {
      const partial = await TournamentService.handleTableFinished(
        tp.tournamentId,
        String(survivors[0].id),
        survivors[0].name,
        survivors[0].chips,
        gameId,
      );
      if (partial?.emitTournamentWonPartial && io) {
        io.to(`user:${partial.emitTournamentWonPartial.userId}`).emit(
          "tournament-won",
          {
            userId: partial.emitTournamentWonPartial.userId,
            survivorsCount: partial.emitTournamentWonPartial.survivorsCount,
            expectedTables: partial.emitTournamentWonPartial.expectedTables,
          },
        );
      }
    } else {
      const fallbackTournament = await prisma.tournament.findFirst({
        where: {
          status: "ACTIVE",
          players: { some: { userId: String(survivors[0].id) } },
        },
        select: { id: true },
      });
      await TournamentService.processVictory(
        [String(survivors[0].id)],
        fallbackTournament?.id,
      );
    }

    activeGames.delete(gameId);
  } else if (isPracticeBotGameId(gameId) && io) {
    let reason: "human_won" | "human_busted" | "session_over" =
      "session_over";
    if (survivors.length === 1) {
      reason = survivors[0].id.startsWith("qb-bot-")
        ? "human_busted"
        : "human_won";
    }
    io.to(gameId).emit("PRACTICE_SESSION_END", {
      gameId,
      reason,
    });
  }
}

function makeError(
  code: PokerActionError["code"],
  message: string,
  httpStatus = 400,
): PokerActionError {
  return { code, message, httpStatus };
}

function logRejected(
  code: PokerActionError["code"],
  fields: {
    gameId?: string;
    handId?: string;
    actionId?: string;
    playerId?: string;
  },
): void {
  metrics.incPokerAction(code);
  const level = code === "DUPLICATE_ACTION" ? "info" : "warn";
  rootLogger[level]({
    msg: "poker_action_rejected",
    code,
    ...fields,
  });
}

export async function applyPokerAction(
  payloadLike: Partial<PokerActionPayload>,
): Promise<{
  ok: true;
}> {
  const payload = normalizePokerActionPayload(payloadLike);
  const validation = validatePokerActionPayload(payload);
  if (!validation.ok) {
    logRejected("INVALID_ACTION", {
      gameId: payload.gameId,
      actionId: payload.actionId,
    });
    throw makeError("INVALID_ACTION", validation.message, 400);
  }

  const game = await activeGames.get(payload.gameId);
  if (!game) {
    const snapshot = await pokerStateStore.get(payload.gameId);
    if (snapshot) {
      logRejected("TABLE_NOT_LOADED_LOCALLY", {
        gameId: payload.gameId,
        handId: snapshot.handId,
        actionId: payload.actionId,
      });
      rootLogger.warn({
        msg: "poker_table_not_loaded_locally",
        gameId: payload.gameId,
        hint:
          "En multi-instances, orienter le client (HTTP + WebSocket) vers la même réplique ou activer l’affinité par cookie / en-tête ; la partie peut être sur un autre pod.",
      });
      throw makeError(
        "TABLE_NOT_LOADED_LOCALLY",
        "Table non chargée sur ce nœud. Reconnectez-vous et réessayez.",
        409,
      );
    }

    rootLogger.warn({
      msg: "poker_action_game_not_found",
      gameId: payload.gameId,
      playerId: payload.playerId,
      actionId: payload.actionId,
      pokerStateStoreSnapshot: false,
    });
    logRejected("GAME_NOT_FOUND", {
      gameId: payload.gameId,
      playerId: payload.playerId,
      actionId: payload.actionId,
    });
    throw makeError("GAME_NOT_FOUND", "Partie introuvable", 404);
  }

  const target: ActionTarget = {
    getStateContext: () => ({
      handId: game.state.handId,
      phase: game.state.phase,
      currentTurn: game.state.currentTurn,
    }),
    apply: (playerId, action, amount) =>
      game.handlePlayerAction(playerId, action, amount),
    getMinRaise: () =>
      "getMinRaise" in game && typeof game.getMinRaise === "function"
        ? game.getMinRaise()
        : 0,
  };

  const ctx = target.getStateContext();
  if (ctx.currentTurn !== payload.playerId) {
    logRejected("NOT_YOUR_TURN", {
      gameId: payload.gameId,
      handId: ctx.handId,
      actionId: payload.actionId,
    });
    throw makeError("NOT_YOUR_TURN", "Ce n'est pas votre tour", 409);
  }
  if (payload.handId && ctx.handId && payload.handId !== ctx.handId) {
    logRejected("STALE_ACTION", {
      gameId: payload.gameId,
      handId: payload.handId,
      actionId: payload.actionId,
    });
    throw makeError("STALE_ACTION", "Action obsolète (main différente)", 409);
  }
  if (
    payload.expectedStreet &&
    ctx.phase &&
    payload.expectedStreet !== ctx.phase
  ) {
    // 🛡️ CORRECTIF : Tolérance pour l'animation de distribution (INIT = PREFLOP)
    if (payload.expectedStreet === "INIT" && ctx.phase === "PREFLOP") {
      console.log(
        `🆗 [MOTEUR] Tolérance appliquée : Le front est en INIT, le serveur est en PREFLOP. Action acceptée !`,
      );
    } else {
      console.error(
        `🚨 DÉCALAGE ! Le navigateur a envoyé: ${payload.expectedStreet}, mais le serveur est à: ${ctx.phase}`,
      );

      logRejected("STALE_ACTION", {
        gameId: payload.gameId,
        handId: ctx.handId,
        actionId: payload.actionId,
      });
      throw makeError(
        "STALE_ACTION",
        "Action obsolète (street différente)",
        409,
      );
    }
  } // 👈 Vérifie bien que cette dernière accolade est présente !

  const contextKey = `${ctx.handId ?? "no-hand"}:${ctx.phase ?? "unknown"}:${ctx.currentTurn ?? ""}`;
  const dedupKey = makePokerActionDedupKey(payload);
  const dedup = registerPokerActionDedup({ dedupKey, contextKey });
  if (!dedup.accepted) {
    if (dedup.reason === "DUPLICATE_ACTION") {
      logRejected("DUPLICATE_ACTION", {
        gameId: payload.gameId,
        handId: ctx.handId,
        actionId: payload.actionId,
      });
      throw makeError("DUPLICATE_ACTION", "Action déjà traitée", 409);
    }
    logRejected("STALE_ACTION", {
      gameId: payload.gameId,
      handId: ctx.handId,
      actionId: payload.actionId,
    });
    throw makeError("STALE_ACTION", "Action obsolète", 409);
  }

  const lockOwner = `${payload.playerId}:${payload.actionId ?? Date.now().toString()}`;
  await withPokerTableLock(payload.gameId, lockOwner, async () => {
    // 1. Le joueur fait son action (Fold, Call, Raise...)
    target.apply(payload.playerId, payload.actionType, payload.amount);

    // 2. 🔄 GESTION DE LA FIN DE MAIN ET RELANCE AUTOMATIQUE
    await handleHandCompleteIfNeeded(payload.gameId, game);
  });

  metrics.incPokerAction("ACCEPTED");
  return { ok: true };
}
