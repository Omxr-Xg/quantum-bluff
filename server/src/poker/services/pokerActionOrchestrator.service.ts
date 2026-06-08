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
import { getGameIo } from "../../sockets/gameIo.registry.js";
import { CashGameController } from "../../logic/CashGameController.js";
import {
  getPracticeBotDifficulty,
  isPracticeBotGameId,
} from "../../shared/practiceBotGames.js";
import type { ActiveGame } from "../../shared/activeGames.js";
import { GameTable } from "../../logic/GameTable.js";
import {
  captureTendencyActionContext,
  logHumanTendencyAction,
  onPracticeExpertHandComplete,
} from "./playerTendency.service.js";

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

const QB_BOT_PREFIX = "qb-bot-";

async function maybeRecordPracticeExpertTendency(
  gameId: string,
  game: ActiveGame,
  playerId: string,
  actionType: "FOLD" | "CALL" | "RAISE" | "CHECK",
  amount?: number,
): Promise<void> {
  if (!isPracticeBotGameId(gameId)) return;
  if (getPracticeBotDifficulty(gameId) !== "expert") return;
  if (playerId.startsWith(QB_BOT_PREFIX)) return;
  if (!(game instanceof GameTable)) return;

  const ctx = captureTendencyActionContext(game, playerId, gameId);
  if (!ctx) return;

  try {
    await logHumanTendencyAction(playerId, ctx, actionType, amount);
  } catch (err) {
    rootLogger.warn({
      msg: "player_tendency_log_failed",
      gameId,
      playerId,
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}

async function maybeBumpPracticeExpertHand(
  gameId: string,
  game: ActiveGame,
): Promise<void> {
  if (!isPracticeBotGameId(gameId)) return;
  if (getPracticeBotDifficulty(gameId) !== "expert") return;
  if (!(game instanceof GameTable)) return;

  try {
    await onPracticeExpertHandComplete(gameId, game);
  } catch (err) {
    rootLogger.warn({
      msg: "player_tendency_hand_complete_failed",
      gameId,
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}

async function handleHandCompleteIfNeeded(
  gameId: string,
  game: ActiveGame,
): Promise<void> {
  if (game.state.handRuntimePhase !== "HAND_COMPLETE") {
    return;
  }

  await maybeBumpPracticeExpertHand(gameId, game);

  const io = getGameIo();

  if (game instanceof CashGameController) {
    return;
  }

  const survivors = game.state.players.filter(
    (p) => p.chips > 0 && p.isConnected !== false,
  );

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
              const currentSurvivors = currentGame.state.players.filter(
                (p) =>
                  p.chips > 0 && p.isConnected !== false,
              );

              if (currentSurvivors.length > 1) {
                currentGame.startHand();
                await activeGames.set(gameId, currentGame);

                const ioRel = getGameIo() ?? io;
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
                const ioRel = getGameIo() ?? io;
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

        const ioAfter = getGameIo();
        if (ioAfter && isPracticeBotGameId(gameId)) {
          const { runPracticeBotTurnsChain, broadcastPracticeTableState } =
            await import("./practiceBotTurns.service.js");
          await runPracticeBotTurnsChain(ioAfter, gameId);
          await broadcastPracticeTableState(ioAfter, gameId);
        }
      } catch (error) {
        console.error("❌ Erreur relance auto :", error);
        const ioErr = getGameIo();
        if (ioErr && isPracticeBotGameId(gameId)) {
          ioErr.to(gameId).emit("PRACTICE_SESSION_END", {
            gameId,
            reason: "stuck",
          });
        }
      }
    }, nextHandDelayMs);
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

    await maybeRecordPracticeExpertTendency(
      payload.gameId,
      game,
      payload.playerId,
      payload.actionType,
      payload.amount,
    );

    // 2. 🔄 GESTION DE LA FIN DE MAIN ET RELANCE AUTOMATIQUE
    await handleHandCompleteIfNeeded(payload.gameId, game);
  });

  metrics.incPokerAction("ACCEPTED");
  return { ok: true };
}
