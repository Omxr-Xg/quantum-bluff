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
      const io = (TournamentService as any).io;

      // A. L'Élimination (La faucheuse) directe !
      if (payload.gameId.startsWith("game_tournoi_")) {
        const bustedPlayers = game.state.players.filter((p) => p.chips <= 0);
        for (const busted of bustedPlayers) {
          console.log(
            `📣 [SOCKET] Envoi du signal d'élimination à ${busted.name}`,
          );
          if (io) io.emit("tournament-eliminated", { userId: busted.id });
        }
      }

      // Cash : pas de relance auto (sinon la main suivante part sans attendre les « Prêt »).
      // La gateway appelle onHandComplete puis startHand() quand tous ont validé (CASH_NEXT_HAND_READY).
      if (game instanceof CashGameController) {
        return;
      }

      // B. On compte les survivants
      const survivors = game.state.players.filter(
        (p) => p.chips > 0 && p.isConnected !== false,
      );

      if (survivors.length > 1) {
        console.log(`⏱️ [MOTEUR] Fin de main. Relance dans 6.5 secondes...`);

        setTimeout(async () => {
          try {
            await withPokerTableLock(
              payload.gameId,
              "auto-start-hand",
              async () => {
                const currentGame = await activeGames.get(payload.gameId);

                if (currentGame && "startHand" in currentGame) {
                  const currentSurvivors = currentGame.state.players.filter(
                    (p) => p.chips > 0 && p.isConnected !== false,
                  );

                  if (currentSurvivors.length > 1) {
                    currentGame.startHand();
                    await activeGames.set(payload.gameId, currentGame);

                    if (io) {
                      const room = io.in(payload.gameId);
                      const sockets = await room.fetchSockets();

                      for (const s of sockets) {
                        const uid = (s as any).userId;
                        const snapshot = currentGame.getSanitizedState(uid);
                        s.emit("GAME_UPDATE", snapshot);
                        s.emit("GAME_STATE_UPDATED", snapshot);
                      }

                      io.to(payload.gameId).emit("HAND_STATE_CHANGED", {
                        gameId: payload.gameId,
                        phase: currentGame.state.phase,
                        handRuntimePhase: currentGame.state.handRuntimePhase,
                        handEndReason: currentGame.state.handEndReason,
                        handId: currentGame.state.handId,
                      });
                    }
                  }
                }
              },
            );
          } catch (error) {
            console.error("❌ Erreur relance auto :", error);
          }
        }, 6500);
      } else if (
        survivors.length === 1 &&
        payload.gameId.startsWith("game_tournoi_")
      ) {
        // 🏆 C. LE GRAND GAGNANT !
        console.log(`🏆 [TOURNOI] VICTOIRE DE ${survivors[0].name} !`);

        // 1. On affiche le bel écran de victoire sur le front
        if (io) io.emit("tournament-won", { userId: survivors[0].id });

        // 2. 💰 ON APPELLE LE BANQUIER POUR PAYER LE JOUEUR
        TournamentService.processVictory(survivors[0].id);

        // 3. On nettoie la mémoire du serveur (on supprime la table)
        activeGames.delete(payload.gameId);
      }
    }
  });

  metrics.incPokerAction("ACCEPTED");
  return { ok: true };
}
