import { GameTable } from "../logic/GameTable.js";
import type { CashGameController } from "../logic/CashGameController.js";
import {
  saveGame,
  getGame,
  deleteGame,
  restoreAllGames,
  isRedisHealthy,
} from "../config/redis.config.js";
import { pokerStateStore } from "./pokerStateStore.js";
import { serializePokerRuntimeSnapshot } from "../poker/services/pokerStateSync.service.js";

export type ActiveGame = GameTable | CashGameController;

/** Intervalle de re-tentative Redis (ms) quand Redis est down */
const REDIS_RECONNECT_INTERVAL_MS = 30_000;

class ActiveGamesManager {
  private localCache: Map<string, ActiveGame> = new Map();
  private useRedis: boolean = true;
  private reconnectTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.initialize();
    this.startRedisHealthCheck();
  }

  private async initialize() {
    if (this.useRedis) {
      try {
        const restored = await restoreAllGames();
        // Ne pas écraser le cache local : les parties cash (CashGameController) n’y sont pas
        // sérialisées ; une restauration Redis qui arrive après un set() test / runtime sinon les fait disparaître.
        this.localCache = new Map([...restored, ...this.localCache]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (
          !/Connection is closed|ECONNRESET|READONLY|ENOTFOUND|ECONNREFUSED|max retries per request|Stream isn't writeable|enableOfflineQueue/i.test(
            msg,
          )
        ) {
          console.error(
            "[activeGames] Redis down, fallback mémoire uniquement:",
            err,
          );
        }
        this.useRedis = false;
      }
    }
  }

  /** Vérifie périodiquement si Redis est de retour et resynchronise */
  private startRedisHealthCheck() {
    this.reconnectTimer = setInterval(async () => {
      if (this.useRedis) return;
      try {
        if (await isRedisHealthy()) {
          console.log("[activeGames] Redis de retour, re-sync en cours...");
          const restored = await restoreAllGames();
          this.localCache = new Map([...restored, ...this.localCache]);
          this.useRedis = true;
        }
      } catch {
        // Redis toujours down, on reste en fallback
      }
    }, REDIS_RECONNECT_INTERVAL_MS);
    this.reconnectTimer?.unref?.();
  }

  private pushPokerSnapshot(gameId: string, game: ActiveGame): void {
    const snapshot = serializePokerRuntimeSnapshot(gameId, game);

    void pokerStateStore
      .set(gameId, snapshot, { ttlSec: 60 * 60 * 6 })
      .then(() =>
        pokerStateStore.publishUpdate({
          type: "POKER_TABLE_UPDATE",
          gameId,
          updatedAt: snapshot.updatedAt,
          version: snapshot.version,
        }),
      )
      .catch((err) => {
        console.error("[activeGames] Erreur sync pokerStateStore:", err);
      });
  }

  async get(gameId: string): Promise<ActiveGame | undefined> {
    if (this.localCache.has(gameId)) {
      return this.localCache.get(gameId);
    }
    if (this.useRedis) {
      try {
        const game = await getGame(gameId);
        if (game) {
          this.localCache.set(gameId, game);
          return game;
        }
      } catch (err) {
        console.warn("[activeGames] Redis get failed, fallback local:", err);
      }
    }
    return undefined;
  }

  async set(gameId: string, game: ActiveGame): Promise<void> {
    this.localCache.set(gameId, game);
    this.pushPokerSnapshot(gameId, game);
    if (this.useRedis && game instanceof GameTable) {
      saveGame(gameId, game).catch((err) => {
        console.error(
          "[activeGames] Erreur save Redis, jeu conservé en mémoire:",
          err,
        );
      });
    }
  }

  async delete(gameId: string): Promise<void> {
    this.localCache.delete(gameId);
    void pokerStateStore
      .delete(gameId)
      .then(() =>
        pokerStateStore.publishUpdate({
          type: "POKER_TABLE_DELETED",
          gameId,
          updatedAt: new Date().toISOString(),
        }),
      )
      .catch((err) => {
        console.error("[activeGames] Erreur delete pokerStateStore:", err);
      });
    if (this.useRedis) {
      try {
        await deleteGame(gameId);
      } catch (err) {
        console.error(
          "[activeGames] Erreur delete Redis, jeu retiré du cache local:",
          err,
        );
      }
    }
  }

  async getAll(): Promise<Map<string, ActiveGame>> {
    if (this.useRedis) {
      const redisGames = await restoreAllGames();
      // Fusionner avec le cache local (priorité au cache local)
      return new Map([...redisGames, ...this.localCache]);
    }
    return new Map(this.localCache);
  }

  size(): number {
    return this.localCache.size;
  }

  sync(gameId: string): void {
    const game = this.localCache.get(gameId);
    if (!game) return;
    this.pushPokerSnapshot(gameId, game);
  }

  // Pour la compatibilité avec l'ancien code
  getSync(gameId: string): ActiveGame | undefined {
    return this.localCache.get(gameId);
  }

  /** Fermeture propre pour tests (timer + évite handles Jest). */
  disposeBackgroundTimersForTests(): void {
    if (this.reconnectTimer !== null) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  setSync(gameId: string, game: ActiveGame): void {
    this.localCache.set(gameId, game);
    this.pushPokerSnapshot(gameId, game);
    if (this.useRedis && game instanceof GameTable) {
      saveGame(gameId, game).catch((err) =>
        console.error("Erreur sauvegarde Redis:", err),
      );
    }
  }
}

export const activeGames = new ActiveGamesManager();

export function disposeActiveGamesForTests(): void {
  activeGames.disposeBackgroundTimersForTests();
}
