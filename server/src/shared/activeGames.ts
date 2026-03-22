import { GameTable } from '../logic/GameTable.js';
import type { CashGameController } from '../logic/CashGameController.js';
import { saveGame, getGame, deleteGame, restoreAllGames, isRedisHealthy } from '../config/redis.config.js';

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
        this.localCache = restored;
      } catch (err) {
        console.error('[activeGames] Redis down, fallback mémoire uniquement:', err);
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
          console.log('[activeGames] Redis de retour, re-sync en cours...');
          const restored = await restoreAllGames();
          this.localCache = new Map([...restored, ...this.localCache]);
          this.useRedis = true;
        }
      } catch {
        // Redis toujours down, on reste en fallback
      }
    }, REDIS_RECONNECT_INTERVAL_MS);
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
        console.warn('[activeGames] Redis get failed, fallback local:', err);
      }
    }
    return undefined;
  }

  async set(gameId: string, game: ActiveGame): Promise<void> {
    this.localCache.set(gameId, game);
    if (this.useRedis && game instanceof GameTable) {
      saveGame(gameId, game).catch((err) => {
        console.error('[activeGames] Erreur save Redis, jeu conservé en mémoire:', err);
      });
    }
  }

  async delete(gameId: string): Promise<void> {
    this.localCache.delete(gameId);
    if (this.useRedis) {
      try {
        await deleteGame(gameId);
      } catch (err) {
        console.error('[activeGames] Erreur delete Redis, jeu retiré du cache local:', err);
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

  // Pour la compatibilité avec l'ancien code
  getSync(gameId: string): ActiveGame | undefined {
    return this.localCache.get(gameId);
  }

  setSync(gameId: string, game: ActiveGame): void {
    this.localCache.set(gameId, game);
    if (this.useRedis && game instanceof GameTable) {
      saveGame(gameId, game).catch(err => 
        console.error('Erreur sauvegarde Redis:', err)
      );
    }
  }
}

export const activeGames = new ActiveGamesManager();
