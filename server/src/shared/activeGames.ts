import { GameTable } from "../logic/GameTable.js";
import type { CashGameController } from "../logic/CashGameController.js";
import {
  saveGame,
  getGame,
  deleteGame,
  restoreAllGames,
  isRedisHealthy,
} from "../config/redis.config.js";
import { env } from "../config/env.js";
import { pokerStateStore } from "./pokerStateStore.js";
import { isPracticeBotGameId } from "./practiceBotGames.js";
import {
  scheduleDebouncedPokerSnapshot,
  flushDebouncedPokerSnapshotNow,
  cancelDebouncedPokerSnapshot,
} from "./pokerSnapshotDebouncer.js";

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

  private resolveGame(gameId: string): ActiveGame | undefined {
    return this.localCache.get(gameId);
  }

  private async initialize() {
    if (this.useRedis) {
      try {
        const restored = await restoreAllGames();
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
        // Redis toujours down
      }
    }, REDIS_RECONNECT_INTERVAL_MS);
    this.reconnectTimer?.unref?.();
  }

  private pushPokerSnapshot(gameId: string): void {
    scheduleDebouncedPokerSnapshot(gameId, () => this.resolveGame(gameId));
  }

  private maybeSaveLegacyGame(gameId: string, game: ActiveGame): void {
    if (
      !env.persistLegacyGameKeys ||
      !this.useRedis ||
      !(game instanceof GameTable) ||
      isPracticeBotGameId(gameId)
    ) {
      return;
    }
    saveGame(gameId, game).catch((err) => {
      console.error("[activeGames] Erreur save legacy game:* Redis:", err);
    });
  }

  async get(gameId: string): Promise<ActiveGame | undefined> {
    if (this.localCache.has(gameId)) {
      return this.localCache.get(gameId);
    }
    if (this.useRedis && env.persistLegacyGameKeys) {
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
    this.pushPokerSnapshot(gameId);
    this.maybeSaveLegacyGame(gameId, game);
  }

  async delete(gameId: string): Promise<void> {
    cancelDebouncedPokerSnapshot(gameId);
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
    if (this.useRedis && env.persistLegacyGameKeys) {
      try {
        await deleteGame(gameId);
      } catch (err) {
        console.error("[activeGames] Erreur delete legacy game:* Redis:", err);
      }
    }
  }

  async getAll(): Promise<Map<string, ActiveGame>> {
    if (this.useRedis && env.persistLegacyGameKeys) {
      const redisGames = await restoreAllGames();
      return new Map([...redisGames, ...this.localCache]);
    }
    return new Map(this.localCache);
  }

  size(): number {
    return this.localCache.size;
  }

  sync(gameId: string): void {
    if (!this.localCache.has(gameId)) return;
    flushDebouncedPokerSnapshotNow(gameId, () => this.resolveGame(gameId));
  }

  getSync(gameId: string): ActiveGame | undefined {
    return this.localCache.get(gameId);
  }

  disposeBackgroundTimersForTests(): void {
    if (this.reconnectTimer !== null) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  setSync(gameId: string, game: ActiveGame): void {
    this.localCache.set(gameId, game);
    this.pushPokerSnapshot(gameId);
    this.maybeSaveLegacyGame(gameId, game);
  }
}

export const activeGames = new ActiveGamesManager();

export function disposeActiveGamesForTests(): void {
  activeGames.disposeBackgroundTimersForTests();
}
