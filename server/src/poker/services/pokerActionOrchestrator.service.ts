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

function makeError(
  code: PokerActionError["code"],
  message: string,
  httpStatus = 400,
): PokerActionError {
  return { code, message, httpStatus };
}

function logRejected(
  code: PokerActionError["code"],
  fields: { gameId?: string; handId?: string; actionId?: string },
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
      throw makeError(
        "TABLE_NOT_LOADED_LOCALLY",
        "Table non chargée sur ce nœud. Reconnectez-vous et réessayez.",
        409,
      );
    }

    logRejected("GAME_NOT_FOUND", { gameId: payload.gameId });
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
    if (game.state.handRuntimePhase === "HAND_COMPLETE") {
      // 📡 On attrape le mégaphone global
      const io = TournamentService.getIo();

      // A. L'Élimination (La faucheuse) directe !
      if (isTournamentTableGameId(payload.gameId)) {
        const bustedPlayers = game.state.players.filter((p) => p.chips <= 0);
        for (const busted of bustedPlayers) {
          console.log(
            `📣 [SOCKET] Envoi du signal d'élimination à ${busted.name}`,
          );
          if (io) io.to(`user:${busted.id}`).emit("tournament-eliminated", { userId: busted.id });
        }
        // Record elimination order for tournament prize ranking
        for (const busted of bustedPlayers) {
          const tp = await prisma.tournamentPlayer.findFirst({
            where: { userId: String(busted.id), tournament: { status: 'ACTIVE' } }
          });
          if (tp) TournamentService.recordElimination(tp.tournamentId, String(busted.id));
        }
      }

      // Cash : pas de relance auto (sinon la main suivante part sans attendre les « Prêt »).
      // La gateway appelle onHandComplete puis startHand() quand tous ont validé (CASH_NEXT_HAND_READY).
      if (game instanceof CashGameController) {
        return;
      }

      // B. On compte les survivants (tournoi : tout joueur avec jetons reste en lice même si déconnecté)
      const survivors = isTournamentTableGameId(payload.gameId)
        ? game.state.players.filter((p) => p.chips > 0)
        : game.state.players.filter(
            (p) => p.chips > 0 && p.isConnected !== false,
          );

      if (survivors.length > 1) {
        const nextHandDelayMs = isPracticeBotGameId(payload.gameId)
          ? 900
          : 6500;
        console.log(
          `⏱️ [MOTEUR] Fin de main. Relance dans ${nextHandDelayMs}ms...`,
        );

        setTimeout(async () => {
          try {
            await withPokerTableLock(
              payload.gameId,
              "auto-start-hand",
              async () => {
                const currentGame = await activeGames.get(payload.gameId);

                if (currentGame && "startHand" in currentGame) {
                  const currentSurvivors = isTournamentTableGameId(
                    payload.gameId,
                  )
                    ? currentGame.state.players.filter((p) => p.chips > 0)
                    : currentGame.state.players.filter(
                        (p) =>
                          p.chips > 0 && p.isConnected !== false,
                      );

                  if (currentSurvivors.length > 1) {
                    currentGame.startHand();
                    await activeGames.set(payload.gameId, currentGame);

                    const ioRel = TournamentService.getIo() ?? io;
                    if (ioRel) {
                      const room = ioRel.in(payload.gameId);
                      const sockets = await room.fetchSockets();

                      for (const s of sockets) {
                        const uid = (s as unknown as { userId?: string }).userId;
                        const isSpectator = !currentGame.getPlayerState(
                          uid ?? "",
                        );
                        const snapshot = currentGame.getSanitizedState(
                          isSpectator ? undefined : uid,
                        );
                        s.emit("GAME_UPDATE", snapshot);
                        s.emit("GAME_STATE_UPDATED", snapshot);
                      }

                      ioRel.to(payload.gameId).emit("HAND_STATE_CHANGED", {
                        gameId: payload.gameId,
                        phase: currentGame.state.phase,
                        handRuntimePhase: currentGame.state.handRuntimePhase,
                        handEndReason: currentGame.state.handEndReason,
                        handId: currentGame.state.handId,
                      });
                    }
                  } else if (isPracticeBotGameId(payload.gameId)) {
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
                      ioRel.to(payload.gameId).emit("PRACTICE_SESSION_END", {
                        gameId: payload.gameId,
                        reason,
                      });
                    }
                  }
                }
              },
            );

            const ioAfter = TournamentService.getIo();
            if (ioAfter && isPracticeBotGameId(payload.gameId)) {
              const { runPracticeBotTurnsChain, broadcastPracticeTableState } =
                await import("./practiceBotTurns.service.js");
              await runPracticeBotTurnsChain(ioAfter, payload.gameId);
              await broadcastPracticeTableState(ioAfter, payload.gameId);
            }
          } catch (error) {
            console.error("❌ Erreur relance auto :", error);
            const ioErr = TournamentService.getIo();
            if (ioErr && isPracticeBotGameId(payload.gameId)) {
              ioErr.to(payload.gameId).emit("PRACTICE_SESSION_END", {
                gameId: payload.gameId,
                reason: "stuck",
              });
            }
          }
        }, nextHandDelayMs);
      } else if (
        survivors.length === 1 &&
        isTournamentTableGameId(payload.gameId)
      ) {
        // 🏆 C. LE GRAND GAGNANT !
        console.log(`🏆 [TOURNOI] VICTOIRE DE ${survivors[0].name} !`);

        if (io) io.to(`user:${survivors[0].id}`).emit("tournament-won", { userId: survivors[0].id });

        const tp = await prisma.tournamentPlayer.findFirst({
          where: { userId: String(survivors[0].id), tournament: { status: 'ACTIVE' } },
        });
        if (tp) {
          await TournamentService.handleTableFinished(
            tp.tournamentId,
            String(survivors[0].id),
            survivors[0].name,
            survivors[0].chips,
          );
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

        activeGames.delete(payload.gameId);
      } else if (isPracticeBotGameId(payload.gameId) && io) {
        let reason: "human_won" | "human_busted" | "session_over" =
          "session_over";
        if (survivors.length === 1) {
          reason = survivors[0].id.startsWith("qb-bot-")
            ? "human_busted"
            : "human_won";
        }
        io.to(payload.gameId).emit("PRACTICE_SESSION_END", {
          gameId: payload.gameId,
          reason,
        });
      }
    }
  });

  metrics.incPokerAction("ACCEPTED");
  return { ok: true };
}
