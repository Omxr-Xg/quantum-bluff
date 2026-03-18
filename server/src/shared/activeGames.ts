import { GameTable } from '../logic/GameTable.js';
import type { CashGameController } from '../logic/CashGameController.js';
import { saveGame, getGame, deleteGame, restoreAllGames } from '../config/redis.config.js';

export type ActiveGame = GameTable | CashGameController;

class ActiveGamesManager {
  private localCache: Map<string, ActiveGame> = new Map();
  private useRedis: boolean = true;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (this.useRedis) {
      try {
        const restored = await restoreAllGames();
        this.localCache = restored;
      } catch (err) {
        console.error('Erreur restauration Redis, utilisation du cache local uniquement:', err);
        this.useRedis = false;
      }
    }
  }

  async get(gameId: string): Promise<ActiveGame | undefined> {
    // D'abord vérifier le cache local
    if (this.localCache.has(gameId)) {
      return this.localCache.get(gameId);
    }

    // Sinon chercher dans Redis
    if (this.useRedis) {
      const game = await getGame(gameId);
      if (game) {
        this.localCache.set(gameId, game);
        return game;
      }
    }

    return undefined;
  }

  async set(gameId: string, game: ActiveGame): Promise<void> {
    this.localCache.set(gameId, game);
    if (this.useRedis && game instanceof GameTable) {
      await saveGame(gameId, game);
    }
  }

  async delete(gameId: string): Promise<void> {
    this.localCache.delete(gameId);
    if (this.useRedis) {
      await deleteGame(gameId);
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
